import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bot, Send, FileText, Database, TrendingUp, Loader2, Brain, Search, Sparkles, BarChart3 } from 'lucide-react';
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

  const handleGenerateAnalysis = () => {
    if (!selectedDealId) return;
    generateAnalysis();
  };

  const handleDocumentAnalysis = async (document: any) => {
    if (!selectedDealId) return;
    
    const analysisQuery = `Please analyze the document "${document.fileName}" in detail. Focus on key financial metrics, investment terms, risks, opportunities, and strategic implications.`;
    await sendMessage(analysisQuery);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Brain className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AI Investment Analysis</h1>
              <p className="text-gray-600">Analyze deals with AI-powered insights</p>
            </div>
          </div>
          
          {/* Deal Selection */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Deal for Analysis
              </label>
              <Select
                value={selectedDealId?.toString() || ""}
                onValueChange={(value) => {
                  const dealId = parseInt(value);
                  setSelectedDealId(dealId);
                  clearMessages();
                }}
              >
                <SelectTrigger className="w-full max-w-md">
                  <SelectValue placeholder="Choose a deal to analyze..." />
                </SelectTrigger>
                <SelectContent>
                  {deals.map((deal) => (
                    <SelectItem key={deal.id} value={deal.id.toString()}>
                      <div className="flex items-center justify-between w-full">
                        <span className="font-medium">{deal.name}</span>
                        <div className="flex items-center gap-2 ml-4">
                          <Badge variant="outline" className="text-xs">
                            {deal.sector}
                          </Badge>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedDeal && (
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border">
                <h3 className="font-semibold text-blue-900">{selectedDeal.name}</h3>
                <p className="text-blue-700 text-sm mt-1">{selectedDeal.description}</p>
                <div className="flex gap-2 mt-3">
                  <Badge variant="outline">{selectedDeal.sector}</Badge>
                  <Badge variant="secondary">{selectedDeal.stageLabel}</Badge>
                  {selectedDeal.targetReturn && (
                    <Badge variant="default">Target: {selectedDeal.targetReturn}</Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {selectedDealId && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Documents Section */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold">Documents</h2>
              </div>
              
              {documentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                </div>
              ) : documents.length > 0 ? (
                <div className="space-y-3">
                  {documents.map((doc: any) => (
                    <div key={doc.id} className="p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{doc.fileName}</p>
                          <p className="text-xs text-gray-500">{doc.fileType}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDocumentAnalysis(doc)}
                          disabled={isGeneratingAnalysis}
                          className="text-xs"
                        >
                          <Search className="h-3 w-3 mr-1" />
                          Analyze
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No documents available</p>
              )}
            </div>

            {/* AI Chat Section */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-blue-600" />
                    <h2 className="text-lg font-semibold">AI Analysis Chat</h2>
                  </div>
                  <Button
                    onClick={handleGenerateAnalysis}
                    disabled={isGeneratingAnalysis || !selectedDealId}
                    variant="outline"
                    size="sm"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    {isGeneratingAnalysis ? 'Analyzing...' : 'Generate Analysis'}
                  </Button>
                </div>
              </div>

              {/* Messages Area */}
              <ScrollArea className="h-96 p-6">
                <div className="space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center py-12">
                      <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">AI Analysis Ready</h3>
                      <p className="text-gray-500 mb-4">
                        Start by generating an analysis or asking a specific question about {selectedDeal?.name}.
                      </p>
                    </div>
                  ) : (
                    messages.map((message, index) => (
                      <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-lg p-4 ${
                          message.role === 'user' 
                            ? 'bg-blue-600 text-white ml-4' 
                            : 'bg-gray-100 text-gray-900 mr-4'
                        }`}>
                          {message.role === 'assistant' ? (
                            <FormattedText content={message.content} />
                          ) : (
                            <p className="text-sm">{message.content}</p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                  
                  {isGeneratingAnalysis && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 rounded-lg p-4 max-w-[80%] mr-4">
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
              <div className="p-6 border-t">
                <div className="flex gap-3">
                  <Textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={selectedDeal ? `Ask about ${selectedDeal.name}...` : "Select a deal first..."}
                    className="flex-1 min-h-[80px] resize-none"
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
                    className="self-end"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {!selectedDealId && (
          <Card>
            <CardContent className="p-12 text-center">
              <Brain className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Select a Deal to Begin</h2>
              <p className="text-gray-600">
                Choose a deal from the dropdown above to start your AI-powered analysis.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}