from fastapi import APIRouter
from typing import Dict, Any

from ..utils import get_available_columns

router = APIRouter(prefix="/api/columns", tags=["columns"])

@router.get("/")
async def get_available_columns_endpoint() -> Dict[str, Any]:
    """
    Get list of all available columns for frontend selection
    
    Returns a dictionary with column names as keys and descriptions as values,
    plus metadata about the columns.
    
    **Response Example:**
    ```json
    {
        "columns": {
            "id": "User ID",
            "name": "Full Name",
            "email": "Email Address",
            "address.city": "City",
            "company.name": "Company Name"
        },
        "total": 15,
        "categories": {
            "basic": ["id", "name", "username", "email", "phone", "website"],
            "address": ["address.street", "address.suite", "address.city", "address.zipcode", "address.geo.lat", "address.geo.lng"],
            "company": ["company.name", "company.catchPhrase", "company.bs"]
        }
    }
    ```
    """
    columns = get_available_columns()
    
    # Categorize columns for better frontend UX
    categories = {
        "basic": [
            "id", "name", "username", "email", "phone", "website"
        ],
        "address": [
            "address.street", "address.suite", "address.city", 
            "address.zipcode", "address.geo.lat", "address.geo.lng"
        ],
        "company": [
            "company.name", "company.catchPhrase", "company.bs"
        ]
    }
    
    return {
        "columns": columns,
        "total": len(columns),
        "categories": categories,
        "description": "Available columns for data selection"
    }

@router.get("/basic")
async def get_basic_columns() -> Dict[str, Any]:
    """Get only basic user columns (id, name, email, etc.)"""
    basic_columns = {
        "id": "User ID",
        "name": "Full Name", 
        "username": "Username",
        "email": "Email Address",
        "phone": "Phone Number",
        "website": "Website"
    }
    
    return {
        "columns": basic_columns,
        "total": len(basic_columns),
        "category": "basic"
    }

@router.get("/address")
async def get_address_columns() -> Dict[str, Any]:
    """Get only address-related columns"""
    address_columns = {
        "address.street": "Street Address",
        "address.suite": "Suite/Apartment",
        "address.city": "City",
        "address.zipcode": "ZIP Code",
        "address.geo.lat": "Latitude",
        "address.geo.lng": "Longitude"
    }
    
    return {
        "columns": address_columns,
        "total": len(address_columns),
        "category": "address"
    }

@router.get("/company")
async def get_company_columns() -> Dict[str, Any]:
    """Get only company-related columns"""
    company_columns = {
        "company.name": "Company Name",
        "company.catchPhrase": "Company Slogan",
        "company.bs": "Business Strategy"
    }
    
    return {
        "columns": company_columns,
        "total": len(company_columns),
        "category": "company"
    }
