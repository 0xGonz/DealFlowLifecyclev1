import React from 'react';
import { Link } from 'wouter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Deal } from "@/lib/types";
import { getDealStageBadgeClass, formatCurrency, formatDate } from "@/lib/utils/format";
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
    <div className="rounded-md border bg-white overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[250px]">Deal</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead>Sector</TableHead>
            <TableHead>Target Raise</TableHead>
            <TableHead>Timeline</TableHead>
            <TableHead className="text-right">Actions</TableHead>
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
                  <div className="flex items-center gap-3">
                    <Avatar className="bg-primary-50">
                      <AvatarFallback className="font-medium text-primary">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <Link href={`/deals/${deal.id}`} className="font-medium text-neutral-900 hover:text-primary">
                        {deal.name}
                      </Link>
                      <p className="text-xs text-neutral-500 line-clamp-1 max-w-[200px]">
                        {deal.description}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={stageBadgeClass}>
                    {dealStageLabel}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-sm">{deal.sector}</span>
                </TableCell>
                <TableCell>
                  <span className="text-sm">{deal.targetRaise}</span>
                </TableCell>
                <TableCell>
                  <span className="text-sm">{formatDate(deal.updatedAt)}</span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(deal.id)}
                      className="h-8 w-8 p-0"
                    >
                      <span className="sr-only">Edit</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                    {deal.stage === 'invested' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onAllocate(deal.id, deal.name)}
                        className="h-8"
                      >
                        Allocate
                      </Button>
                    )}
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