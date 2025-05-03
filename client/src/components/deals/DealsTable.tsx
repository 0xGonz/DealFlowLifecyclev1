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
    <div className="rounded-md border bg-white w-full overflow-hidden">
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-white border-b">
              <TableHead className="w-[35%] xs:w-[25%] sm:w-[20%] md:w-[18%] font-semibold text-[10px] xs:text-xs sm:text-sm">Deal Name</TableHead>
              <TableHead className="w-[12%] sm:w-[10%] hidden xs:table-cell font-semibold text-[10px] xs:text-xs sm:text-sm">Type</TableHead>
              <TableHead className="w-auto hidden sm:table-cell font-semibold text-[10px] xs:text-xs sm:text-sm">Description</TableHead>
              <TableHead className="w-[10%] hidden md:table-cell font-semibold text-right text-[10px] xs:text-xs sm:text-sm">Return</TableHead>
              <TableHead className="w-[40%] xs:w-[35%] sm:w-[25%] md:w-[20%] lg:w-[15%] font-semibold text-[10px] xs:text-xs sm:text-sm">Status</TableHead>
              <TableHead className="w-[25%] xs:w-[15%] md:w-[12%] lg:w-[10%] text-center font-semibold text-[10px] xs:text-xs sm:text-sm">Actions</TableHead>
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
                  <TableCell className="py-1.5 sm:py-2.5 px-2 sm:px-4">
                    <div className="flex flex-col">
                      <div className="font-medium text-xs sm:text-sm md:text-base text-neutral-900 truncate">{deal.name}</div>
                    </div>
                  </TableCell>
                  <TableCell className="py-2 sm:py-3 px-2 sm:px-4 hidden xs:table-cell">
                    <span className="text-2xs xs:text-xs sm:text-sm">{deal.sector || 'Private Credit'}</span>
                  </TableCell>
                  <TableCell className="py-1.5 sm:py-2.5 px-2 sm:px-4 hidden sm:table-cell">
                    <p className="text-2xs xs:text-xs sm:text-sm line-clamp-1 sm:line-clamp-2">{deal.description}</p>
                  </TableCell>
                  <TableCell className="text-right py-2 sm:py-3 px-2 sm:px-4 hidden md:table-cell">
                    <span className="text-2xs xs:text-xs sm:text-sm font-medium text-emerald-700">
                      {deal.score ? `${deal.score}%` : 'N/A'}
                    </span>
                  </TableCell>
                  <TableCell className="py-1 sm:py-2 px-2 sm:px-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="focus:outline-none" asChild>
                        <div className="flex items-center gap-1 sm:gap-2 cursor-pointer max-w-full">
                          <Badge variant="outline" className={`${stageBadgeClass} text-[9px] xs:text-xs sm:text-sm px-1.5 py-0.5 truncate max-w-[85%] sm:max-w-none`}>
                            {dealStageLabel}
                          </Badge>
                          <ChevronDown className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 flex-shrink-0 text-neutral-400" />
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
                            {stage === deal.stage && <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary" />}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                  <TableCell className="py-1 sm:py-2 px-2 sm:px-4">
                    <div className="flex justify-center gap-1 md:gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 p-0 hidden sm:inline-flex"
                      >
                        <User className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 text-neutral-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 p-0 hidden sm:inline-flex"
                      >
                        <FileText className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 text-neutral-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(deal.id)}
                        className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 p-0"
                      >
                        <MoreHorizontal className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 text-neutral-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}