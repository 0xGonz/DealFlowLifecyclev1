import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePermissions } from '@/hooks/use-permissions';
import AiAnalysisPanel from '@/components/analysis/AiAnalysisPanel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

interface AiAnalysisSectionProps {
  dealId: number;
}

const AiAnalysisSection = ({ dealId }: AiAnalysisSectionProps) => {
  const { canView } = usePermissions();
  const canViewAiAnalysis = canView('aiAnalysis');

  // Check if deal is in the correct stage for AI analysis
  const { data: deal } = useQuery({
    queryKey: [`/api/deals/${dealId}`],
    enabled: !!dealId,
  });

  // Only certain stages should have AI analysis
  const isEligibleForAnalysis = deal?.stage === 'diligence' || 
                               deal?.stage === 'ai_review' || 
                               deal?.stage === 'ic_review' ||
                               deal?.stage === 'closing' || 
                               deal?.stage === 'invested';

  if (!canViewAiAnalysis) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>AI Analysis</CardTitle>
          <CardDescription>Permission denied</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
          <p className="text-muted-foreground">
            You don't have permission to view AI analysis for this deal.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!isEligibleForAnalysis) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>AI Analysis</CardTitle>
          <CardDescription>
            This deal is not yet ready for AI analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
          <p className="text-muted-foreground">
            AI analysis is available once a deal reaches the diligence stage or later.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Current stage: {deal?.stageLabel || 'Unknown'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return <AiAnalysisPanel dealId={dealId} />;
};

export default AiAnalysisSection;