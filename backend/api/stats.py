from fastapi import APIRouter
from typing import Dict, Any, List
import json
from pathlib import Path
from collections import Counter

from ..models import StatsResponse

router = APIRouter(prefix="/api/stats", tags=["statistics"])

# Load data function (same as in data.py)
def load_data() -> List[Dict[str, Any]]:
    """Load data from the JSON file"""
    try:
        current_dir = Path(__file__).parent.parent.parent
        data_file = current_dir / "dummy_db" / "data.json"
        
        with open(data_file, 'r', encoding='utf-8') as file:
            data = json.load(file)
        return data
    except (FileNotFoundError, json.JSONDecodeError):
        return []

users_data = load_data()

@router.get("/", response_model=StatsResponse)
async def get_stats() -> StatsResponse:
    """
    Get comprehensive statistics about the user data
    
    **Returns:**
    - Total number of users
    - Unique cities, companies, email domains
    - Lists of all unique values
    """
    
    cities = set()
    companies = set()
    domains = set()
    
    for user in users_data:
        # Collect cities
        if user.get('address', {}).get('city'):
            cities.add(user['address']['city'])
        
        # Collect companies
        if user.get('company', {}).get('name'):
            companies.add(user['company']['name'])
        
        # Collect email domains
        if user.get('email'):
            domain = user['email'].split('@')[-1]
            domains.add(domain)
    
    return StatsResponse(
        total_users=len(users_data),
        unique_cities=len(cities),
        unique_companies=len(companies),
        unique_email_domains=len(domains),
        cities=sorted(list(cities)),
        companies=sorted(list(companies)),
        email_domains=sorted(list(domains))
    )

@router.get("/summary")
async def get_data_summary() -> Dict[str, Any]:
    """
    Get a quick summary of the data for dashboard purposes
    """
    
    # Count distributions
    city_counts = Counter()
    company_counts = Counter()
    domain_counts = Counter()
    
    for user in users_data:
        if user.get('address', {}).get('city'):
            city_counts[user['address']['city']] += 1
        
        if user.get('company', {}).get('name'):
            company_counts[user['company']['name']] += 1
        
        if user.get('email'):
            domain = user['email'].split('@')[-1]
            domain_counts[domain] += 1
    
    return {
        "total_users": len(users_data),
        "data_quality": {
            "users_with_address": sum(1 for user in users_data if user.get('address')),
            "users_with_company": sum(1 for user in users_data if user.get('company')),
            "users_with_email": sum(1 for user in users_data if user.get('email')),
            "users_with_phone": sum(1 for user in users_data if user.get('phone')),
        },
        "top_cities": dict(city_counts.most_common(5)),
        "top_companies": dict(company_counts.most_common(5)),
        "top_email_domains": dict(domain_counts.most_common(5)),
        "geographic_distribution": {
            "total_cities": len(city_counts),
            "users_per_city_avg": len(users_data) / len(city_counts) if city_counts else 0
        }
    }

@router.get("/cities")
async def get_city_stats() -> Dict[str, Any]:
    """Get detailed statistics about cities"""
    
    city_data = {}
    
    for user in users_data:
        address = user.get('address', {})
        city = address.get('city')
        
        if city:
            if city not in city_data:
                city_data[city] = {
                    'count': 0,
                    'zipcodes': set(),
                    'companies': set()
                }
            
            city_data[city]['count'] += 1
            
            if address.get('zipcode'):
                city_data[city]['zipcodes'].add(address['zipcode'])
            
            if user.get('company', {}).get('name'):
                city_data[city]['companies'].add(user['company']['name'])
    
    # Convert sets to lists and sort
    result = {}
    for city, data in city_data.items():
        result[city] = {
            'user_count': data['count'],
            'unique_zipcodes': len(data['zipcodes']),
            'unique_companies': len(data['companies']),
            'zipcodes': sorted(list(data['zipcodes'])),
            'companies': sorted(list(data['companies']))
        }
    
    return {
        "cities": result,
        "total_cities": len(result)
    }

@router.get("/companies")
async def get_company_stats() -> Dict[str, Any]:
    """Get detailed statistics about companies"""
    
    company_data = {}
    
    for user in users_data:
        company = user.get('company', {})
        company_name = company.get('name')
        
        if company_name:
            if company_name not in company_data:
                company_data[company_name] = {
                    'employee_count': 0,
                    'cities': set(),
                    'catchphrase': company.get('catchPhrase', ''),
                    'business_strategy': company.get('bs', '')
                }
            
            company_data[company_name]['employee_count'] += 1
            
            if user.get('address', {}).get('city'):
                company_data[company_name]['cities'].add(user['address']['city'])
    
    # Convert sets to lists
    result = {}
    for company, data in company_data.items():
        result[company] = {
            'employee_count': data['employee_count'],
            'cities_present': sorted(list(data['cities'])),
            'city_count': len(data['cities']),
            'catchphrase': data['catchphrase'],
            'business_strategy': data['business_strategy']
        }
    
    return {
        "companies": result,
        "total_companies": len(result)
    }
