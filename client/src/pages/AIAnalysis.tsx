import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bot, Send, FileText, TrendingDown, Calculator, Target, Loader2, Brain, Sparkles } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import FormattedText from "@/components/common/FormattedText";
import AppLayout from "@/components/layout/AppLayout";
import { useAIAnalysis, Deal, AnalysisMessage } from "@/hooks/useAIAnalysis";

export default function AIAnalysis() {
  const [selectedDealId, setSelectedDealId] = useState<number | null>(null);
  
  // Fetch all deals for the dropdown
  const { data: deals = [], isLoading: dealsLoading } = useQuery<Deal[]>({
    queryKey: ['/api/deals'],
  });

  // Get the selected deal
  const selectedDeal = deals.find(deal => deal.id === selectedDealId);

  // Use the shared AI Analysis hook
  const {
    messages,
    inputValue,
    setInputValue,
    sendMessage,
    generateAnalysis,
    clearMessages,
    messagesEndRef,
    isGeneratingAnalysis,
    contextData,
    contextLoading
  } = useAIAnalysis({
    dealId: selectedDealId || undefined,
    dealName: selectedDeal?.name,
    persistMessages: false
  });

  // Fetch documents for the selected deal
  const { data: documents = [], isLoading: documentsLoading } = useQuery({
    queryKey: [`/api/documents/deal/${selectedDealId}`],
    enabled: !!selectedDealId
  });

  const handleSendMessage = () => {
    if (!inputValue.trim() || isGeneratingAnalysis || !selectedDealId) return;
    sendMessage();
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    setTimeout(() => {
      sendMessage(suggestion);
    }, 100);
  };

  const handleDocumentAnalysis = async (document: any) => {
    if (!selectedDealId) return;
    
    const analysisQuery = `Please analyze the document "${document.fileName}" in detail. Focus on key financial metrics, investment terms, risks, opportunities, and strategic implications.`;
    await sendMessage(analysisQuery);
  };

  // Suggestion boxes for quick actions
  const suggestions = [
    {
      icon: TrendingDown,
      title: "Investment Risks",
      description: "Analyze potential risks and mitigation strategies",
      query: "What are the key investment risks for this deal and how can they be mitigated?"
    },
    {
      icon: Calculator,
      title: "Financial Analysis",
      description: "Review financial metrics and projections",
      query: "Provide a detailed financial analysis including key metrics, projections, and valuation assessment."
    },
    {
      icon: Target,
      title: "Investment Thesis",
      description: "Generate comprehensive investment thesis",
      query: "Create a comprehensive investment thesis outlining the opportunity, market position, and strategic rationale."
    }
  ];

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto h-full flex flex-col">
        {/* Header */}
        <div className="text-center py-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <Brain className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Investment Analyst</h1>
          <p className="text-gray-600 mb-6">Get comprehensive AI-powered insights for your investment deals</p>
          
          {/* Deal Selection */}
          <div className="max-w-md mx-auto">
            <Select
              value={selectedDealId?.toString() || ""}
              onValueChange={(value) => {
                const dealId = parseInt(value);
                setSelectedDealId(dealId);
                clearMessages();
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a deal to analyze..." />
              </SelectTrigger>
              <SelectContent>
                {deals.map((deal) => (
                  <SelectItem key={deal.id} value={deal.id.toString()}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{deal.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {deal.sector}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border">
          {/* Messages */}
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-6">
              {messages.length === 0 ? (
                <div className="space-y-8">
                  {/* Welcome Message */}
                  {selectedDeal && (
                    <div className="text-center">
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full">
                        <Sparkles className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-900">
                          Analyzing {selectedDeal.name}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Document Analysis Cards */}
                  {selectedDealId && documents.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-center text-gray-700">Available Documents</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {documents.map((doc: any) => (
                          <Card 
                            key={doc.id} 
                            className="cursor-pointer hover:shadow-md transition-shadow bg-gradient-to-br from-gray-50 to-white border border-gray-200"
                            onClick={() => handleDocumentAnalysis(doc)}
                          >
                            <CardContent className="p-4 flex items-center gap-3">
                              <div className="p-2 bg-blue-100 rounded-lg">
                                <FileText className="h-5 w-5 text-blue-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm text-gray-900 truncate">{doc.fileName}</p>
                                <p className="text-xs text-gray-500">{doc.fileType}</p>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggestion Cards */}
                  {selectedDealId && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-center text-gray-700">Quick Analysis</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {suggestions.map((suggestion, index) => (
                          <Card 
                            key={index}
                            className="cursor-pointer hover:shadow-md transition-shadow bg-gradient-to-br from-white to-gray-50 border border-gray-200"
                            onClick={() => handleSuggestionClick(suggestion.query)}
                          >
                            <CardContent className="p-5 text-center">
                              <div className="p-3 bg-blue-100 rounded-full w-fit mx-auto mb-3">
                                <suggestion.icon className="h-6 w-6 text-blue-600" />
                              </div>
                              <h3 className="font-semibold text-gray-900 mb-2">{suggestion.title}</h3>
                              <p className="text-sm text-gray-600">{suggestion.description}</p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {!selectedDealId && (
                    <div className="text-center py-12">
                      <Bot className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-xl font-medium text-gray-500 mb-2">Select a Deal to Begin</h3>
                      <p className="text-gray-400">
                        Choose a deal from the dropdown above to start your AI analysis.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                messages.map((message, index) => (
                  <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      message.role === 'user' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      {message.role === 'assistant' ? (
                        <FormattedText content={typeof message.content === 'string' ? message.content : JSON.stringify(message.content)} />
                      ) : (
                        <p className="text-sm">{message.content}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
              
              {isGeneratingAnalysis && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-2xl px-4 py-3 max-w-[85%]">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                      <span className="text-sm text-gray-600">AI is analyzing...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div ref={messagesEndRef} />
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 border-t bg-gray-50">
            <div className="flex gap-3">
              <Textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={selectedDeal ? `Ask about ${selectedDeal.name}...` : "Select a deal first..."}
                className="flex-1 min-h-[60px] resize-none border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={!selectedDealId || isGeneratingAnalysis}
              />
              <Button 
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isGeneratingAnalysis || !selectedDealId}
                className="self-end bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}