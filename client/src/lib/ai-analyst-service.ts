import { apiRequest, queryClient } from "@/lib/queryClient";
import { AiAnalysis } from "@shared/schema";

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

export const aiAnalystService = {
  /**
   * Fetches AI analysis for a specific deal
   */
  async getAnalysis(dealId: number): Promise<AiAnalysis | null> {
    try {
      const response = await apiRequest('GET', `/api/ai-analyst/${dealId}`);
      if (response.status === 404) {
        return null;
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching AI analysis:', error);
      return null;
    }
  },

  /**
   * Creates or updates AI analysis for a deal
   */
  async createOrUpdateAnalysis(dealId: number, analysisData: Partial<AiAnalysis>): Promise<AiAnalysis> {
    const response = await apiRequest('POST', `/api/ai-analyst/${dealId}`, analysisData);
    const data = await response.json();
    
    // Invalidate any existing queries for this deal's analysis
    queryClient.invalidateQueries({ queryKey: [`/api/ai-analyst/${dealId}`] });
    
    return data;
  },

  /**
   * Ask a question about a deal and get an AI-generated answer
   */
  async askQuestion(dealId: number, question: string): Promise<AiAnswer> {
    const response = await apiRequest('POST', `/api/ai-analyst/${dealId}/ask`, { question });
    return await response.json();
  },

  /**
   * Generate AI insights about a deal
   */
  async generateInsights(dealId: number): Promise<AiInsight[]> {
    const response = await apiRequest('POST', `/api/ai-analyst/${dealId}/insights`);
    return await response.json();
  }
};