import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bot, Send, FileText, Database, TrendingUp, Loader2, Brain, Search, Sparkles, BarChart3 } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from "@/hooks/use-toast";
import FormattedText from "@/components/common/FormattedText";
import AppLayout from "@/components/layout/AppLayout";

interface Deal {
  id: number;
  name: string;
  sector: string;
  stage: string;
  stageLabel: string;
  description: string;
}

interface AnalysisMessage {
  id: string;
  type: 'user' | 'ai' | 'analysis';
  content: string;
  timestamp: Date;
  context?: {
    dataSourcesUsed: string[];
    dealName: string;
  };
}

export default function AIAnalysis() {
  const [selectedDealId, setSelectedDealId] = useState<number | null>(null);
  const [messages, setMessages] = useState<AnalysisMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isGeneratingAnalysis, setIsGeneratingAnalysis] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Fetch all deals for the dropdown
  const { data: deals = [], isLoading: dealsLoading } = useQuery<Deal[]>({
    queryKey: ['/api/deals'],
  });

  // Get deal context when a deal is selected
  const contextData = null; // Simplified context for now
  const contextLoading = false;

  // Fetch documents for the selected deal
  const { data: documents = [], isLoading: documentsLoading } = useQuery({
    queryKey: [`/api/documents/deal/${selectedDealId}`],
    enabled: !!selectedDealId
  });

  // AI Analysis mutation
  const aiAnalysisMutation = useMutation({
    mutationFn: async ({ query }: { query?: string }) => {
      if (!selectedDealId) {
        throw new Error('Please select a deal first');
      }
      
      const response = await fetch(`/api/deals/${selectedDealId}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
      });
      
      if (!response.ok) {
        throw new Error('Failed to analyze deal');
      }
      
      return response.json();
    },
    onSuccess: (data: any) => {
      const aiMessage: AnalysisMessage = {
        id: `ai-${Date.now()}`,
        type: data.query ? 'ai' : 'analysis',
        content: data.response || data.analysis,
        timestamp: new Date(),
        context: data.context
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsGeneratingAnalysis(false);
    },
    onError: (error: any) => {
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to generate AI analysis",
        variant: "destructive"
      });
      setIsGeneratingAnalysis(false);
    }
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Clear messages when deal changes
  useEffect(() => {
    setMessages([]);
  }, [selectedDealId]);

  const selectedDeal = deals?.find((deal: Deal) => deal.id === selectedDealId);

  const handleSendMessage = () => {
    if (!inputValue.trim() || aiAnalysisMutation.isPending || !selectedDealId) return;

    // Add user message
    const userMessage: AnalysisMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    // Send to AI
    aiAnalysisMutation.mutate({ query: inputValue.trim() });
    setInputValue('');
  };

  const handleGenerateAnalysis = () => {
    if (aiAnalysisMutation.isPending || !selectedDealId) return;

    setIsGeneratingAnalysis(true);
    
    const analysisMessage: AnalysisMessage = {
      id: `analysis-request-${Date.now()}`,
      type: 'user',
      content: 'Generate comprehensive investment analysis',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, analysisMessage]);

    // Generate comprehensive analysis without specific query
    aiAnalysisMutation.mutate({});
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <AppLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
              <Brain className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">AI Investment Analysis</h1>
              <p className="text-gray-600 mt-1">Get intelligent insights about your investment deals</p>
            </div>
          </div>

          {/* Deal Selection */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Search className="h-5 w-5 text-gray-500" />
              <span className="font-medium text-gray-900">Select Deal to Analyze</span>
            </div>
            
            <Select 
              value={selectedDealId?.toString() || ""} 
              onValueChange={(value) => setSelectedDealId(parseInt(value))}
            >
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Choose a deal for AI analysis..." />
              </SelectTrigger>
              <SelectContent>
                {dealsLoading ? (
                  <SelectItem value="loading" disabled>Loading deals...</SelectItem>
                ) : deals.length === 0 ? (
                  <SelectItem value="empty" disabled>No deals available</SelectItem>
                ) : (
                  deals.map((deal: Deal) => (
                    <SelectItem key={deal.id} value={deal.id.toString()}>
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{deal.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {deal.stageLabel}
                        </Badge>
                        <span className="text-sm text-gray-500">• {deal.sector}</span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            {selectedDeal && (
              <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{selectedDeal.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{selectedDeal.description}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <Badge variant="secondary">{selectedDeal.stageLabel}</Badge>
                      <span className="text-sm text-gray-500">{selectedDeal.sector}</span>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleGenerateAnalysis}
                    disabled={aiAnalysisMutation.isPending || isGeneratingAnalysis}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    {(aiAnalysisMutation.isPending || isGeneratingAnalysis) ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-2" />
                    )}
                    Generate Analysis
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Analysis Area */}
        {selectedDealId ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Messages Area */}
            <ScrollArea className="h-[600px] p-6">
              <div className="space-y-6">
                {messages.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mb-6">
                      <Bot className="h-8 w-8 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">AI Analysis Ready</h3>
                    <p className="text-gray-600 mb-8 max-w-lg mx-auto">
                      Ask me anything about {selectedDeal?.name} or generate a comprehensive investment analysis based on all available data.
                    </p>
                    <div className="flex flex-wrap gap-3 justify-center">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setInputValue("What are the key investment risks in this deal?")}
                        className="hover:bg-blue-50 hover:border-blue-300"
                      >
                        Key Risks
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setInputValue("Analyze the financial projections and metrics")}
                        className="hover:bg-purple-50 hover:border-purple-300"
                      >
                        Financial Analysis
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setInputValue("What's the investment thesis and market opportunity?")}
                        className="hover:bg-green-50 hover:border-green-300"
                      >
                        Investment Thesis
                      </Button>
                      {documents && documents.length > 0 && documents.map((document: any) => (
                        <Button
                          key={document.id}
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            const userMessage = {
                              id: Date.now().toString(),
                              type: 'user' as const,
                              content: `Analyze document: ${document.fileName}`,
                              timestamp: new Date()
                            };
                            setMessages(prev => [...prev, userMessage]);

                            try {
                              const response = await fetch(`/api/documents/${document.id}/analyze`, {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({ 
                                  query: `Please analyze the document "${document.fileName}" in detail. Focus on key financial metrics, investment terms, risks, opportunities, and strategic implications.`
                                })
                              });
                              
                              if (!response.ok) {
                                throw new Error('Failed to analyze document');
                              }
                              
                              const data = await response.json();
                              
                              const aiMessage = {
                                id: (Date.now() + 1).toString(),
                                type: 'ai' as const,
                                content: data.response || data.analysis,
                                timestamp: new Date(),
                                context: {
                                  dataSourcesUsed: [`Document: ${document.fileName}`],
                                  dealName: selectedDeal?.name || 'Unknown'
                                }
                              };

                              setMessages(prev => [...prev, aiMessage]);
                              
                              toast({
                                title: "Document Analysis Complete",
                                description: `Generated analysis for ${document.fileName}`,
                              });
                              
                            } catch (error) {
                              console.error('Document analysis error:', error);
                              toast({
                                title: "Analysis Failed",
                                description: "Failed to analyze document",
                                variant: "destructive"
                              });
                            }
                          }}
                          className="flex items-center gap-1"
                          title={document.fileName}
                        >
                          {document.fileName.toLowerCase().includes('.pdf') ? (
                            <FileText className="h-3 w-3" />
                          ) : document.fileName.toLowerCase().includes('.xlsx') || document.fileName.toLowerCase().includes('.xls') ? (
                            <BarChart3 className="h-3 w-3" />
                          ) : (
                            <FileText className="h-3 w-3" />
                          )}
                          <span className="max-w-[120px] truncate">{document.fileName}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] p-4 rounded-lg ${
                          message.type === 'user'
                            ? 'text-white'
                            : message.type === 'analysis'
                            ? 'bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200'
                            : 'bg-gray-50 border border-gray-200'
                        }`}
                        style={message.type === 'user' ? { backgroundColor: 'hsl(var(--primary))' } : {}}
                      >
                        {message.type !== 'user' && (
                          <div className="flex items-center gap-2 mb-2">
                            <Bot className="h-4 w-4 text-blue-600" />
                            <span className="text-xs font-medium text-gray-600">
                              {message.type === 'analysis' ? 'AI Investment Analysis' : 'AI Assistant'}
                            </span>
                          </div>
                        )}
                        
                        <div className={`text-sm ${message.type === 'user' ? 'text-white' : ''}`}>
                          <FormattedText 
                            content={message.content}
                          />
                        </div>
                        
                        {message.context && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Database className="h-3 w-3" />
                              <span>Sources: {message.context.dataSourcesUsed.join(', ')}</span>
                            </div>
                          </div>
                        )}
                        
                        <div className="mt-3 text-xs opacity-60">
                          {message.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                
                {aiAnalysisMutation.isPending && (
                  <div className="flex justify-start">
                    <div className="bg-gray-50 border border-gray-200 p-5 rounded-2xl max-w-[85%]">
                      <div className="flex items-center gap-2 mb-3">
                        <Bot className="h-5 w-5 text-blue-600" />
                        <span className="text-sm font-medium text-gray-700">AI Assistant</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Analyzing {selectedDeal?.name} deal data...
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div ref={messagesEndRef} />
            </ScrollArea>

            {/* Input Area */}
            <div className="p-6 border-t bg-gray-50">
              <div className="flex gap-3">
                <Textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={`Ask me anything about ${selectedDeal?.name || 'the selected deal'}...`}
                  className="flex-1 min-h-[50px] max-h-32 resize-none border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  disabled={aiAnalysisMutation.isPending}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || aiAnalysisMutation.isPending}
                  className="px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                AI analysis is based on {selectedDeal?.name}'s memos, documents, and financial data only.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
            <div className="mx-auto w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
              <Search className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Select a Deal to Begin</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Choose a deal from the dropdown above to start your AI-powered investment analysis. 
              The AI will analyze all available data for that specific deal.
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}