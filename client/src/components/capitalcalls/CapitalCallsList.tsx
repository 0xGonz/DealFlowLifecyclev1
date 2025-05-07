import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  InfoIcon,
  DollarSign,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Eye
} from 'lucide-react';

interface CapitalCallsListProps {
  dealId: number;
}

const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'scheduled':
      return 'bg-blue-100 text-blue-700 hover:bg-blue-100';
    case 'called':
      return 'bg-amber-100 text-amber-700 hover:bg-amber-100';
    case 'partial':
      return 'bg-indigo-100 text-indigo-700 hover:bg-indigo-100';
    case 'paid':
      return 'bg-green-100 text-green-700 hover:bg-green-100';
    case 'defaulted':
      return 'bg-red-100 text-red-700 hover:bg-red-100';
    default:
      return 'bg-neutral-100 text-neutral-700 hover:bg-neutral-100';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'scheduled':
      return <Calendar className="h-4 w-4 mr-1.5" />;
    case 'called':
      return <AlertCircle className="h-4 w-4 mr-1.5" />;
    case 'partial':
      return <Clock className="h-4 w-4 mr-1.5" />;
    case 'paid':
      return <CheckCircle className="h-4 w-4 mr-1.5" />;
    case 'defaulted':
      return <XCircle className="h-4 w-4 mr-1.5" />;
    default:
      return <InfoIcon className="h-4 w-4 mr-1.5" />;
  }
};

export default function CapitalCallsList({ dealId }: CapitalCallsListProps) {
  // Fetch capital calls for this deal
  const { data: capitalCalls = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/capital-calls/deal/${dealId}`],
    enabled: !!dealId
  });
  
  // Fetch allocations for this deal (needed for fund name lookup)
  const { data: allocations = [] } = useQuery<any[]>({
    queryKey: [`/api/allocations/deal/${dealId}`],
    enabled: !!dealId
  });

  // Function to look up fund name from allocation ID
  const getFundNameByAllocationId = (allocationId: number) => {
    const allocation = allocations.find((a: any) => a.id === allocationId);
    return allocation?.fund?.name || 'Unknown Fund';
  };

  if (isLoading) {
    return (
      <div className="py-8 text-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-8 w-8 bg-neutral-200 rounded-full mb-4"></div>
          <div className="h-4 w-48 bg-neutral-200 rounded mb-3"></div>
          <div className="h-4 w-36 bg-neutral-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!capitalCalls.length) {
    return (
      <div className="text-center py-8 space-y-4">
        <DollarSign className="h-12 w-12 mx-auto text-neutral-300" />
        <div className="space-y-2">
          <p className="text-neutral-500">No capital calls have been created for this deal yet.</p>
          {allocations.length > 0 ? (
            <p className="text-sm text-neutral-400">
              Click the "Create Capital Call" button above to schedule a capital call.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-neutral-400">
                This deal must be allocated to a fund before you can create capital calls.
              </p>
              <p className="text-xs text-neutral-400">
                Go to the "Allocations" tab to create a fund allocation.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[250px]">Fund</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Call Date</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-10">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {capitalCalls.map((call: any) => (
            <TableRow key={call.id}>
              <TableCell className="font-medium">
                {getFundNameByAllocationId(call.allocationId)}
              </TableCell>
              <TableCell>
                {call.amountType === 'dollar' ? (
                  <span>${call.callAmount.toLocaleString()}</span>
                ) : (
                  <span>{call.callAmount}%</span>
                )}
              </TableCell>
              <TableCell>
                {call.callDate ? format(new Date(call.callDate), 'MMM d, yyyy') : '-'}
              </TableCell>
              <TableCell>
                {call.dueDate ? format(new Date(call.dueDate), 'MMM d, yyyy') : '-'}
              </TableCell>
              <TableCell>
                <Badge className={`${getStatusBadgeClass(call.status)} gap-1 whitespace-nowrap`}>
                  {getStatusIcon(call.status)}
                  <span className="capitalize">{call.status}</span>
                </Badge>
              </TableCell>
              <TableCell>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  title="View details"
                  onClick={() => {/* Future feature: view/edit capital call details */}}
                  disabled
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}