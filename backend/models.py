from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List, Dict, Any, Set
from datetime import datetime
from enum import Enum

# Base models for nested objects
class GeoLocation(BaseModel):
    """Geographic coordinates model"""
    lat: str = Field(..., description="Latitude")
    lng: str = Field(..., description="Longitude")
    
    class Config:
        json_schema_extra = {
            "example": {
                "lat": "40.7128",
                "lng": "-74.0060"
            }
        }

class Address(BaseModel):
    """User address model"""
    street: str = Field(..., description="Street address")
    suite: str = Field(..., description="Suite/apartment number")
    city: str = Field(..., description="City name")
    zipcode: str = Field(..., description="ZIP/postal code")
    geo: GeoLocation = Field(..., description="Geographic coordinates")
    
    class Config:
        json_schema_extra = {
            "example": {
                "street": "Main Street",
                "suite": "Apt. 101",
                "city": "New York",
                "zipcode": "10001",
                "geo": {
                    "lat": "40.7128",
                    "lng": "-74.0060"
                }
            }
        }

class Company(BaseModel):
    """Company information model"""
    name: str = Field(..., description="Company name")
    catchPhrase: str = Field(..., description="Company slogan")
    bs: str = Field(..., description="Business strategy")
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "Tech Solutions Inc",
                "catchPhrase": "Innovative technology solutions",
                "bs": "revolutionize digital experiences"
            }
        }

# Main User model
class User(BaseModel):
    """Complete user model"""
    id: int = Field(..., description="Unique user identifier", gt=0)
    name: str = Field(..., description="Full name", min_length=1, max_length=100)
    username: str = Field(..., description="Username", min_length=1, max_length=50)
    email: str = Field(..., description="Email address")
    address: Address = Field(..., description="User address")
    phone: str = Field(..., description="Phone number")
    website: str = Field(..., description="Personal website")
    company: Company = Field(..., description="Company information")
    
    @validator('email')
    def validate_email(cls, v):
        """Validate email format"""
        if '@' not in v:
            raise ValueError('Invalid email format')
        return v
    
    @validator('website')
    def validate_website(cls, v):
        """Validate website format"""
        if v and not v.startswith(('http://', 'https://', 'www.')) and '.' not in v:
            raise ValueError('Invalid website format')
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": 1,
                "name": "John Smith",
                "username": "johnsmith",
                "email": "john.smith@email.com",
                "address": {
                    "street": "Main Street",
                    "suite": "Apt. 101",
                    "city": "New York",
                    "zipcode": "10001",
                    "geo": {
                        "lat": "40.7128",
                        "lng": "-74.0060"
                    }
                },
                "phone": "1-555-123-4567 x1001",
                "website": "johnsmith.dev",
                "company": {
                    "name": "Tech Solutions Inc",
                    "catchPhrase": "Innovative technology solutions",
                    "bs": "revolutionize digital experiences"
                }
            }
        }

# Response models
class UserListResponse(BaseModel):
    """Response model for user list with pagination"""
    data: List[User] = Field(..., description="List of users")
    total: int = Field(..., description="Total number of users")
    pagination: Optional[Dict[str, Any]] = Field(None, description="Pagination information")
    
    class Config:
        json_schema_extra = {
            "example": {
                "data": [],  # Would contain User objects
                "total": 50,
                "pagination": {
                    "page": 1,
                    "limit": 10,
                    "pages": 5,
                    "has_next": True,
                    "has_prev": False
                }
            }
        }

class SearchResponse(BaseModel):
    """Response model for search results"""
    data: List[User] = Field(..., description="Search results")
    total: int = Field(..., description="Number of results found")
    query: str = Field(..., description="Search query used")
    
    class Config:
        json_schema_extra = {
            "example": {
                "data": [],  # Would contain User objects
                "total": 5,
                "query": "john"
            }
        }

class StatsResponse(BaseModel):
    """Response model for data statistics"""
    total_users: int = Field(..., description="Total number of users")
    unique_cities: int = Field(..., description="Number of unique cities")
    unique_companies: int = Field(..., description="Number of unique companies")
    unique_email_domains: int = Field(..., description="Number of unique email domains")
    cities: List[str] = Field(..., description="List of cities")
    companies: List[str] = Field(..., description="List of companies")
    email_domains: List[str] = Field(..., description="List of email domains")

# Request models (for future POST/PUT endpoints)
class UserCreate(BaseModel):
    """Model for creating a new user"""
    name: str = Field(..., min_length=1, max_length=100)
    username: str = Field(..., min_length=1, max_length=50)
    email: str = Field(...)
    address: Address
    phone: str
    website: str
    company: Company
    
    @validator('email')
    def validate_email(cls, v):
        if '@' not in v:
            raise ValueError('Invalid email format')
        return v

class UserUpdate(BaseModel):
    """Model for updating user information"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    username: Optional[str] = Field(None, min_length=1, max_length=50)
    email: Optional[str] = None
    address: Optional[Address] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    company: Optional[Company] = None
    
    @validator('email')
    def validate_email(cls, v):
        if v and '@' not in v:
            raise ValueError('Invalid email format')
        return v

# Query parameter models
class UserQueryParams(BaseModel):
    """Model for user query parameters"""
    page: Optional[int] = Field(None, ge=1, description="Page number")
    limit: Optional[int] = Field(None, ge=1, le=100, description="Items per page")
    search: Optional[str] = Field(None, description="Search term")
    sort_by: Optional[str] = Field(None, description="Field to sort by")
    sort_order: Optional[str] = Field("asc", pattern="^(asc|desc)$", description="Sort order")

# Error response models
class ErrorResponse(BaseModel):
    """Standard error response model"""
    detail: str = Field(..., description="Error message")
    error_code: Optional[str] = Field(None, description="Error code")
    timestamp: datetime = Field(default_factory=datetime.now, description="Error timestamp")

class ValidationErrorResponse(BaseModel):
    """Validation error response model"""
    detail: List[Dict[str, Any]] = Field(..., description="Validation error details")
    error_type: str = Field(default="validation_error", description="Error type")

class ColumnSelection(str, Enum):
    """Available columns that can be selected"""
    ID = "id"
    NAME = "name"
    USERNAME = "username"
    EMAIL = "email"
    PHONE = "phone"
    WEBSITE = "website"
    STREET = "address.street"
    SUITE = "address.suite"
    CITY = "address.city"
    ZIPCODE = "address.zipcode"
    LAT = "address.geo.lat"
    LNG = "address.geo.lng"
    COMPANY_NAME = "company.name"
    COMPANY_CATCHPHRASE = "company.catchPhrase"
    COMPANY_BS = "company.bs"

class FlexibleUser(BaseModel):
    """Flexible user model that can include/exclude fields dynamically"""
    id: Optional[int] = None
    name: Optional[str] = None
    username: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    
    # Flattened address fields (optional)
    street: Optional[str] = None
    suite: Optional[str] = None
    city: Optional[str] = None
    zipcode: Optional[str] = None
    lat: Optional[str] = None
    lng: Optional[str] = None
    
    # Flattened company fields (optional)
    company_name: Optional[str] = None
    company_catchphrase: Optional[str] = None
    company_bs: Optional[str] = None
    
    # Keep nested objects as fallback
    address: Optional[Address] = None
    company: Optional[Company] = None

    class Config:
        # Allow extra fields and exclude None values when serializing
        extra = "forbid"
        exclude_none = True

class DataRequest(BaseModel):
    """Request model for data retrieval with column selection"""
    columns: Optional[List[ColumnSelection]] = Field(
        default=None, 
        description="Specific columns to return. If not provided, returns all columns"
    )
    page: Optional[int] = Field(None, ge=1, description="Page number")
    limit: Optional[int] = Field(None, ge=1, le=100, description="Items per page")
    search: Optional[str] = Field(None, description="Search term")
    sort_by: Optional[str] = Field(None, description="Field to sort by")
    sort_order: Optional[str] = Field("asc", pattern="^(asc|desc)$", description="Sort order")
    format: Optional[str] = Field("nested", pattern="^(nested|flat)$", description="Response format: nested or flat")

class FlexibleDataResponse(BaseModel):
    """Response model for flexible data with column selection"""
    data: List[Dict[str, Any]] = Field(..., description="User data with selected columns")
    columns: List[str] = Field(..., description="Columns included in response")
    total: int = Field(..., description="Total number of records")
    pagination: Optional[Dict[str, Any]] = Field(None, description="Pagination info")
    format: str = Field(..., description="Data format used")
