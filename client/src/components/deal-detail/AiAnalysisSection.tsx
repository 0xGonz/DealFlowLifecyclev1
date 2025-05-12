import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePermissions } from '@/hooks/use-permissions';
import AiAnalysisPanel from '@/components/analysis/AiAnalysisPanel';
import AiInsights from '@/components/analysis/AiInsights';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, FileSearch, MessageSquareText } from 'lucide-react';
import { Deal } from '@shared/schema';

interface AiAnalysisSectionProps {
  dealId: number;
}

const AiAnalysisSection = ({ dealId }: AiAnalysisSectionProps) => {
  const [activeTab, setActiveTab] = useState<string>('full-analysis');
  const { canView } = usePermissions();
  const canViewAiAnalysis = canView('aiAnalysis');

  // Check if deal is in the correct stage for AI analysis
  const { data: deal } = useQuery<Deal>({
    queryKey: [`/api/deals/${dealId}`],
    enabled: !!dealId,
  });

  // Only certain stages should have AI analysis
  const isEligibleForAnalysis = 
    deal && (
      deal.stage === 'diligence' || 
      deal.stage === 'ai_review' || 
      deal.stage === 'ic_review' ||
      deal.stage === 'closing' || 
      deal.stage === 'invested'
    );
    
  // Check if the deal stage exists in the schema
  const validStages = ['initial_review', 'screening', 'diligence', 'ai_review', 
                      'ic_review', 'closing', 'closed', 'invested', 'rejected'];

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
            Current stage: {deal && deal.stage ? 
              deal.stage.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') 
              : 'Unknown'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mt-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Sparkles className="w-5 h-5 mr-2" />
            AI Analysis Tools
          </CardTitle>
          <CardDescription>
            Leverage AI to gain insights and analyze this investment opportunity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="full-analysis">
                <FileSearch className="w-4 h-4 mr-2" />
                Full Analysis
              </TabsTrigger>
              <TabsTrigger value="insights">
                <MessageSquareText className="w-4 h-4 mr-2" />
                Quick Insights
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="full-analysis" className="pt-4">
              <AiAnalysisPanel dealId={dealId} />
            </TabsContent>
            
            <TabsContent value="insights" className="pt-4">
              <AiInsights dealId={dealId} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AiAnalysisSection;