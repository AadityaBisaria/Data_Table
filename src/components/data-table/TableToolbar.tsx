import { useState, useEffect, useRef } from "react";
import { Search, Filter, Eye, EyeOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { TableColumn, FilterConfig } from "@/hooks/useDataTable";

interface TableToolbarProps {
  columns: TableColumn[];
  filters: FilterConfig;
  onToggleColumn: (columnKey: string) => void;
  onUpdateFilter: (filterType: 'search' | 'column', key: string, value: string) => void;
  onClearFilters: () => void;
  totalItems: number;
  filteredItems: number;
  itemsPerPage: number;
  onItemsPerPageChange: (itemsPerPage: number) => void;
  onSelectAllColumns?: () => void;
  onDeselectAllColumns?: () => void;
}

export function TableToolbar({
  columns,
  filters,
  onToggleColumn,
  onUpdateFilter,
  onClearFilters,
  totalItems,
  filteredItems,
  itemsPerPage,
  onItemsPerPageChange,
  onSelectAllColumns,
  onDeselectAllColumns
}: TableToolbarProps) {
  const [searchInput, setSearchInput] = useState(filters.searchTerm);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const allowCloseRef = useRef(true);
  const [itemsPerPageInput, setItemsPerPageInput] = useState(String(itemsPerPage));
  const visibleColumns = columns.filter(col => col.visible);
  const activeFilters = Object.entries(filters.columnFilters).filter(([_, value]) => value);
  const hasActiveFilters = filters.searchTerm || activeFilters.length > 0;

  // Keep local input in sync when itemsPerPage changes externally
  useEffect(() => {
    setItemsPerPageInput(String(itemsPerPage));
  }, [itemsPerPage]);

  const handleItemsPerPageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow clearing and multi-digit typing; restrict to digits only
    const next = e.target.value.replace(/[^0-9]/g, '');
    setItemsPerPageInput(next);
  };

  const commitItemsPerPage = () => {
    const raw = itemsPerPageInput.trim();
    if (raw === '') {
      // Revert to current value if empty
      setItemsPerPageInput(String(itemsPerPage));
      return;
    }
    const parsed = parseInt(raw, 10);
    if (isNaN(parsed)) {
      setItemsPerPageInput(String(itemsPerPage));
      return;
    }
    // Clamp between 1 and totalItems
    const clamped = Math.max(1, Math.min(totalItems, parsed));
    if (clamped !== itemsPerPage) {
      onItemsPerPageChange(clamped);
    }
    setItemsPerPageInput(String(clamped));
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onUpdateFilter('search', '', searchInput);
      e.currentTarget.blur();
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    // Auto-clear filter when input is emptied
    if (value === '') {
      onUpdateFilter('search', '', '');
    }
  };

  // Debounced live search while typing
  useEffect(() => {
    // Avoid redundant calls
    if (searchInput === filters.searchTerm) return;

    // Debounce typing to avoid spamming API
    const id = setTimeout(() => {
      // If input still differs, trigger search
      onUpdateFilter('search', '', searchInput);
    }, 400);

    return () => clearTimeout(id);
  }, [searchInput, filters.searchTerm, onUpdateFilter]);

  // No-op

  return (
    <div className="flex flex-col gap-4 p-4 border-b bg-muted/5">
      {/* Main toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1">
          {/* Global search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search all columns..."
              value={searchInput}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
              className="pl-9"
            />
          </div>

          {/* Column filters */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-10">
                <Filter className="mr-2 h-4 w-4" />
                Filters
                {activeFilters.length > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                    {activeFilters.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="start">
              <div className="space-y-4">
                <div className="font-medium">Column Filters</div>
                <Separator />
                <div className="space-y-3">
                  {visibleColumns.map((column) => (
                    <div key={column.key} className="space-y-2">
                      <label className="text-sm font-medium">{column.label}</label>
                      <Input
                        placeholder={`Filter ${column.label.toLowerCase()}...`}
                        value={filters.columnFilters[column.key] || ''}
                        onChange={(e) => onUpdateFilter('column', column.key, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Clear filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchInput('');
                onClearFilters();
              }}
              className="h-10"
            >
              <X className="mr-2 h-4 w-4" />
              Clear
            </Button>
          )}
        </div>

        {/* Column visibility */}
        <Popover
          open={columnsOpen}
          onOpenChange={(open) => {
            if (open) {
              setColumnsOpen(true);
              return;
            }
            if (allowCloseRef.current) {
              setColumnsOpen(false);
            }
          }}
        >
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-10">
              <Eye className="mr-2 h-4 w-4" />
              Columns ({visibleColumns.length}/{columns.length})
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-64"
            align="end"
            onOpenAutoFocus={(e) => e.preventDefault()}
            onCloseAutoFocus={(e) => e.preventDefault()}
            onFocusOutside={(e) => e.preventDefault()}
            onPointerDownOutside={() => {
              allowCloseRef.current = true;
              setColumnsOpen(false);
            }}
            onEscapeKeyDown={() => {
              allowCloseRef.current = true;
              setColumnsOpen(false);
            }}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="font-medium">Toggle Columns</div>
                <div className="flex items-center gap-1">
                  {onSelectAllColumns && (
                    <Button variant="ghost" size="sm" className="h-7 px-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        allowCloseRef.current = false;
                        onSelectAllColumns();
                        setTimeout(() => { allowCloseRef.current = true; }, 0);
                      }}>
                      Select all
                    </Button>
                  )}
                  {onDeselectAllColumns && (
                    <Button variant="ghost" size="sm" className="h-7 px-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        allowCloseRef.current = false;
                        onDeselectAllColumns();
                        setTimeout(() => { allowCloseRef.current = true; }, 0);
                      }}>
                      Clear
                    </Button>
                  )}
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                {columns.map((column) => (
                  <div 
                    key={column.key} 
                    className="flex items-center space-x-2"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      id={column.key}
                      checked={column.visible}
                      onCheckedChange={() => {
                        allowCloseRef.current = false;
                        onToggleColumn(column.key);
                        setTimeout(() => { allowCloseRef.current = true; }, 0);
                      }}
                    />
                    <label
                      htmlFor={column.key}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        allowCloseRef.current = false;
                        onToggleColumn(column.key);
                        setTimeout(() => { allowCloseRef.current = true; }, 0);
                      }}
                    >
                      {column.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active filters display */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          
          {filters.searchTerm && (
            <Badge variant="secondary" className="gap-1">
              Search: "{filters.searchTerm}"
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => onUpdateFilter('search', '', '')}
              />
            </Badge>
          )}
          
          {activeFilters.map(([key, value]) => {
            const column = columns.find(col => col.key === key);
            return (
              <Badge key={key} variant="secondary" className="gap-1">
                {column?.label}: "{value}"
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => onUpdateFilter('column', key, '')}
                />
              </Badge>
            );
          })}
        </div>
      )}

      {/* Results info with editable entries per page */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Showing</span>
        <Input
          type="number"
          min="1"
          max={totalItems}
          value={itemsPerPageInput}
          onChange={handleItemsPerPageInputChange}
          onKeyDown={(e) => { if (e.key === 'Enter') commitItemsPerPage(); }}
          onBlur={commitItemsPerPage}
          className="w-16 h-7 text-center text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <span>of {totalItems} results</span>
      </div>
    </div>
  );
}