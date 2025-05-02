import React from 'react';
import { Link } from 'wouter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MoreHorizontal, ChevronDown, User, FileText, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Deal } from "@/lib/types";
import { getDealStageBadgeClass, formatCurrency, formatDate, formatPercentage } from "@/lib/utils/format";
import { DealStageLabels } from "@shared/schema";

type DealsTableProps = {
  deals: Deal[] | undefined;
  onEdit: (dealId: number) => void;
  onAllocate: (dealId: number, dealName: string) => void;
  onUpdateStatus?: (dealId: number, newStatus: string) => void;
  isLoading: boolean;
};

export default function DealsTable({ deals, onEdit, onAllocate, onUpdateStatus, isLoading }: DealsTableProps) {
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
    <div className="rounded-md border bg-white overflow-x-auto w-full">
      <Table>
        <TableHeader>
          <TableRow className="bg-white border-b">
            <TableHead className="w-[18%] md:w-[15%] font-semibold">Deal Name</TableHead>
            <TableHead className="w-[8%] md:w-[10%] lg:w-[8%] hidden sm:table-cell font-semibold">Type</TableHead>
            <TableHead className="w-auto font-semibold">Description</TableHead>
            <TableHead className="w-[8%] lg:w-[8%] hidden sm:table-cell font-semibold text-right">Return</TableHead>
            <TableHead className="w-[25%] md:w-[15%] lg:w-[12%] font-semibold">Status</TableHead>
            <TableHead className="w-[15%] md:w-[12%] lg:w-[10%] text-center font-semibold">Actions</TableHead>
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
              <TableRow key={deal.id} className="hover:bg-neutral-50 cursor-default">
                <TableCell className="py-2 sm:py-3">
                  <div className="flex flex-col">
                    <div className="font-medium text-sm sm:text-base text-neutral-900 truncate">{deal.name}</div>
                    <div className="text-2xs sm:text-xs text-neutral-500 truncate">In DD since {formatDate(deal.updatedAt)}</div>
                  </div>
                </TableCell>
                <TableCell className="py-3 hidden sm:table-cell">
                  <span className="text-sm">{deal.sector || 'Private Credit'}</span>
                </TableCell>
                <TableCell className="py-2 sm:py-3">
                  <p className="text-xs sm:text-sm line-clamp-1 sm:line-clamp-2">{deal.description}</p>
                </TableCell>
                <TableCell className="text-right py-3 hidden sm:table-cell">
                  <span className="text-sm font-medium text-emerald-700">10-15%</span>
                </TableCell>
                <TableCell className="py-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger className="focus:outline-none" asChild>
                      <div className="flex items-center gap-1 sm:gap-2 cursor-pointer max-w-full">
                        <Badge variant="outline" className={`${stageBadgeClass} text-xs sm:text-sm truncate max-w-[85%] sm:max-w-none`}>
                          {dealStageLabel}
                        </Badge>
                        <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0 text-neutral-400" />
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-[180px]">
                      {Object.entries(DealStageLabels).map(([stage, label]) => (
                        <DropdownMenuItem 
                          key={stage} 
                          className="flex items-center justify-between text-xs sm:text-sm"
                          onClick={() => onUpdateStatus ? onUpdateStatus(deal.id, stage) : console.log(`Changed status to ${stage}`)}
                        >
                          <span>{label}</span>
                          {stage === deal.stage && <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
                <TableCell className="py-3">
                  <div className="flex justify-center gap-1 md:gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 sm:h-8 sm:w-8 p-0 hidden sm:inline-flex"
                    >
                      <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-neutral-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 sm:h-8 sm:w-8 p-0 hidden sm:inline-flex"
                    >
                      <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-neutral-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(deal.id)}
                      className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                    >
                      <MoreHorizontal className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-neutral-600" />
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