import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

// Shared types for AI Analysis
export interface Deal {
  id: number;
  name: string;
  sector: string;
  stage: string;
  stageLabel: string;
  description: string;
  targetReturn?: string;
}

export interface AnalysisMessage {
  id: string;
  type: 'user' | 'ai' | 'analysis';
  content: string;
  timestamp: Date;
  role: 'user' | 'assistant'; // Added for OpenAI compatibility
  context?: AnalysisContext;
}

export interface AnalysisContext {
  dataSourcesUsed: string[];
  dealName: string;
  dealId?: number;
  timestamp?: Date;
}

export interface AIAnalysisHookOptions {
  dealId?: number;
  dealName?: string;
  autoFocus?: boolean;
  persistMessages?: boolean;
  onAnalysisComplete?: (analysis: any) => void;
  onError?: (error: Error) => void;
}

export function useAIAnalysis(options: AIAnalysisHookOptions = {}) {
  const { dealId, dealName, onAnalysisComplete, onError } = options;
  const [messages, setMessages] = useState<AnalysisMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isGeneratingAnalysis, setIsGeneratingAnalysis] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get deal context when dealId is provided
  const { data: contextData, isLoading: contextLoading } = useQuery({
    queryKey: ['/api/deals', dealId],
    enabled: !!dealId
  });

  // AI Analysis mutation
  const aiAnalysisMutation = useMutation({
    mutationFn: async ({ query, targetDealId }: { query?: string; targetDealId?: number }) => {
      const activeDealId = targetDealId || dealId;
      if (!activeDealId) {
        throw new Error('Please select a deal first');
      }
      
      const response = await fetch(`/api/v1/document-analysis/deals/${activeDealId}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to analyze deal');
      }
      
      return response.json();
    },
    onSuccess: (data: any) => {
      const aiMessage: AnalysisMessage = {
        id: `ai-${Date.now()}`,
        type: data.query ? 'ai' : 'analysis',
        content: data.analysis || data.response || data.content,
        timestamp: new Date(),
        role: 'assistant',
        context: data.context
      };
      
      setMessages(prev => [...prev, aiMessage]);
      setIsGeneratingAnalysis(false);
      
      if (onAnalysisComplete) {
        onAnalysisComplete(data);
      }

      toast({
        title: "Analysis Complete",
        description: `Generated ${data.query ? 'response' : 'comprehensive analysis'} for ${data.context?.dealName || 'deal'}`,
      });
    },
    onError: (error: any) => {
      setIsGeneratingAnalysis(false);
      
      if (onError) {
        onError(error);
      }

      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to generate AI analysis",
        variant: "destructive"
      });
    }
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Clear messages when deal changes
  useEffect(() => {
    if (dealId && !options.persistMessages) {
      setMessages([]);
    }
  }, [dealId, options.persistMessages]);

  // Send message function
  const sendMessage = async (messageText?: string, targetDealId?: number) => {
    const text = messageText || inputValue.trim();
    if (!text) return;

    // Add user message
    const userMessage: AnalysisMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: text,
      timestamp: new Date(),
      role: 'user'
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsGeneratingAnalysis(true);

    // Send to AI
    await aiAnalysisMutation.mutateAsync({ 
      query: text, 
      targetDealId: targetDealId || dealId 
    });
  };

  // Generate comprehensive analysis
  const generateAnalysis = async (targetDealId?: number) => {
    if (!targetDealId && !dealId) {
      toast({
        title: "No Deal Selected",
        description: "Please select a deal to analyze",
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingAnalysis(true);
    await aiAnalysisMutation.mutateAsync({ targetDealId: targetDealId || dealId });
  };

  // Clear conversation
  const clearMessages = () => {
    setMessages([]);
  };

  return {
    // State
    messages,
    inputValue,
    isGeneratingAnalysis,
    contextData,
    contextLoading,
    
    // Refs
    messagesEndRef,
    
    // Functions
    setInputValue,
    sendMessage,
    generateAnalysis,
    clearMessages,
    
    // Mutation state
    isAnalyzing: aiAnalysisMutation.isPending,
    analysisError: aiAnalysisMutation.error
  };
}