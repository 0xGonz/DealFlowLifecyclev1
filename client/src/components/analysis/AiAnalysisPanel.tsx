import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, Sparkles, X, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { AiAnalysis } from '@shared/schema';

interface AiAnalysisPanelProps {
  dealId: number;
}

const getRecommendationColor = (recommendation: string) => {
  switch (recommendation) {
    case 'recommended':
      return 'bg-green-500';
    case 'not_recommended':
      return 'bg-red-500';
    case 'needs_more_diligence':
    default:
      return 'bg-yellow-500';
  }
};

const getRecommendationText = (recommendation: string) => {
  switch (recommendation) {
    case 'recommended':
      return 'Recommended';
    case 'not_recommended':
      return 'Not Recommended';
    case 'needs_more_diligence':
    default:
      return 'Needs More Diligence';
  }
};

const AiAnalysisPanel = ({ dealId }: AiAnalysisPanelProps) => {
  const { toast } = useToast();
  const { data: user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);

  const { data: analysis, isLoading, error } = useQuery<AiAnalysis>({
    queryKey: [`/api/ai-analyst/${dealId}`],
    enabled: !!dealId,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/ai-analyst/${dealId}/generate`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Analysis Generated',
        description: 'AI analysis has been successfully generated.',
      });
      queryClient.invalidateQueries({ queryKey: [`/api/ai-analyst/${dealId}`] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Generate Analysis',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!analysis) return;
      await apiRequest('DELETE', `/api/ai-analyst/${analysis.id}`);
    },
    onSuccess: () => {
      toast({
        title: 'Analysis Deleted',
        description: 'AI analysis has been successfully deleted.',
      });
      queryClient.invalidateQueries({ queryKey: [`/api/ai-analyst/${dealId}`] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Delete Analysis',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const isAdmin = user?.role === 'admin';
  const isPartner = user?.role === 'partner';
  const canGenerateAnalysis = isAdmin || isPartner;

  if (isLoading) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Sparkles className="w-5 h-5 mr-2" />
            AI Analysis
          </CardTitle>
          <CardDescription>Loading analysis...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Sparkles className="w-5 h-5 mr-2" />
            AI Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              Failed to load AI analysis. Please try again later.
            </AlertDescription>
          </Alert>
          {canGenerateAnalysis && (
            <Button
              className="mt-4"
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Analysis
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Sparkles className="w-5 h-5 mr-2" />
            AI Analysis
          </CardTitle>
          <CardDescription>
            No AI analysis available for this deal yet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <p className="text-muted-foreground mb-6">
              Generate an AI analysis to get insights on this investment opportunity.
            </p>
            {canGenerateAnalysis && (
              <Button
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Analysis
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center">
            <Sparkles className="w-5 h-5 mr-2" />
            AI Analysis
          </CardTitle>
          <Badge className={getRecommendationColor(analysis.recommendation)}>
            {getRecommendationText(analysis.recommendation)}
          </Badge>
        </div>
        <CardDescription>
          AI-generated investment analysis based on available deal data
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium mb-1">Summary</h3>
            <p className="text-sm text-muted-foreground">{analysis.summary}</p>
          </div>

          {isExpanded && (
            <>
              <div>
                <h3 className="text-sm font-medium mb-1">Investment Thesis</h3>
                <p className="text-sm text-muted-foreground">{analysis.investmentThesis || 'No investment thesis provided.'}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-1">Key Risks</h3>
                {analysis.keyRisks && analysis.keyRisks.length > 0 ? (
                  <ul className="list-disc pl-5 text-sm text-muted-foreground">
                    {analysis.keyRisks.map((risk, index) => (
                      <li key={index}>{risk}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No key risks identified.</p>
                )}
              </div>

              <div>
                <h3 className="text-sm font-medium mb-1">Sector Fit Analysis</h3>
                <p className="text-sm text-muted-foreground">{analysis.sectorFitAnalysis || 'No sector fit analysis available.'}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-1">Valuation Analysis</h3>
                <p className="text-sm text-muted-foreground">{analysis.valuationAnalysis || 'No valuation analysis available.'}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-1">Open Questions</h3>
                {analysis.openQuestions && analysis.openQuestions.length > 0 ? (
                  <ul className="list-disc pl-5 text-sm text-muted-foreground">
                    {analysis.openQuestions.map((question, index) => (
                      <li key={index}>{question}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No open questions identified.</p>
                )}
              </div>

              <div>
                <h3 className="text-sm font-medium mb-1">Sources & Confidence</h3>
                <div className="flex items-center mb-2">
                  <div className="w-full bg-muted rounded-full h-2.5">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full" 
                      style={{ width: `${analysis.confidence * 100}%` }}
                    ></div>
                  </div>
                  <span className="ml-2 text-sm">{Math.round(analysis.confidence * 100)}%</span>
                </div>
                {analysis.sourceReferences && analysis.sourceReferences.length > 0 ? (
                  <ul className="text-xs text-muted-foreground mt-2">
                    {analysis.sourceReferences.map((source, index) => (
                      <li key={index} className="flex justify-between items-center">
                        <span>{source.source}</span>
                        <span>{Math.round(source.weight * 100)}%</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No source references available.</p>
                )}
              </div>
            </>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? 'Show Less' : 'Show More'}
        </Button>
        <div className="space-x-2">
          {canGenerateAnalysis && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
              >
                {generateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
                <span className="ml-2">Regenerate</span>
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
                <span className="ml-2">Delete</span>
              </Button>
            </>
          )}
        </div>
      </CardFooter>
    </Card>
  );
};

export default AiAnalysisPanel;