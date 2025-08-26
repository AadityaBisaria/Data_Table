import { useState, useEffect, useMemo } from "react";
import { 
  fetchTableData, 
  fetchFlexibleData, 
  fetchAvailableColumns,
  getColumnsFromData,
  formatColumnLabel,
  DEFAULT_API_URL,
  type FlexibleDataResponse,
  type FetchDataOptions,
  type ColumnInfo
} from "@/lib/api";

export interface TableColumn {
  key: string;
  label: string;
  visible: boolean;
  sortable: boolean;
  description?: string;
}

export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

export interface FilterConfig {
  searchTerm: string;
  columnFilters: Record<string, string>;
}

export function useDataTable(apiUrl: string = DEFAULT_API_URL) {
  console.log("useDataTable hook called with apiUrl:", apiUrl);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [columns, setColumns] = useState<TableColumn[]>([]);
  const [availableColumns, setAvailableColumns] = useState<ColumnInfo>({});
  const [totalItems, setTotalItems] = useState(0);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Sorting
  const [sortConfig, setSortConfig] = useState<SortConfig[]>([]);
  
  // Filtering
  const [filters, setFilters] = useState<FilterConfig>({
    searchTerm: '',
    columnFilters: {}
  });

  // FastAPI specific state
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [isUsingFastAPI, setIsUsingFastAPI] = useState(false);

  // Initialize available columns
  useEffect(() => {
    const initializeColumns = async () => {
      try {
        const isUsingAPI = apiUrl.includes('/api/data');
        setIsUsingFastAPI(isUsingAPI);
        
        if (isUsingAPI) {
          // Fetch available columns from FastAPI
          const columnsInfo = await fetchAvailableColumns();
          setAvailableColumns(columnsInfo);
          
          // Get all available column keys
          const allColumnKeys = Object.keys(columnsInfo);
          setSelectedColumns(allColumnKeys); // Select all columns by default
          
          // Create column configuration with all columns visible by default
          const generatedColumns: TableColumn[] = allColumnKeys.map(key => ({
            key,
            label: formatColumnLabel(key),
            description: columnsInfo[key],
            visible: true, // All columns visible by default
            sortable: true
          }));
          setColumns(generatedColumns);
        }
      } catch (err) {
        console.error("Error initializing columns:", err);
      }
    };

    initializeColumns();
  }, [apiUrl]);

  // Fetch data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (isUsingFastAPI) {
          // Use FastAPI with column selection
          const options: FetchDataOptions = {
            columns: selectedColumns.length > 0 ? selectedColumns : undefined,
            page: currentPage,
            limit: itemsPerPage,
            search: filters.searchTerm || undefined,
            sortBy: sortConfig.length > 0 ? sortConfig[0].key : undefined,
            sortOrder: sortConfig.length > 0 ? sortConfig[0].direction : undefined,
            format: 'nested'
          };
          
          const result = await fetchFlexibleData(options);
          setData(result.data);
          setTotalItems(result.total);
        } else {
          // Legacy API support
          const fetchedData = await fetchTableData(apiUrl);
          setData(fetchedData);
          setTotalItems(fetchedData.length);
          
          // Auto-generate columns for legacy APIs
          const columnKeys = getColumnsFromData(fetchedData);
          const generatedColumns: TableColumn[] = columnKeys.map(key => ({
            key,
            label: formatColumnLabel(key),
            visible: true,
            sortable: true
          }));
          setColumns(generatedColumns);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    if (columns.length > 0 || !isUsingFastAPI) {
      loadData();
    }
  }, [apiUrl, selectedColumns, currentPage, itemsPerPage, filters.searchTerm, sortConfig, isUsingFastAPI, columns.length]);

  // For FastAPI, data processing is handled server-side
  // For legacy APIs, we still need client-side processing
  const filteredData = useMemo(() => {
    if (isUsingFastAPI) {
      // Server-side filtering, just return data as-is
      return data;
    }
    
    let filtered = [...data];

    // Apply search filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        Object.values(item).some(value =>
          String(value).toLowerCase().includes(searchLower)
        )
      );
    }

    // Apply column-specific filters
    Object.entries(filters.columnFilters).forEach(([columnKey, filterValue]) => {
      if (filterValue) {
        filtered = filtered.filter(item =>
          String(item[columnKey]).toLowerCase().includes(filterValue.toLowerCase())
        );
      }
    });

    return filtered;
  }, [data, filters, isUsingFastAPI]);

  // Sort data
  const sortedData = useMemo(() => {
    if (isUsingFastAPI) {
      // Server-side sorting, just return data as-is
      return filteredData;
    }
    
    if (sortConfig.length === 0) return filteredData;

    return [...filteredData].sort((a, b) => {
      for (const sort of sortConfig) {
        const aValue = a[sort.key];
        const bValue = b[sort.key];
        
        let comparison = 0;
        
        if (aValue < bValue) comparison = -1;
        else if (aValue > bValue) comparison = 1;
        
        if (comparison !== 0) {
          return sort.direction === 'desc' ? -comparison : comparison;
        }
      }
      return 0;
    });
  }, [filteredData, sortConfig, isUsingFastAPI]);

  // Paginate data
  const paginatedData = useMemo(() => {
    if (isUsingFastAPI) {
      // Server-side pagination, just return data as-is
      return sortedData;
    }
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedData, currentPage, itemsPerPage, isUsingFastAPI]);

  // Pagination info
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Functions
  const toggleColumnVisibility = (columnKey: string) => {
    setColumns(cols =>
      cols.map(col =>
        col.key === columnKey ? { ...col, visible: !col.visible } : col
      )
    );
    
    // For FastAPI, update selected columns based on visibility
    if (isUsingFastAPI) {
      const visibleColumns = columns
        .map(col => col.key === columnKey ? { ...col, visible: !col.visible } : col)
        .filter(col => col.visible)
        .map(col => col.key);
      setSelectedColumns(visibleColumns);
    }
  };

  // New function to select/deselect specific columns for FastAPI
  const updateSelectedColumns = (columnKeys: string[]) => {
    if (isUsingFastAPI) {
      setSelectedColumns(columnKeys);
      // Update column visibility to match selection
      setColumns(cols =>
        cols.map(col => ({
          ...col,
          visible: columnKeys.includes(col.key)
        }))
      );
    }
  };

  // Function to select all columns
  const selectAllColumns = () => {
    const allColumnKeys = columns.map(col => col.key);
    updateSelectedColumns(allColumnKeys);
  };

  // Function to deselect all columns
  const deselectAllColumns = () => {
    updateSelectedColumns([]);
  };

  const handleSort = (columnKey: string, multiSort = false) => {
    setSortConfig(prevSort => {
      const existingIndex = prevSort.findIndex(sort => sort.key === columnKey);
      
      if (!multiSort) {
        // Single column sort
        if (existingIndex >= 0) {
          const currentDirection = prevSort[existingIndex].direction;
          if (currentDirection === 'desc') {
            return []; // Remove sort
          }
          return [{ key: columnKey, direction: 'desc' }];
        }
        return [{ key: columnKey, direction: 'asc' }];
      } else {
        // Multi-column sort
        const newSort = [...prevSort];
        if (existingIndex >= 0) {
          const currentDirection = newSort[existingIndex].direction;
          if (currentDirection === 'desc') {
            newSort.splice(existingIndex, 1); // Remove this sort
          } else {
            newSort[existingIndex].direction = 'desc';
          }
        } else {
          newSort.push({ key: columnKey, direction: 'asc' });
        }
        return newSort;
      }
    });
  };

  const updateFilter = (filterType: 'search' | 'column', key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      ...(filterType === 'search' 
        ? { searchTerm: value }
        : { columnFilters: { ...prev.columnFilters, [key]: value } }
      )
    }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  const clearFilters = () => {
    setFilters({ searchTerm: '', columnFilters: {} });
    setCurrentPage(1);
  };

  const updateItemsPerPage = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  return {
    data: paginatedData,
    allData: data,
    loading,
    error,
    columns,
    sortConfig,
    filters,
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    
    // Existing functions
    toggleColumnVisibility,
    handleSort,
    updateFilter,
    clearFilters,
    setCurrentPage,
    updateItemsPerPage,
    
    // New FastAPI-specific functions
    availableColumns,
    selectedColumns,
    isUsingFastAPI,
    updateSelectedColumns,
    selectAllColumns,
    deselectAllColumns
  };
}