import { useState, useEffect, useMemo } from "react";
import { fetchTableData, getColumnsFromData, DEFAULT_API_URL } from "@/lib/api";

export interface TableColumn {
  key: string;
  label: string;
  visible: boolean;
  sortable: boolean;
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

  // Fetch data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const fetchedData = await fetchTableData(apiUrl);
        setData(fetchedData);
        
        // Auto-generate columns
        const columnKeys = getColumnsFromData(fetchedData);
        const generatedColumns: TableColumn[] = columnKeys.map(key => ({
          key,
          label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
          visible: true,
          sortable: true
        }));
        setColumns(generatedColumns);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [apiUrl]);

  // Filter data
  const filteredData = useMemo(() => {
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
  }, [data, filters]);

  // Sort data
  const sortedData = useMemo(() => {
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
  }, [filteredData, sortConfig]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedData, currentPage, itemsPerPage]);

  // Pagination info
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const totalItems = sortedData.length;

  // Functions
  const toggleColumnVisibility = (columnKey: string) => {
    setColumns(cols =>
      cols.map(col =>
        col.key === columnKey ? { ...col, visible: !col.visible } : col
      )
    );
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
    toggleColumnVisibility,
    handleSort,
    updateFilter,
    clearFilters,
    setCurrentPage,
    updateItemsPerPage
  };
}