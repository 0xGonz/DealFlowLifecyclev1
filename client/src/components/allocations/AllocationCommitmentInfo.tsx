import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatPercentage } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

type AllocationCommitmentInfoProps = {
  allocationId: number;
  onCreateCapitalCall?: () => void;
};

export function AllocationCommitmentInfo({ allocationId, onCreateCapitalCall }: AllocationCommitmentInfoProps) {
  const { data: commitmentStats, isLoading, error } = useQuery({
    queryKey: ['/api/commitments/allocation', allocationId, 'stats'],
    enabled: !!allocationId,
  });

  if (isLoading) {
    return <AllocationCommitmentSkeleton />;
  }

  if (error || !commitmentStats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Commitment Status</CardTitle>
          <CardDescription>Error loading commitment data</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const {
    totalCommitment,
    calledAmount,
    calledPercentage,
    uncalledAmount,
    uncalledPercentage,
    paidAmount,
    paidPercentage,
    outstandingAmount,
    outstandingPercentage,
  } = commitmentStats;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Commitment Status</CardTitle>
            <CardDescription>
              Commitment tracking and status
            </CardDescription>
          </div>
          {onCreateCapitalCall && (
            <Button size="sm" onClick={onCreateCapitalCall}>
              <Plus className="h-4 w-4 mr-1" />
              New Capital Call
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">
                Called: {formatCurrency(calledAmount)} ({formatPercentage(calledPercentage)})
              </span>
              <span className="text-sm font-medium">
                {formatCurrency(totalCommitment)}
              </span>
            </div>
            <Progress value={calledPercentage} className="h-2" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Called Capital</p>
              <p className="text-2xl font-bold">{formatCurrency(calledAmount)}</p>
              <div className="text-sm text-green-600">{formatPercentage(calledPercentage)} of commitment</div>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Uncalled Capital</p>
              <p className="text-2xl font-bold">{formatCurrency(uncalledAmount)}</p>
              <div className="text-sm text-blue-600">{formatPercentage(uncalledPercentage)} remaining</div>
            </div>
          </div>

          <div className="pt-2 border-t">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Paid Amount</p>
                <p className="text-2xl font-bold">{formatCurrency(paidAmount)}</p>
                <div className="text-sm text-green-600">{formatPercentage(paidPercentage)} of commitment</div>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Outstanding Amount</p>
                <p className="text-2xl font-bold">{formatCurrency(outstandingAmount)}</p>
                <div className="text-sm text-amber-600">
                  {outstandingAmount > 0 
                    ? `${formatPercentage(outstandingPercentage)} due` 
                    : 'No outstanding calls'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AllocationCommitmentSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Commitment Status</CardTitle>
            <CardDescription>
              Commitment tracking and status
            </CardDescription>
          </div>
          <Skeleton className="h-9 w-[130px]" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-4 w-[80px]" />
            </div>
            <Skeleton className="h-2 w-full" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-8 w-[120px]" />
              <Skeleton className="h-4 w-[90px]" />
            </div>

            <div className="space-y-1">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-8 w-[120px]" />
              <Skeleton className="h-4 w-[90px]" />
            </div>
          </div>

          <div className="pt-2 border-t">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-8 w-[120px]" />
                <Skeleton className="h-4 w-[90px]" />
              </div>

              <div className="space-y-1">
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-8 w-[120px]" />
                <Skeleton className="h-4 w-[90px]" />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}