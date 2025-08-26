/**
 * API configuration utilities
 * FastAPI backend with flexible column selection
 */

// FastAPI backend endpoints
export const FASTAPI_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const API_ENDPOINTS = {
  demo: "https://jsonplaceholder.typicode.com/users",
  fastapi: `${FASTAPI_BASE_URL}/api/data`,
  local: `${FASTAPI_BASE_URL}/api/data`, // Use FastAPI by default
} as const;

export type ApiEndpoint = keyof typeof API_ENDPOINTS;

// Use FastAPI as default
export const DEFAULT_API_URL = API_ENDPOINTS.fastapi;

// FastAPI specific endpoints
export const FASTAPI_ENDPOINTS = {
  data: `${FASTAPI_BASE_URL}/api/data`,
  columns: `${FASTAPI_BASE_URL}/api/columns`,
  stats: `${FASTAPI_BASE_URL}/api/stats`,
} as const;

// Types for FastAPI responses
export interface ColumnInfo {
  [key: string]: string; // column key -> description
}

export interface FlexibleDataResponse {
  data: any[];
  columns: string[];
  total: number;
  pagination?: {
    page: number;
    limit: number;
    pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
  format: string;
}

export interface FetchDataOptions {
  columns?: string[];
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  format?: 'nested' | 'flat';
  filters?: Record<string, string>;
}

/**
 * Fetch available columns from FastAPI
 */
export async function fetchAvailableColumns(): Promise<ColumnInfo> {
  try {
    const response = await fetch(FASTAPI_ENDPOINTS.columns);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const result = await response.json();
    return result.columns || {};
  } catch (error) {
    console.error("Error fetching columns:", error);
    // Return default columns if API fails
    return {
      "id": "User ID",
      "name": "Full Name",
      "username": "Username", 
      "email": "Email Address",
      "phone": "Phone Number",
      "website": "Website",
      "address.street": "Street Address",
      "address.city": "City",
      "company.name": "Company Name"
    };
  }
}

/**
 * Fetch data with flexible column selection from FastAPI
 */
export async function fetchFlexibleData(options: FetchDataOptions = {}): Promise<FlexibleDataResponse> {
  try {
    const params = new URLSearchParams();
    
    // Add parameters if provided
    if (options.columns && options.columns.length > 0) {
      params.append('columns', options.columns.join(','));
    }
    if (options.page) params.append('page', options.page.toString());
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.search) params.append('search', options.search);
    if (options.sortBy) params.append('sort_by', options.sortBy);
    if (options.sortOrder) params.append('sort_order', options.sortOrder);
    if (options.format) params.append('format', options.format);
    if (options.filters && Object.keys(options.filters).length > 0) {
      const pairs: string[] = [];
      for (const [k, v] of Object.entries(options.filters)) {
        if (v !== undefined && v !== null && String(v).trim() !== '') {
          pairs.push(`${k}:${String(v).trim()}`);
        }
      }
      if (pairs.length > 0) {
        params.append('filters', pairs.join(','));
      }
    }

    const url = `${FASTAPI_ENDPOINTS.data}?${params.toString()}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error fetching flexible data:", error);
    throw error;
  }
}

/**
 * Legacy function for backward compatibility
 */
export async function fetchTableData(endpoint: string = DEFAULT_API_URL): Promise<any[]> {
  try {
    // If using FastAPI endpoint, use the new flexible data function
    if (endpoint.includes('/api/data')) {
      const result = await fetchFlexibleData();
      return result.data;
    }
    
    // Legacy support for other endpoints
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return Array.isArray(data) ? data : [data];
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
}

/**
 * Get columns from data automatically based on JSON keys
 */
export function getColumnsFromData(data: any[]): string[] {
  if (!data || data.length === 0) return [];
  
  // Get all unique keys from the first few items to handle inconsistent data
  const keys = new Set<string>();
  const sampleSize = Math.min(3, data.length);
  
  for (let i = 0; i < sampleSize; i++) {
    if (data[i] && typeof data[i] === 'object') {
      Object.keys(data[i]).forEach(key => keys.add(key));
    }
  }
  
  return Array.from(keys);
}

/**
 * Convert API column keys to user-friendly labels
 */
export function formatColumnLabel(columnKey: string): string {
  const labelMap: Record<string, string> = {
    'id': 'ID',
    'name': 'Full Name',
    'username': 'Username',
    'email': 'Email Address',
    'phone': 'Phone Number',
    'website': 'Website',
    'address.street': 'Street Address',
    'address.suite': 'Suite/Apartment',
    'address.city': 'City',
    'address.zipcode': 'ZIP Code',
    'address.geo.lat': 'Latitude',
    'address.geo.lng': 'Longitude',
    'company.name': 'Company Name',
    'company.catchPhrase': 'Company Slogan',
    'company.bs': 'Business Strategy'
  };
  
  return labelMap[columnKey] || columnKey.charAt(0).toUpperCase() + columnKey.slice(1).replace(/([A-Z])/g, ' $1');
}