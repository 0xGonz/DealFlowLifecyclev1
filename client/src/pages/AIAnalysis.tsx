import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bot, Send, FileText, Database, TrendingUp, Loader2, Brain, Search, Sparkles, BarChart3, MessageSquare, DollarSign, Trash2 } from 'lucide-react';
import { Input } from "@/components/ui/input";
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
      <div className="pt-2 sm:pt-4 px-2 sm:px-4 md:px-6 pb-20 w-full overflow-hidden">
        {/* Header Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Brain className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold">AI Analysis</h1>
                <p className="text-gray-600">Get comprehensive AI-powered insights and analysis for your investment deals</p>
              </div>
            </div>
          </div>

          {/* Deal Selection and Overview Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* Deal Selection */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Database className="h-4 w-4" />
                  Select Deal for Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <Select 
                  value={selectedDealId?.toString() || ""} 
                  onValueChange={(value) => setSelectedDealId(parseInt(value))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a deal to analyze..." />
                  </SelectTrigger>
                  <SelectContent>
                    {deals.map((deal) => (
                      <SelectItem key={deal.id} value={deal.id.toString()}>
                        <div>
                          <div className="font-medium">{deal.name}</div>
                          <div className="text-xs text-gray-500">{deal.sector} • {deal.stageLabel}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Deal Overview */}
            {selectedDeal && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4" />
                    Deal Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-gray-900">{selectedDeal.name}</h3>
                    <p className="text-sm text-gray-600 line-clamp-2">{selectedDeal.description}</p>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-full">
                        {selectedDeal.sector}
                      </span>
                      <span className="text-gray-500">Target: {selectedDeal.targetReturn}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {!selectedDealId ? (
          <Card className="text-center py-12">
            <CardContent>
              <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Deal to Begin</h3>
              <p className="text-gray-600">Choose a deal from the dropdown above to start AI analysis and chat.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="w-full">
            {/* Main Chat Interface */}
            <Card className="h-[600px] flex flex-col">
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    AI Analysis Chat
                  </CardTitle>
                  
                  {/* Quick Analysis Icons - Inside Chat Header */}
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handleGenerateAnalysis}
                      disabled={isGeneratingAnalysis}
                      size="sm"
                      variant="outline"
                      className="flex items-center gap-1"
                    >
                      {isGeneratingAnalysis ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Brain className="h-4 w-4" />
                      )}
                      <span className="hidden sm:inline">Investment Thesis</span>
                    </Button>
                    
                    <Button
                      onClick={() => sendMessage("What are the key risks and opportunities for this deal?")}
                      disabled={isGeneratingAnalysis}
                      size="sm"
                      variant="outline"
                      className="flex items-center gap-1"
                    >
                      <TrendingUp className="h-4 w-4" />
                      <span className="hidden sm:inline">Risks & Opps</span>
                    </Button>

                    <Button
                      onClick={() => sendMessage("Analyze the financial metrics and returns for this investment.")}
                      disabled={isGeneratingAnalysis}
                      size="sm"
                      variant="outline"
                      className="flex items-center gap-1"
                    >
                      <DollarSign className="h-4 w-4" />
                      <span className="hidden sm:inline">Financials</span>
                    </Button>

                    <Button
                      onClick={clearMessages}
                      size="sm"
                      variant="ghost"
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Context Info Bar */}
                {contextLoading ? (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading deal context...
                  </div>
                ) : contextData && (
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      {contextData.memos?.length || 0} memos
                    </div>
                    <div className="flex items-center gap-1">
                      <Database className="h-4 w-4" />
                      {contextData.documents?.length || 0} documents
                    </div>
                    <div className="flex items-center gap-1">
                      <BarChart3 className="h-4 w-4" />
                      {contextData.dataTypes?.length || 0} data files
                    </div>
                  </div>
                )}
              </CardHeader>

              {/* Chat Messages Area */}
              <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-4">
                    {messages.length === 0 ? (
                      <div className="text-center py-8">
                        <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Start Your AI Analysis</h3>
                        <p className="text-gray-600 mb-4">Use the quick analysis buttons above or ask any question about this deal.</p>
                        
                        {/* Document Analysis Buttons */}
                        {Array.isArray(documents) && documents.length > 0 && (
                          <div className="mt-6">
                            <h4 className="text-sm font-medium text-gray-700 mb-3">Or analyze specific documents:</h4>
                            <div className="flex flex-wrap gap-2 justify-center">
                              {documents.map((document: any) => (
                                <Button
                                  key={document.id}
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDocumentAnalysis(document)}
                                  disabled={isGeneratingAnalysis}
                                  className="flex items-center gap-1"
                                  title={document.fileName}
                                >
                                  {document.fileName.toLowerCase().includes('.pdf') ? (
                                    <FileText className="h-3 w-3" />
                                  ) : (
                                    <Database className="h-3 w-3" />
                                  )}
                                  {document.fileName.length > 20 ? 
                                    `${document.fileName.substring(0, 20)}...` : 
                                    document.fileName
                                  }
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      messages.map((message: AnalysisMessage, index: number) => (
                        <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] rounded-lg p-3 ${
                            message.role === 'user' 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-gray-100 text-gray-900'
                          }`}>
                            {message.role === 'user' ? (
                              <p>{message.content}</p>
                            ) : (
                              <FormattedText content={message.content} />
                            )}
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
              </CardContent>

              {/* Chat Input */}
              <div className="border-t p-4">
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Ask me anything about this deal..."
                    disabled={isGeneratingAnalysis}
                    className="flex-1"
                  />
                  <Button 
                    type="submit" 
                    disabled={!inputValue.trim() || isGeneratingAnalysis}
                    size="sm"
                  >
                    {isGeneratingAnalysis ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </form>
              </div>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}