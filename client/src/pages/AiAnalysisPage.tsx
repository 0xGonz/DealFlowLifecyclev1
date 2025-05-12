import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Send, Sparkles, FileText } from 'lucide-react';
import { 
  Select, 
  SelectContent, 
  SelectGroup,
  SelectItem, 
  SelectLabel,
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Deal, MiniMemo, Document } from '@shared/schema';
import AppLayout from '@/components/layout/AppLayout';

interface AiAnswer {
  text: string;
  sources?: {
    type: string;
    id: number;
    name: string;
  }[];
}

interface AiInsight {
  title: string;
  content: string;
  confidence: number;
  documentReferences?: {
    id: number;
    name: string;
    relevance: number;
  }[];
}

const AiAnalysisPage = () => {
  const { toast } = useToast();
  const [selectedDealId, setSelectedDealId] = useState<number | null>(null);
  const [question, setQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState<AiAnswer | null>(null);
  const [loadingResponse, setLoadingResponse] = useState(false);
  const [insights, setInsights] = useState<AiInsight[]>([]);

  // Fetch all deals
  const { data: deals, isLoading: isLoadingDeals } = useQuery<Deal[]>({
    queryKey: ['/api/deals'],
    enabled: true,
  });

  // Fetch deal documents if a deal is selected
  const { data: documents } = useQuery<Document[]>({
    queryKey: [`/api/documents/by-deal/${selectedDealId}`],
    enabled: !!selectedDealId,
  });

  // Fetch deal memos if a deal is selected
  const { data: memos } = useQuery<MiniMemo[]>({
    queryKey: [`/api/deals/${selectedDealId}/mini-memos`],
    enabled: !!selectedDealId,
  });

  const askQuestion = async () => {
    if (!selectedDealId || !question.trim()) {
      toast({
        title: 'Missing information',
        description: 'Please select a deal and enter a question',
        variant: 'destructive',
      });
      return;
    }

    setLoadingResponse(true);
    try {
      const response = await apiRequest('POST', `/api/ai-analyst/${selectedDealId}/ask`, { 
        question 
      });
      const data = await response.json();
      setAiResponse(data);
    } catch (error) {
      toast({
        title: 'Failed to get response',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoadingResponse(false);
    }
  };

  const generateInsights = async () => {
    if (!selectedDealId) {
      toast({
        title: 'Missing information',
        description: 'Please select a deal to analyze',
        variant: 'destructive',
      });
      return;
    }

    setLoadingResponse(true);
    try {
      const response = await apiRequest('POST', `/api/ai-analyst/${selectedDealId}/insights`);
      const data = await response.json();
      setInsights(data);
    } catch (error) {
      toast({
        title: 'Failed to generate insights',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoadingResponse(false);
    }
  };

  // Function to format source references
  const renderSourceReferences = (sources?: AiAnswer['sources']) => {
    if (!sources || sources.length === 0) return null;
    
    return (
      <div className="mt-4 border-t pt-3">
        <p className="text-sm font-medium mb-2">Sources:</p>
        <ul className="text-sm text-muted-foreground">
          {sources.map((source, index) => (
            <li key={index} className="flex items-center mb-1">
              <FileText className="h-3.5 w-3.5 mr-2" />
              {source.name}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">AI Deal Analysis</h1>
        </div>
        
        <div className="grid gap-6 md:grid-cols-12">
          <div className="md:col-span-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Sparkles className="w-5 h-5 mr-2" />
                  Deal Selection
                </CardTitle>
                <CardDescription>
                  Select a deal to analyze with AI
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Select
                    onValueChange={(value) => setSelectedDealId(Number(value))}
                    disabled={isLoadingDeals}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a deal" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Available Deals</SelectLabel>
                        {deals?.map((deal) => (
                          <SelectItem key={deal.id} value={deal.id.toString()}>
                            {deal.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                
                {selectedDealId && (
                  <div className="rounded-md bg-muted p-3 text-sm">
                    <h3 className="font-medium mb-1">Selected Deal Info:</h3>
                    <p className="text-muted-foreground">
                      {deals?.find(d => d.id === selectedDealId)?.description || 'No description available'}
                    </p>
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between">
                        <span>Documents:</span>
                        <span className="font-medium">{documents?.length || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Memos:</span>
                        <span className="font-medium">{memos?.length || 0}</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="mt-4">
                  <Button 
                    className="w-full"
                    variant="default"
                    onClick={generateInsights}
                    disabled={!selectedDealId || loadingResponse}
                  >
                    {loadingResponse && insights.length === 0 ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate Key Insights
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-8">
            <Tabs defaultValue="ask">
              <TabsList className="mb-4">
                <TabsTrigger value="ask">Ask Questions</TabsTrigger>
                <TabsTrigger value="insights">Key Insights</TabsTrigger>
              </TabsList>
              
              <TabsContent value="ask" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Ask About This Deal</CardTitle>
                    <CardDescription>
                      Ask any question about this deal and I'll analyze all available information
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end space-x-2">
                      <div className="flex-1">
                        <Textarea
                          placeholder="Example: What are the projected returns? What are the key risks? How does this compare to similar deals?"
                          value={question}
                          onChange={(e) => setQuestion(e.target.value)}
                          className="min-h-[120px]"
                          disabled={!selectedDealId || loadingResponse}
                        />
                      </div>
                      <Button 
                        size="icon" 
                        className="mb-1"
                        onClick={askQuestion}
                        disabled={!selectedDealId || !question.trim() || loadingResponse}
                      >
                        {loadingResponse ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    
                    {aiResponse && (
                      <div className="mt-6 bg-muted rounded-md p-4">
                        <div className="flex items-start">
                          <Sparkles className="w-5 h-5 mr-3 mt-0.5 text-primary" />
                          <div>
                            <p className="text-sm">{aiResponse.text}</p>
                            {renderSourceReferences(aiResponse.sources)}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="insights" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>AI-Generated Insights</CardTitle>
                    <CardDescription>
                      Key observations and analysis from all available deal information
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {insights.length > 0 ? (
                      <div className="space-y-6">
                        {insights.map((insight, index) => (
                          <div key={index} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h3 className="text-md font-semibold">{insight.title}</h3>
                              <span className="text-xs bg-muted px-2 py-1 rounded-full">
                                {Math.round(insight.confidence * 100)}% confidence
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">{insight.content}</p>
                            
                            {insight.documentReferences && insight.documentReferences.length > 0 && (
                              <div className="mt-2 text-xs text-muted-foreground">
                                <p className="font-medium mb-1">Sources:</p>
                                <ul className="space-y-1">
                                  {insight.documentReferences.map((doc, idx) => (
                                    <li key={idx} className="flex items-center">
                                      <FileText className="h-3 w-3 mr-2" />
                                      <span>{doc.name}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">
                          {loadingResponse 
                            ? "Analyzing deal data..."
                            : "Select a deal and click 'Generate Key Insights' to see AI analysis"}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default AiAnalysisPage;