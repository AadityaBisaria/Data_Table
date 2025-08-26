from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Optional, Dict, Any
import json
from pathlib import Path
from datetime import datetime

from ..models import (
    User, FlexibleDataResponse, ColumnSelection, DataRequest
)
from ..utils import select_columns, get_available_columns, flatten_user_data

router = APIRouter(prefix="/api/data", tags=["data"])

# Load data from JSON file
def load_data() -> List[Dict[str, Any]]:
    """Load data from the JSON file"""
    try:
        # Get the path to the data.json file
        current_dir = Path(__file__).parent.parent.parent
        data_file = current_dir / "dummy_db" / "data.json"
        
        with open(data_file, 'r', encoding='utf-8') as file:
            data = json.load(file)
        return data
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="Data file not found")
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Invalid JSON data")

# In-memory cache (loads once at startup)
users_data = load_data()

@router.get("/", response_model=FlexibleDataResponse)
async def get_flexible_data(
    columns: Optional[str] = Query(None, description="Comma-separated list of columns (e.g., 'id,name,email' or 'id,name,address.city')"),
    page: Optional[int] = Query(None, ge=1, description="Page number (1-based)"),
    limit: Optional[int] = Query(None, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search term to filter across all fields"),
    filters: Optional[str] = Query(None, description="Comma-separated column filters in the form key:value (e.g., 'id:5,company.name:tech')"),
    sort_by: Optional[str] = Query(None, description="Field to sort by (e.g., 'name', 'city', 'company.name')"),
    sort_order: Optional[str] = Query("asc", pattern="^(asc|desc)$", description="Sort order: 'asc' or 'desc'"),
    format: Optional[str] = Query("nested", pattern="^(nested|flat)$", description="Response format: 'nested' (preserves structure) or 'flat' (flattened)")
) -> FlexibleDataResponse:
    """
    Get user data with flexible column selection and filtering
    
    **Examples:**
    - All data: `/api/data/`
    - Basic info: `/api/data/?columns=id,name,email`
    - Address only: `/api/data/?columns=id,name,address.street,address.city`
    - Company info: `/api/data/?columns=id,name,company.name,company.catchPhrase`
    - Flat format: `/api/data/?columns=id,name,city,company_name&format=flat`
    - Search: `/api/data/?search=john&columns=id,name,email`
    - Paginated: `/api/data/?columns=id,name,email&page=1&limit=10`
    """
    
    filtered_data = users_data.copy()
    
    # Apply search filter (include id)
    if search:
        search_lower = search.lower()
        filtered_data = [
            user for user in filtered_data
            if any(
                search_lower in str(value).lower()
                for value in [
                    str(user.get('id', '')),
                    user.get('name', ''),
                    user.get('username', ''),
                    user.get('email', ''),
                    user.get('phone', ''),
                    user.get('website', ''),
                    user.get('address', {}).get('city', ''),
                    user.get('address', {}).get('street', ''),
                    user.get('company', {}).get('name', ''),
                    user.get('company', {}).get('catchPhrase', '')
                ]
            )
        ]

    # Apply column-specific filters (supports operators and ranges)
    if filters:
        def get_nested_value(obj: Dict[str, Any], path: str):
            try:
                current = obj
                for part in path.split('.'):
                    if isinstance(current, dict) and part in current:
                        current = current[part]
                    else:
                        return None
                return current
            except Exception:
                return None

        def parse_iso_date(s: str) -> Optional[datetime]:
            try:
                # Support 'Z' suffix (UTC)
                if s.endswith('Z'):
                    s = s[:-1] + '+00:00'
                return datetime.fromisoformat(s)
            except Exception:
                return None

        def coerce(s: str):
            # Try int/float
            try:
                if '.' in s:
                    return float(s)
                return int(s)
            except Exception:
                pass
            # Try ISO datetime
            dt = parse_iso_date(s)
            if dt is not None:
                return dt
            # Fallback to string (case-insensitive compare later)
            return s

        def compare(a, b, op: str) -> bool:
            # Normalize types: if both numeric/date -> compare; else compare as strings
            if isinstance(a, (int, float, datetime)) and isinstance(b, (int, float, datetime)):
                if op == '>':  return a > b
                if op == '>=': return a >= b
                if op == '<':  return a < b
                if op == '<=': return a <= b
                if op in ('==', '='): return a == b
                if op == '!=': return a != b
                return False
            # String comparisons
            a_s, b_s = str(a).lower(), str(b).lower()
            if op in ('==', '='):   return a_s == b_s
            if op == '!=':          return a_s != b_s
            # For non-equality with strings, default to substring semantics
            # Treat '>' '<' etc. as substring check not applicable; return False
            return False

        # Parse filters string into list of constraints
        # Syntax supported:
        #   key:value         -> substring (strings) or equality (numbers/dates)
        #   key:==value       -> equality
        #   key:!=value       -> inequality
        #   key:>value, >=, <, <=
        #   key:a..b          -> inclusive range (numbers/dates)
        filter_pairs = [pair.strip() for pair in filters.split(',') if pair.strip()]

        constraints: List[Dict[str, Any]] = []
        for pair in filter_pairs:
            if ':' not in pair:
                continue
            key, raw = pair.split(':', 1)
            key = key.strip()
            raw = raw.strip()

            # Range "a..b"
            if '..' in raw:
                left, right = raw.split('..', 1)
                left, right = left.strip(), right.strip()
                left_v, right_v = coerce(left), coerce(right)
                constraints.append({'key': key, 'type': 'range', 'low': left_v, 'high': right_v})
                continue

            # Operators
            for op in ('>=', '<=', '!=', '>', '<', '==', '='):
                if raw.startswith(op):
                    value = raw[len(op):].strip()
                    constraints.append({'key': key, 'type': 'op', 'op': op, 'value': coerce(value)})
                    break
            else:
                # Default: substring/equality
                constraints.append({'key': key, 'type': 'default', 'value': coerce(raw)})

        if constraints:
            new_filtered = []
            for user in filtered_data:
                flat = flatten_user_data(user)

                ok = True
                for c in constraints:
                    # Resolve value via nested key (a.b) or flat key
                    if '.' in c['key']:
                        target = get_nested_value(user, c['key'])
                    else:
                        target = flat.get(c['key'])

                    # Special-case id as numeric if possible for convenience
                    if c['key'] == 'id' and target is not None:
                        try:
                            target = int(target)
                        except Exception:
                            pass

                    if c['type'] == 'range':
                        low, high = c['low'], c['high']
                        # If target is string, try to coerce similarly
                        t = target if not isinstance(target, str) else coerce(target)
                        # Only compare if types are comparable
                        if isinstance(t, (int, float, datetime)) and isinstance(low, type(t)) and isinstance(high, type(t)):
                            if not (low <= t <= high):
                                ok = False
                                break
                        else:
                            ok = False
                            break

                    elif c['type'] == 'op':
                        t = target if not isinstance(target, str) else coerce(target)
                        # If coercion yields different types, comparison may fail; compare strings if needed
                        if isinstance(t, (int, float, datetime)) and isinstance(c['value'], (int, float, datetime)):
                            if not compare(t, c['value'], c['op']):
                                ok = False
                                break
                        else:
                            if not compare(str(target or ''), str(c['value']), c['op']):
                                ok = False
                                break

                    else:  # default
                        v = c['value']
                        if isinstance(v, (int, float, datetime)):
                            # equality for non-strings
                            t = target if not isinstance(target, str) else coerce(target)
                            if t != v:
                                ok = False
                                break
                        else:
                            # substring match for strings
                            if target is None or str(v).lower() not in str(target).lower():
                                ok = False
                                break

                if ok:
                    new_filtered.append(user)

            filtered_data = new_filtered
    
    # Apply sorting
    if sort_by:
        try:
            reverse = sort_order == "desc"
            
            # Direct field sorting
            if sort_by in ['id', 'name', 'username', 'email', 'phone', 'website']:
                if sort_by == 'id':
                    filtered_data.sort(key=lambda x: x.get('id', 0), reverse=reverse)
                else:
                    filtered_data.sort(key=lambda x: str(x.get(sort_by, '')).lower(), reverse=reverse)
            
            # Nested field sorting
            elif sort_by == 'city' or sort_by == 'address.city':
                filtered_data.sort(key=lambda x: str(x.get('address', {}).get('city', '')).lower(), reverse=reverse)
            elif sort_by == 'street' or sort_by == 'address.street':
                filtered_data.sort(key=lambda x: str(x.get('address', {}).get('street', '')).lower(), reverse=reverse)
            elif sort_by == 'company' or sort_by == 'company.name':
                filtered_data.sort(key=lambda x: str(x.get('company', {}).get('name', '')).lower(), reverse=reverse)
            elif sort_by == 'company.catchPhrase':
                filtered_data.sort(key=lambda x: str(x.get('company', {}).get('catchPhrase', '')).lower(), reverse=reverse)
                
        except Exception as e:
            # If sorting fails, continue without sorting
            print(f"Sorting error: {e}")
    
    total_count = len(filtered_data)
    
    # Parse columns
    selected_columns = None
    if columns:
        selected_columns = [col.strip() for col in columns.split(',')]
    
    # Apply column selection
    selected_data = select_columns(filtered_data, selected_columns, format)
    
    # Apply pagination
    pagination_info = None
    if page is not None and limit is not None:
        start_index = (page - 1) * limit
        end_index = start_index + limit
        paginated_data = selected_data[start_index:end_index]
        
        pagination_info = {
            "page": page,
            "limit": limit,
            "total": total_count,
            "pages": (total_count + limit - 1) // limit,
            "has_next": end_index < total_count,
            "has_prev": page > 1
        }
        
        selected_data = paginated_data
    
    # Determine which columns are included
    if selected_columns:
        included_columns = selected_columns
    else:
        # All columns included
        if format == "flat":
            included_columns = list(get_available_columns().keys())
        else:
            included_columns = ["id", "name", "username", "email", "address", "phone", "website", "company"]
    
    return FlexibleDataResponse(
        data=selected_data,
        columns=included_columns,
        total=total_count,
        pagination=pagination_info,
        format=format
    )

@router.post("/", response_model=FlexibleDataResponse)
async def get_flexible_data_post(request: DataRequest) -> FlexibleDataResponse:
    """
    POST version for complex column selection (useful when URL gets too long)
    
    **Request Body Example:**
    ```json
    {
        "columns": ["id", "name", "email", "address.city"],
        "page": 1,
        "limit": 10,
        "search": "john",
        "sort_by": "name",
        "sort_order": "asc",
        "format": "nested"
    }
    ```
    """
    
    # Convert enum to strings if provided
    columns_str = None
    if request.columns:
        columns_str = ",".join([col.value for col in request.columns])
    
    # Use the same logic as GET endpoint
    return await get_flexible_data(
        columns=columns_str,
        page=request.page,
        limit=request.limit,
        search=request.search,
        sort_by=request.sort_by,
        sort_order=request.sort_order,
        format=request.format
    )

@router.get("/{user_id}", response_model=User)
async def get_user_by_id(user_id: int) -> User:
    """Get a specific user by ID"""
    user = next((user for user in users_data if user["id"] == user_id), None)
    if not user:
        raise HTTPException(status_code=404, detail=f"User with ID {user_id} not found")
    
    # Validate the user data against the User model
    try:
        return User(**user)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Invalid user data: {str(e)}")

@router.get("/search/")
async def search_users(
    q: str = Query(..., description="Search query"),
    columns: Optional[str] = Query(None, description="Comma-separated list of columns to return"),
    format: Optional[str] = Query("nested", pattern="^(nested|flat)$", description="Response format")
) -> FlexibleDataResponse:
    """
    Search users by name, email, username, etc. with column selection
    
    **Examples:**
    - Basic search: `/api/data/search/?q=john`
    - Search with columns: `/api/data/search/?q=tech&columns=id,name,company.name`
    """
    
    if not q:
        return FlexibleDataResponse(
            data=[],
            columns=[],
            total=0,
            pagination=None,
            format=format
        )
    
    # Use the main get_flexible_data function with search parameter
    return await get_flexible_data(
        columns=columns,
        search=q,
        format=format
    )
