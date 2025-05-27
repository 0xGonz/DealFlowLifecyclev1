import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bot, Send, FileText, TrendingDown, Calculator, Target, Loader2, Brain } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import FormattedText from "@/components/common/FormattedText";
import AppLayout from "@/components/layout/AppLayout";
import { useAIAnalysis, Deal } from "@/hooks/useAIAnalysis";

export default function AIAnalysis() {
  const [selectedDealId, setSelectedDealId] = useState<number | null>(null);
  
  // Fetch all deals for the dropdown
  const { data: deals = [] } = useQuery<Deal[]>({
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
    clearMessages,
    messagesEndRef,
    isGeneratingAnalysis
  } = useAIAnalysis({
    dealId: selectedDealId || undefined,
    dealName: selectedDeal?.name,
    persistMessages: false
  });

  // Fetch documents for the selected deal
  const { data: documents = [] } = useQuery({
    queryKey: [`/api/documents/deal/${selectedDealId}`],
    enabled: !!selectedDealId
  });

  const handleSendMessage = () => {
    if (!inputValue.trim() || isGeneratingAnalysis || !selectedDealId) return;
    sendMessage();
  };

  const handleQuickAction = (query: string) => {
    setInputValue(query);
    setTimeout(() => sendMessage(query), 100);
  };

  const handleDocumentAnalysis = (document: any) => {
    if (!selectedDealId) return;
    const query = `Analyze the document "${document.fileName}" in detail.`;
    handleQuickAction(query);
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto h-full flex flex-col space-y-4">
        {/* Simple Header */}
        <div className="text-center py-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-3">AI Analysis</h1>
          <div className="max-w-sm mx-auto">
            <Select
              value={selectedDealId?.toString() || ""}
              onValueChange={(value) => {
                setSelectedDealId(parseInt(value));
                clearMessages();
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a deal..." />
              </SelectTrigger>
              <SelectContent>
                {deals.map((deal) => (
                  <SelectItem key={deal.id} value={deal.id.toString()}>
                    {deal.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Chat Container */}
        <div className="flex-1 bg-white rounded-lg border shadow-sm flex flex-col">
          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.length === 0 && selectedDealId ? (
                <div className="space-y-6">
                  {/* Documents */}
                  {documents.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-gray-700 text-center">Documents</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {documents.map((doc: any) => (
                          <button
                            key={doc.id}
                            onClick={() => handleDocumentAnalysis(doc)}
                            className="p-3 border rounded-lg hover:bg-gray-50 text-left"
                          >
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-blue-600" />
                              <span className="text-sm font-medium truncate">{doc.fileName}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quick Actions */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-gray-700 text-center">Quick Analysis</h3>
                    <div className="grid grid-cols-1 gap-2">
                      <button
                        onClick={() => handleQuickAction("What are the key investment risks?")}
                        className="p-3 border rounded-lg hover:bg-gray-50 text-left"
                      >
                        <div className="flex items-center gap-2">
                          <TrendingDown className="h-4 w-4 text-red-600" />
                          <span className="text-sm">Investment Risks</span>
                        </div>
                      </button>
                      <button
                        onClick={() => handleQuickAction("Provide a financial analysis.")}
                        className="p-3 border rounded-lg hover:bg-gray-50 text-left"
                      >
                        <div className="flex items-center gap-2">
                          <Calculator className="h-4 w-4 text-green-600" />
                          <span className="text-sm">Financial Analysis</span>
                        </div>
                      </button>
                      <button
                        onClick={() => handleQuickAction("Create an investment thesis.")}
                        className="p-3 border rounded-lg hover:bg-gray-50 text-left"
                      >
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-blue-600" />
                          <span className="text-sm">Investment Thesis</span>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-12">
                  <Brain className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">Select a deal to start analyzing</p>
                </div>
              ) : (
                messages.map((message, index) => (
                  <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-lg p-3 ${
                      message.type === 'user' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      {message.type === 'user' ? (
                        <p className="text-sm">{message.content}</p>
                      ) : (
                        <FormattedText 
                          content={
                            typeof message.content === 'object' && message.content !== null
                              ? (message.content as any).response || JSON.stringify(message.content)
                              : String(message.content)
                          } 
                        />
                      )}
                    </div>
                  </div>
                ))
              )}
              
              {isGeneratingAnalysis && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                      <span className="text-sm text-gray-600">Analyzing...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div ref={messagesEndRef} />
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={selectedDeal ? `Ask about ${selectedDeal.name}...` : "Select a deal first..."}
                className="flex-1 min-h-[60px] resize-none"
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
    </AppLayout>
  );
}