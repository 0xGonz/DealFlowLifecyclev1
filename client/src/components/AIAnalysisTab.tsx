import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Bot, Send, FileText, Database, TrendingUp, Loader2, Brain, MessageSquare } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from "@/hooks/use-toast";

interface AIAnalysisTabProps {
  dealId: number;
  dealName: string;
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

export default function AIAnalysisTab({ dealId, dealName }: AIAnalysisTabProps) {
  const [messages, setMessages] = useState<AnalysisMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isGeneratingAnalysis, setIsGeneratingAnalysis] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get deal context to show available data
  const { data: contextData, isLoading: contextLoading } = useQuery({
    queryKey: ['/api/ai/deals', dealId, 'context'],
    enabled: !!dealId
  });

  // AI Analysis mutation
  const aiAnalysisMutation = useMutation({
    mutationFn: async ({ query }: { query?: string }) => {
      return apiRequest(`/api/ai/deals/${dealId}/analyze`, {
        method: 'POST',
        body: { query }
      });
    },
    onSuccess: (data) => {
      const aiMessage: AnalysisMessage = {
        id: `ai-${Date.now()}`,
        type: data.query ? 'ai' : 'analysis',
        content: data.analysis,
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

  const handleSendMessage = () => {
    if (!inputValue.trim() || aiAnalysisMutation.isPending) return;

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
    if (aiAnalysisMutation.isPending) return;

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
    <div className="flex flex-col h-full max-h-[800px]">
      {/* Header */}
      <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Brain className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">AI Analysis</h3>
              <p className="text-sm text-gray-600">Ask questions about {dealName}</p>
            </div>
          </div>
          
          <Button 
            onClick={handleGenerateAnalysis}
            disabled={aiAnalysisMutation.isPending || isGeneratingAnalysis}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {(aiAnalysisMutation.isPending || isGeneratingAnalysis) ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <TrendingUp className="h-4 w-4 mr-2" />
            )}
            Generate Analysis
          </Button>
        </div>

        {/* Data Context Summary */}
        {contextData?.summary && (
          <div className="mt-4 p-3 bg-white rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <Database className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Available Data Sources</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {contextData.summary.dataAvailable.memos > 0 && (
                <Badge variant="secondary" className="text-xs">
                  <FileText className="h-3 w-3 mr-1" />
                  {contextData.summary.dataAvailable.memos} Memos
                </Badge>
              )}
              {contextData.summary.dataAvailable.documents > 0 && (
                <Badge variant="secondary" className="text-xs">
                  <FileText className="h-3 w-3 mr-1" />
                  {contextData.summary.dataAvailable.documents} Documents
                </Badge>
              )}
              {contextData.summary.dataAvailable.extractedDataFiles > 0 && (
                <Badge variant="secondary" className="text-xs">
                  <Database className="h-3 w-3 mr-1" />
                  {contextData.summary.dataAvailable.extractedDataFiles} Data Files
                </Badge>
              )}
              {contextData.summary.dataAvailable.allocations > 0 && (
                <Badge variant="secondary" className="text-xs">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {contextData.summary.dataAvailable.allocations} Allocations
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">AI Analysis Ready</h4>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Ask me anything about this deal or generate a comprehensive investment analysis based on all available data.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setInputValue("What are the key risks in this investment?")}
                >
                  Key Risks
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setInputValue("Analyze the financial projections")}
                >
                  Financial Analysis
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setInputValue("What's the investment thesis?")}
                >
                  Investment Thesis
                </Button>
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
                      ? 'bg-blue-600 text-white'
                      : message.type === 'analysis'
                      ? 'bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200'
                      : 'bg-gray-50 border'
                  }`}
                >
                  {message.type !== 'user' && (
                    <div className="flex items-center gap-2 mb-2">
                      <Bot className="h-4 w-4 text-blue-600" />
                      <span className="text-xs font-medium text-gray-600">
                        {message.type === 'analysis' ? 'AI Investment Analysis' : 'AI Assistant'}
                      </span>
                    </div>
                  )}
                  
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {message.content}
                  </div>
                  
                  {message.context && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Database className="h-3 w-3" />
                        <span>Sources: {message.context.dataSourcesUsed.join(', ')}</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-2 text-xs opacity-60">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))
          )}
          
          {aiAnalysisMutation.isPending && (
            <div className="flex justify-start">
              <div className="bg-gray-50 border p-4 rounded-lg max-w-[80%]">
                <div className="flex items-center gap-2 mb-2">
                  <Bot className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-medium text-gray-600">AI Assistant</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing deal data...
                </div>
              </div>
            </div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 border-t bg-gray-50">
        <div className="flex gap-2">
          <Textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about this deal..."
            className="flex-1 min-h-[44px] max-h-32 resize-none"
            disabled={aiAnalysisMutation.isPending}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || aiAnalysisMutation.isPending}
            className="px-3"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          AI analysis is based on this deal's memos, documents, and financial data only.
        </p>
      </div>
    </div>
  );
}