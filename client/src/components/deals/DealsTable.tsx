import React from 'react';
import { Link } from 'wouter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MoreHorizontal, ChevronDown, User, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Deal } from "@/lib/types";
import { getDealStageBadgeClass, formatCurrency, formatDate, formatPercentage } from "@/lib/utils/format";
import { DealStageLabels } from "@shared/schema";

type DealsTableProps = {
  deals: Deal[] | undefined;
  onEdit: (dealId: number) => void;
  onAllocate: (dealId: number, dealName: string) => void;
  isLoading: boolean;
};

export default function DealsTable({ deals, onEdit, onAllocate, isLoading }: DealsTableProps) {
  if (isLoading) {
    return (
      <div className="py-8 text-center text-neutral-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p>Loading deals...</p>
      </div>
    );
  }

  if (!deals || deals.length === 0) {
    return (
      <div className="py-12 text-center text-neutral-500">
        No deals found matching the criteria.
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-white overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[200px] font-semibold">Deal Name</TableHead>
            <TableHead className="w-[100px] font-semibold">Type</TableHead>
            <TableHead className="w-[300px] font-semibold">Description</TableHead>
            <TableHead className="w-[80px] font-semibold text-right">Return %</TableHead>
            <TableHead className="w-[120px] font-semibold">Status</TableHead>
            <TableHead className="w-[100px] text-center font-semibold">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deals.map((deal) => {
            const stageBadgeClass = getDealStageBadgeClass(deal.stage);
            const dealStageLabel = DealStageLabels[deal.stage as keyof typeof DealStageLabels] || deal.stage;
            
            // Get initials for the deal name
            const initials = deal.name
              .split(' ')
              .map(word => word[0])
              .join('')
              .substring(0, 2)
              .toUpperCase();
              
            return (
              <TableRow key={deal.id}>
                <TableCell>
                  <div className="flex flex-col">
                    <div className="font-medium text-neutral-900">{deal.name}</div>
                    <div className="text-xs text-neutral-500">In DD since {formatDate(deal.updatedAt)}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm">{deal.sector || 'Private Credit'}</span>
                </TableCell>
                <TableCell>
                  <p className="text-sm line-clamp-2 max-w-[280px]">{deal.description}</p>
                </TableCell>
                <TableCell className="text-right">
                  <span className="text-sm font-medium text-emerald-700">10-15%</span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={stageBadgeClass}>
                      {dealStageLabel}
                    </Badge>
                    <ChevronDown className="h-4 w-4 text-neutral-400" />
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex justify-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                    >
                      <User className="h-4 w-4 text-neutral-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                    >
                      <FileText className="h-4 w-4 text-neutral-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(deal.id)}
                      className="h-8 w-8 p-0"
                    >
                      <MoreHorizontal className="h-4 w-4 text-neutral-600" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}