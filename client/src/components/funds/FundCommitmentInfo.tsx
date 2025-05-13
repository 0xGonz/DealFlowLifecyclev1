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
import { formatCurrency } from '@/lib/formatters';

type FundCommitmentStatsProps = {
  fundId: number;
};

export function FundCommitmentInfo({ fundId }: FundCommitmentStatsProps) {
  const { data: commitmentStats, isLoading, error } = useQuery({
    queryKey: ['/api/commitments/fund', fundId, 'stats'],
    enabled: !!fundId,
  });

  if (isLoading) {
    return <FundCommitmentSkeleton />;
  }

  if (error || !commitmentStats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Capital Commitment</CardTitle>
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
  } = commitmentStats;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Capital Commitment</CardTitle>
        <CardDescription>
          Tracking called and uncalled capital
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">
                Called: {formatCurrency(calledAmount)} ({calledPercentage.toFixed(1)}%)
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
              <div className="text-sm text-green-600">{calledPercentage.toFixed(1)}% of commitment</div>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Uncalled Capital</p>
              <p className="text-2xl font-bold">{formatCurrency(uncalledAmount)}</p>
              <div className="text-sm text-blue-600">{uncalledPercentage.toFixed(1)}% remaining</div>
            </div>
          </div>

          {commitmentStats.allocationStats && commitmentStats.allocationStats.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">Allocation Breakdown</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {commitmentStats.allocationStats.map((allocation) => (
                  <div key={allocation.allocationId} className="border rounded-md p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{allocation.dealName}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(allocation.calledAmount)} of {formatCurrency(allocation.totalCommitment)} called
                        </p>
                      </div>
                      <span className="text-sm bg-blue-100 text-blue-800 rounded-full px-2 py-0.5">
                        {allocation.calledPercentage.toFixed(1)}%
                      </span>
                    </div>
                    <Progress 
                      value={allocation.calledPercentage} 
                      className="h-1.5 mt-2" 
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function FundCommitmentSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Capital Commitment</CardTitle>
        <CardDescription>
          Tracking called and uncalled capital
        </CardDescription>
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

          <div className="mt-4">
            <Skeleton className="h-5 w-[150px] mb-2" />
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="border rounded-md p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <Skeleton className="h-5 w-[120px] mb-1" />
                      <Skeleton className="h-4 w-[150px]" />
                    </div>
                    <Skeleton className="h-6 w-[40px] rounded-full" />
                  </div>
                  <Skeleton className="h-1.5 w-full mt-2" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}