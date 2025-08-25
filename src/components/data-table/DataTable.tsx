import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TableToolbar } from "./TableToolbar";
import { TablePagination } from "./TablePagination";
import { useDataTable, type SortConfig } from "@/hooks/useDataTable";

interface DataTableProps {
  apiUrl?: string;
  className?: string;
}

export function DataTable({ apiUrl, className }: DataTableProps) {
  const {
    data,
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
    setCurrentPage
  } = useDataTable(apiUrl);

  if (loading) {
    return (
      <div className={cn("border rounded-lg", className)}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("border rounded-lg", className)}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-destructive mb-2">Error loading data</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const visibleColumns = columns.filter(col => col.visible);
  const filteredItemsCount = data.length > 0 ? 
    Math.ceil((currentPage - 1) * itemsPerPage) + data.length : 0;

  const getSortIcon = (columnKey: string) => {
    const sortIndex = sortConfig.findIndex(sort => sort.key === columnKey);
    if (sortIndex === -1) return <ChevronsUpDown className="ml-2 h-4 w-4 text-muted-foreground" />;
    
    const sort = sortConfig[sortIndex];
    const icon = sort.direction === 'asc' ? 
      <ChevronUp className="ml-2 h-4 w-4" /> : 
      <ChevronDown className="ml-2 h-4 w-4" />;
    
    return (
      <div className="flex items-center ml-2">
        {icon}
        {sortConfig.length > 1 && (
          <Badge variant="outline" className="ml-1 h-4 w-4 rounded-full p-0 text-xs">
            {sortIndex + 1}
          </Badge>
        )}
      </div>
    );
  };

  const formatCellValue = (value: any) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'object') return JSON.stringify(value);
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
  };

  return (
    <div className={cn("border rounded-lg", className)}>
      <TableToolbar
        columns={columns}
        filters={filters}
        onToggleColumn={toggleColumnVisibility}
        onUpdateFilter={updateFilter}
        onClearFilters={clearFilters}
        totalItems={totalItems}
        filteredItems={filteredItemsCount}
      />

      <div className="overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {visibleColumns.map((column) => (
                <TableHead key={column.key} className="whitespace-nowrap">
                  {column.sortable ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 hover:bg-transparent font-medium"
                      onClick={(e) => handleSort(column.key, e.ctrlKey || e.metaKey)}
                    >
                      {column.label}
                      {getSortIcon(column.key)}
                    </Button>
                  ) : (
                    <span className="font-medium">{column.label}</span>
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={visibleColumns.length} className="text-center h-24">
                  <div className="text-muted-foreground">
                    {filters.searchTerm || Object.keys(filters.columnFilters).length > 0
                      ? "No results found matching your filters"
                      : "No data available"
                    }
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, index) => (
                <TableRow key={index} className="hover:bg-muted/50">
                  {visibleColumns.map((column) => (
                    <TableCell key={column.key} className="whitespace-nowrap">
                      {formatCellValue(row[column.key])}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}