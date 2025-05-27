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

          {/* Deal Selector at Top */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Select Deal for Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-w-md">
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
              </div>
            </CardContent>
          </Card>
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
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Panel - Deal Context & Documents */}
            <div className="lg:col-span-1 space-y-4">

            {/* Deal Context */}
            {selectedDeal && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Deal Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <h3 className="font-semibold">{selectedDeal.name}</h3>
                    <p className="text-sm text-gray-600">{selectedDeal.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="secondary">{selectedDeal.sector}</Badge>
                    <Badge variant="outline">{selectedDeal.stageLabel}</Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            {selectedDealId && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Quick Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button 
                    onClick={handleGenerateAnalysis}
                    disabled={isGeneratingAnalysis}
                    className="w-full"
                    variant="outline"
                  >
                    {isGeneratingAnalysis ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Brain className="h-4 w-4 mr-2" />
                        Investment Thesis
                      </>
                    )}
                  </Button>
                  
                  {/* Document Analysis Buttons */}
                  {Array.isArray(documents) && documents.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-700">Analyze Documents:</h4>
                      <div className="flex flex-wrap gap-1">
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
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Panel - Chat Interface */}
          <div className="lg:col-span-3">
            <Card className="h-[calc(100vh-200px)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  AI Analysis Chat
                  {selectedDeal && <Badge variant="secondary">{selectedDeal.name}</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col h-full p-0">
                {/* Messages Area */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {!selectedDealId ? (
                      <div className="text-center py-8">
                        <Search className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-500 mb-2">Select a Deal to Start</h3>
                        <p className="text-gray-400">Choose a deal from the dropdown to begin AI analysis</p>
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="text-center py-8">
                        <Bot className="h-12 w-12 mx-auto text-blue-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-700 mb-2">Ready for Analysis</h3>
                        <p className="text-gray-500">Ask questions about {selectedDeal?.name} or generate a comprehensive analysis</p>
                      </div>
                    ) : (
                      messages.map((message: AnalysisMessage) => (
                        <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] p-3 rounded-lg ${
                            message.type === 'user' 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-gray-100 text-gray-900'
                          }`}>
                            {message.type === 'user' ? (
                              <p>{message.content}</p>
                            ) : (
                              <FormattedText content={message.content} />
                            )}
                            {message.context && (
                              <div className="mt-2 pt-2 border-t border-gray-200/20">
                                <p className="text-xs opacity-75">
                                  Sources: {message.context.dataSourcesUsed.join(', ')}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                    
                    {isGeneratingAnalysis && (
                      <div className="flex justify-start">
                        <div className="bg-gray-100 p-3 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Analyzing...</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div ref={messagesEndRef} />
                </ScrollArea>

                {/* Input Area */}
                {selectedDealId && (
                  <div className="border-t p-4">
                    <div className="flex gap-2">
                      <Textarea
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder={`Ask a question about ${selectedDeal?.name}...`}
                        className="flex-1 min-h-[44px] max-h-32"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                      />
                      <Button 
                        onClick={handleSendMessage}
                        disabled={!inputValue.trim() || isGeneratingAnalysis}
                        size="lg"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        )}
      </div>
    </AppLayout>
  );
}