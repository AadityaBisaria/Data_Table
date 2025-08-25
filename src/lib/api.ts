/**
 * API configuration utilities
 * Easily switch between demo API and custom FastAPI backend
 * 
 * To use with FastAPI backend:
 * 1. Set VITE_API_URL environment variable in .env file
 * 2. Example: VITE_API_URL=http://localhost:8000/api/data
 * 3. Or use the API Config dialog to set a custom URL
 */

// Default demo API endpoint
export const DEFAULT_API_URL = "https://jsonplaceholder.typicode.com/users";

// Configuration for different API endpoints
export const API_ENDPOINTS = {
  demo: "https://jsonplaceholder.typicode.com/users",
  fastapi: import.meta.env.VITE_API_URL || "http://localhost:8000/api/data", // Configure this for FastAPI
} as const;

export type ApiEndpoint = keyof typeof API_ENDPOINTS;

/**
 * Fetch data from the configured API endpoint
 */
export async function fetchTableData(endpoint: string = DEFAULT_API_URL): Promise<any[]> {
  try {
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