import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Sparkles, MessageSquareText } from 'lucide-react';

interface AiInsightsProps {
  dealId: number;
}

const AiInsights = ({ dealId }: AiInsightsProps) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>('insights');
  const [question, setQuestion] = useState<string>('');
  const [insight, setInsight] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);

  // Mutation for getting AI insights
  const insightsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/ai-analyst/${dealId}/insights`);
      return res.json();
    },
    onSuccess: (data) => {
      setInsight(data.insight);
      toast({
        title: 'Insights Generated',
        description: 'AI insights have been successfully generated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Generate Insights',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Mutation for asking AI a question
  const askMutation = useMutation({
    mutationFn: async (questionText: string) => {
      const res = await apiRequest('POST', `/api/ai-analyst/${dealId}/ask`, { question: questionText });
      return res.json();
    },
    onSuccess: (data) => {
      setAnswer(data.answer);
      toast({
        title: 'Question Answered',
        description: 'AI has provided an answer to your question.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Get Answer',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleAskQuestion = () => {
    if (!question.trim()) {
      toast({
        title: 'Question Required',
        description: 'Please enter a question to ask.',
        variant: 'destructive',
      });
      return;
    }
    askMutation.mutate(question);
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Sparkles className="w-5 h-5 mr-2" />
          AI Insights
        </CardTitle>
        <CardDescription>
          Get instant insights or ask questions about this deal
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="insights">
              <Sparkles className="w-4 h-4 mr-2" />
              Insights
            </TabsTrigger>
            <TabsTrigger value="ask">
              <MessageSquareText className="w-4 h-4 mr-2" />
              Ask AI
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="insights" className="pt-4">
            {insight ? (
              <div className="bg-muted rounded-md p-4">
                <p className="whitespace-pre-line">{insight}</p>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground mb-6">
                  Generate quick insights about this investment opportunity.
                </p>
                <Button
                  onClick={() => insightsMutation.mutate()}
                  disabled={insightsMutation.isPending}
                >
                  {insightsMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Insights
                    </>
                  )}
                </Button>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="ask" className="pt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="question">Your Question</Label>
                <Textarea
                  id="question"
                  placeholder="Enter your question about this deal..."
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
              
              {answer && (
                <div className="bg-muted rounded-md p-4 mt-4">
                  <h4 className="text-sm font-medium mb-2">Answer:</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{answer}</p>
                </div>
              )}
              
              <Button
                onClick={handleAskQuestion}
                disabled={askMutation.isPending || !question.trim()}
              >
                {askMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Thinking...
                  </>
                ) : (
                  <>
                    <MessageSquareText className="mr-2 h-4 w-4" />
                    Ask Question
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-end">
        {(insight || answer) && activeTab === 'insights' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => insightsMutation.mutate()}
            disabled={insightsMutation.isPending}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Regenerate Insights
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default AiInsights;