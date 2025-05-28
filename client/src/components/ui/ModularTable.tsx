/**
 * Modular and reusable table component
 * Handles all table display logic with configurable columns and responsive design
 */

import React from 'react';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { TableConfig, RESPONSIVE_CLASSES, getStatusStyle } from "@/lib/services/tableConfig";
import { calculateDynamicWeight } from "@/lib/services/capitalCalculations";

interface ModularTableProps {
  data: any[];
  config: TableConfig;
  isLoading?: boolean;
  onRowClick?: (row: any) => void;
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
  sortState?: { column: string; direction: 'asc' | 'desc' };
  renderActions?: (row: any) => React.ReactNode;
  capitalView?: 'total' | 'called' | 'uncalled';
  getDisplayAmount?: (row: any) => number;
  getCapitalColorClass?: (view: string) => string;
  getDynamicWeight?: (row: any, allData: any[]) => number;
}

export default function ModularTable({
  data,
  config,
  isLoading = false,
  onRowClick,
  onSort,
  sortState,
  renderActions,
  capitalView,
  getDisplayAmount,
  getCapitalColorClass,
  getDynamicWeight
}: ModularTableProps) {
  if (isLoading) {
    return (
      <div className="py-8 text-center text-neutral-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p>Loading data...</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="py-12 text-center text-neutral-500">
        No data found matching the criteria.
      </div>
    );
  }

  const handleSort = (column: string) => {
    if (!onSort || !config.sorting?.enabled) return;
    
    const newDirection = 
      sortState?.column === column && sortState?.direction === 'asc' 
        ? 'desc' 
        : 'asc';
    onSort(column, newDirection);
  };

  const renderCellContent = (column: any, row: any) => {
    // Handle dynamic capital amount columns
    if (column.key === 'amount' && capitalView && getDisplayAmount && getCapitalColorClass) {
      const displayAmount = getDisplayAmount(row);
      const colorClass = getCapitalColorClass(capitalView);
      
      return (
        <span className={`${RESPONSIVE_CLASSES.text.responsive} ${colorClass}`}>
          {column.formatter ? column.formatter(displayAmount, row) : displayAmount}
        </span>
      );
    }

    // Handle dynamic weight columns
    if (column.key === 'portfolioWeight' && capitalView && getDynamicWeight) {
      const dynamicWeight = getDynamicWeight(row, data);
      const colorClass = getCapitalColorClass ? getCapitalColorClass(capitalView) : '';
      
      return (
        <span className={`${RESPONSIVE_CLASSES.text.responsive} ${colorClass}`}>
          {column.formatter ? column.formatter(dynamicWeight, row) : `${dynamicWeight.toFixed(2)}%`}
        </span>
      );
    }

    // Handle status badges
    if (column.key === 'status') {
      const statusType = row.dealId ? 'allocation' : 'deal';
      const statusValue = row[column.key];
      const statusClass = getStatusStyle(statusType, statusValue);
      
      return (
        <Badge className={`${statusClass} ${RESPONSIVE_CLASSES.text.responsive} px-1.5 py-0.5`}>
          {statusValue === 'partially_paid' ? 'Partially Paid' : 
           statusValue?.charAt(0).toUpperCase() + statusValue?.slice(1) || 'N/A'}
        </Badge>
      );
    }

    // Handle actions column
    if (column.key === 'actions' && renderActions) {
      return renderActions(row);
    }

    // Handle formatted values
    const value = row[column.key];
    if (column.formatter) {
      return (
        <span className={RESPONSIVE_CLASSES.text.responsive}>
          {column.formatter(value, row)}
        </span>
      );
    }

    // Default display
    return (
      <span className={RESPONSIVE_CLASSES.text.responsive}>
        {value || 'N/A'}
      </span>
    );
  };

  const renderHeaderContent = (column: any) => {
    // Handle dynamic header labels for capital columns
    if (column.key === 'amount' && capitalView) {
      const labels = {
        total: 'Committed',
        called: 'Called',
        uncalled: 'Remaining'
      };
      return labels[capitalView] || column.label;
    }

    return column.label;
  };

  return (
    <div className="rounded-md border bg-white w-full overflow-hidden">
      <div className="overflow-x-auto w-full scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
        <Table>
          <TableHeader>
            <TableRow className="bg-white border-b">
              {config.columns.map((column, index) => (
                <TableHead
                  key={column.key}
                  className={`
                    font-semibold ${RESPONSIVE_CLASSES.text.responsive}
                    ${column.width || ''}
                    ${column.align === 'right' ? 'text-right' : 
                      column.align === 'center' ? 'text-center' : ''}
                    ${column.responsive !== 'always' ? RESPONSIVE_CLASSES.show[column.responsive || 'always'] : ''}
                    ${column.sortable && config.sorting?.enabled ? 'cursor-pointer hover:bg-gray-50' : ''}
                  `}
                  onClick={() => column.sortable ? handleSort(column.key) : undefined}
                >
                  <div className="flex items-center gap-1">
                    {renderHeaderContent(column)}
                    {column.sortable && config.sorting?.enabled && sortState?.column === column.key && (
                      sortState.direction === 'asc' ? 
                        <ChevronUp className="h-3 w-3" /> : 
                        <ChevronDown className="h-3 w-3" />
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, rowIndex) => (
              <TableRow
                key={row.id || rowIndex}
                className={`
                  group hover:bg-blue-50 hover:shadow-sm transition-all
                  ${onRowClick ? 'cursor-pointer' : ''}
                `}
                onClick={() => onRowClick?.(row)}
              >
                {config.columns.map((column) => (
                  <TableCell
                    key={column.key}
                    className={`
                      py-1.5 sm:py-2.5 px-2 sm:px-4
                      ${column.align === 'right' ? 'text-right' : 
                        column.align === 'center' ? 'text-center' : ''}
                      ${column.responsive !== 'always' ? RESPONSIVE_CLASSES.show[column.responsive || 'always'] : ''}
                    `}
                  >
                    {renderCellContent(column, row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}