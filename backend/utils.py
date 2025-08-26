from typing import Dict, Any, List, Optional, Set

def flatten_user_data(user: Dict[str, Any]) -> Dict[str, Any]:
    """Flatten nested user data for easier column selection"""
    flattened = {
        "id": user.get("id"),
        "name": user.get("name"),
        "username": user.get("username"),
        "email": user.get("email"),
        "phone": user.get("phone"),
        "website": user.get("website"),
    }
    
    # Flatten address
    if "address" in user and user["address"]:
        address = user["address"]
        flattened.update({
            "street": address.get("street"),
            "suite": address.get("suite"),
            "city": address.get("city"),
            "zipcode": address.get("zipcode"),
        })
        
        # Flatten geo coordinates
        if "geo" in address and address["geo"]:
            geo = address["geo"]
            flattened.update({
                "lat": geo.get("lat"),
                "lng": geo.get("lng"),
            })
    
    # Flatten company
    if "company" in user and user["company"]:
        company = user["company"]
        flattened.update({
            "company_name": company.get("name"),
            "company_catchphrase": company.get("catchPhrase"),
            "company_bs": company.get("bs"),
        })
    
    return flattened

def select_columns(data: List[Dict[str, Any]], columns: Optional[List[str]], format_type: str = "nested") -> List[Dict[str, Any]]:
    """Select specific columns from user data"""
    if not columns:
        # Return all data if no columns specified
        return data if format_type == "nested" else [flatten_user_data(user) for user in data]
    
    selected_data = []
    
    for user in data:
        if format_type == "flat":
            # Use flattened data
            flattened = flatten_user_data(user)
            selected_user = {}
            
            for col in columns:
                # Map nested column names to flat names
                flat_col = col
                if col == "address.street":
                    flat_col = "street"
                elif col == "address.suite":
                    flat_col = "suite"
                elif col == "address.city":
                    flat_col = "city"
                elif col == "address.zipcode":
                    flat_col = "zipcode"
                elif col == "address.geo.lat":
                    flat_col = "lat"
                elif col == "address.geo.lng":
                    flat_col = "lng"
                elif col == "company.name":
                    flat_col = "company_name"
                elif col == "company.catchPhrase":
                    flat_col = "company_catchphrase"
                elif col == "company.bs":
                    flat_col = "company_bs"
                
                if flat_col in flattened and flattened[flat_col] is not None:
                    selected_user[flat_col] = flattened[flat_col]
            
            selected_data.append(selected_user)
        else:
            # Use nested data structure
            selected_user = {}
            
            for col in columns:
                if col in ["id", "name", "username", "email", "phone", "website"]:
                    if user.get(col) is not None:
                        selected_user[col] = user.get(col)
                
                elif col.startswith("address."):
                    if user.get("address"):
                        if "address" not in selected_user:
                            selected_user["address"] = {}
                        
                        if col == "address.street" and user["address"].get("street"):
                            selected_user["address"]["street"] = user["address"]["street"]
                        elif col == "address.suite" and user["address"].get("suite"):
                            selected_user["address"]["suite"] = user["address"]["suite"]
                        elif col == "address.city" and user["address"].get("city"):
                            selected_user["address"]["city"] = user["address"]["city"]
                        elif col == "address.zipcode" and user["address"].get("zipcode"):
                            selected_user["address"]["zipcode"] = user["address"]["zipcode"]
                        elif col == "address.geo.lat":
                            geo = user["address"].get("geo", {})
                            if geo.get("lat"):
                                if "geo" not in selected_user["address"]:
                                    selected_user["address"]["geo"] = {}
                                selected_user["address"]["geo"]["lat"] = geo["lat"]
                        elif col == "address.geo.lng":
                            geo = user["address"].get("geo", {})
                            if geo.get("lng"):
                                if "geo" not in selected_user["address"]:
                                    selected_user["address"]["geo"] = {}
                                selected_user["address"]["geo"]["lng"] = geo["lng"]
                
                elif col.startswith("company."):
                    if user.get("company"):
                        # Only add the company object if we don't already have it
                        if "company" not in selected_user:
                            selected_user["company"] = {}
                        
                        # Only add the specific field that was requested
                        if col == "company.name" and user["company"].get("name"):
                            selected_user["company"]["name"] = user["company"]["name"]
                        elif col == "company.catchPhrase" and user["company"].get("catchPhrase"):
                            selected_user["company"]["catchPhrase"] = user["company"]["catchPhrase"]
                        elif col == "company.bs" and user["company"].get("bs"):
                            selected_user["company"]["bs"] = user["company"]["bs"]
            
            # Clean up empty nested objects
            if "address" in selected_user and not selected_user["address"]:
                del selected_user["address"]
            if "company" in selected_user and not selected_user["company"]:
                del selected_user["company"]
            
            selected_data.append(selected_user)
    
    return selected_data

def get_available_columns() -> Dict[str, str]:
    """Get list of all available columns with descriptions"""
    return {
        "id": "User ID",
        "name": "Full Name",
        "username": "Username",
        "email": "Email Address",
        "phone": "Phone Number",
        "website": "Website",
        "address.street": "Street Address",
        "address.suite": "Suite/Apartment",
        "address.city": "City",
        "address.zipcode": "ZIP Code",
        "address.geo.lat": "Latitude",
        "address.geo.lng": "Longitude",
        "company.name": "Company Name",
        "company.catchPhrase": "Company Slogan",
        "company.bs": "Business Strategy"
    }

def validate_columns(columns: List[str]) -> List[str]:
    """Validate that requested columns exist"""
    available = set(get_available_columns().keys())
    valid_columns = []
    
    for col in columns:
        if col in available:
            valid_columns.append(col)
        else:
            # Try to find partial matches for user-friendly error handling
            print(f"Warning: Column '{col}' not found in available columns")
    
    return valid_columns

def get_column_categories() -> Dict[str, List[str]]:
    """Get columns organized by categories"""
    return {
        "basic": ["id", "name", "username", "email", "phone", "website"],
        "address": [
            "address.street", "address.suite", "address.city", 
            "address.zipcode", "address.geo.lat", "address.geo.lng"
        ],
        "company": ["company.name", "company.catchPhrase", "company.bs"]
    }

def search_in_data(data: List[Dict[str, Any]], search_term: str) -> List[Dict[str, Any]]:
    """Search for a term across all user data fields"""
    if not search_term:
        return data
    
    search_lower = search_term.lower()
    results = []
    
    for user in data:
        # Search in direct fields
        searchable_values = [
            str(user.get('id', '')),
            str(user.get('name', '')),
            str(user.get('username', '')),
            str(user.get('email', '')),
            str(user.get('phone', '')),
            str(user.get('website', ''))
        ]
        
        # Search in address fields
        if user.get('address'):
            address = user['address']
            searchable_values.extend([
                str(address.get('street', '')),
                str(address.get('suite', '')),
                str(address.get('city', '')),
                str(address.get('zipcode', ''))
            ])
            
            if address.get('geo'):
                geo = address['geo']
                searchable_values.extend([
                    str(geo.get('lat', '')),
                    str(geo.get('lng', ''))
                ])
        
        # Search in company fields
        if user.get('company'):
            company = user['company']
            searchable_values.extend([
                str(company.get('name', '')),
                str(company.get('catchPhrase', '')),
                str(company.get('bs', ''))
            ])
        
        # Check if search term is found in any field
        if any(search_lower in value.lower() for value in searchable_values):
            results.append(user)
    
    return results