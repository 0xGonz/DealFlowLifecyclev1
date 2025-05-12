import OpenAI from 'openai';
import { Deal, Document, MiniMemo } from '@shared/schema';
import { PdfExtractionService } from './pdf-extraction-lazy';

// Helper function to get stage label
function getStageLabel(stage: string): string {
  const stageMappings: Record<string, string> = {
    'initial_review': 'Initial Review',
    'screening': 'Screening',
    'diligence': 'Diligence',
    'ai_review': 'AI Review',
    'ic_review': 'IC Review',
    'closing': 'Closing',
    'closed': 'Closed',
    'invested': 'Invested',
    'rejected': 'Rejected'
  };
  return stageMappings[stage] || stage;
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

interface AiAnswer {
  text: string;
  sources?: {
    type: string;
    id: number;
    name: string;
  }[];
}

export class OpenAiService {
  static async generateInsights(
    deal: Deal,
    documents: Document[] = [],
    memos: MiniMemo[] = []
  ): Promise<AiInsight[]> {
    try {
      // Prepare the context from the deal and documents
      let context = `Deal Name: ${deal.name}\n`;
      context += `Description: ${deal.description || 'No description'}\n`;
      context += `Sector: ${deal.sector || 'Unspecified'}\n`;
      context += `Stage: ${getStageLabel(deal.stage)}\n`;
      context += `Target Return: ${deal.targetReturn || 'Not specified'}\n`;
      
      if (deal.notes) {
        context += `Notes: ${deal.notes}\n`;
      }

      // Add document information
      if (documents.length > 0) {
        context += `\nDocument Summary:\n`;
        
        // First list all documents with their metadata
        documents.forEach(doc => {
          context += `- ${doc.fileName}: ${doc.description || 'No description'}\n`;
        });
        
        // For PDF files, attempt to extract the content
        const pdfDocs = documents.filter(doc => 
          doc.fileType === 'application/pdf' && doc.filePath
        );
        
        // Add PDF content if available
        if (pdfDocs.length > 0) {
          context += `\nPDF Content:\n`;
          
          // Process each PDF (we'll do this sequentially to avoid hitting API rate limits)
          for (const doc of pdfDocs) {
            try {
              // Note: In a production system, this should be done asynchronously
              // or pre-processed and cached to avoid delaying the API response
              const pdfText = await PdfExtractionService.extractText(doc.filePath);
              
              if (pdfText && pdfText.trim()) {
                context += `\n--- Content from ${doc.fileName} ---\n`;
                // Limit PDF text to a reasonable size to avoid token limit issues
                context += pdfText.substring(0, 8000) + (pdfText.length > 8000 ? '...(truncated)' : '');
                context += `\n--- End of ${doc.fileName} ---\n`;
              }
            } catch (error: any) {
              console.error(`Error extracting PDF content from ${doc.fileName}:`, error);
              context += `\nCould not extract content from ${doc.fileName}: ${error.message || 'Processing error'}\n`;
            }
          }
        }
      }

      // Add memos information
      if (memos.length > 0) {
        context += `\nMemo Summary:\n`;
        memos.forEach(memo => {
          // Mini memo doesn't have title/content fields in our schema, use available fields instead
          context += `- ${memo.thesis || 'Memo'}: Summary not available\n`;
        });
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: `You are an AI investment analyst assistant. Analyze the investment deal information provided and generate 3-5 key insights. 
            Each insight should have a concise title, detailed content explaining the insight, and a confidence score between 0 and 1.
            Focus on aspects like market opportunity, competitive advantages, risk assessment, financial projections, and strategic fit.
            Respond in JSON format with an array of objects, each containing 'title', 'content', and 'confidence' fields.`
          },
          {
            role: "user",
            content: context
          }
        ],
        response_format: { type: "json_object" }
      });

      // Parse the response and handle potential null content
      const content = response.choices[0].message.content as string || '{"insights":[]}';
      const result = JSON.parse(content);
      
      // Ensure we have the expected format and return
      if (Array.isArray(result.insights)) {
        return result.insights;
      } else if (Array.isArray(result)) {
        return result;
      }
      
      // Fallback if the format is unexpected
      return [
        {
          title: "Analysis Complete",
          content: "We've analyzed the available information but couldn't structure the results. Please review the deal details directly.",
          confidence: 0.5
        }
      ];
    } catch (error) {
      console.error("Error generating AI insights:", error);
      
      // Return a fallback insight
      return [
        {
          title: "Analysis Error",
          content: "We encountered an error while analyzing this deal. This could be due to API limits or connection issues. Please try again later.",
          confidence: 0.1
        }
      ];
    }
  }

  static async answerQuestion(
    question: string,
    deal: Deal,
    documents: Document[] = [],
    memos: MiniMemo[] = []
  ): Promise<AiAnswer> {
    try {
      // Prepare the context from the deal and documents
      let context = `Deal Name: ${deal.name}\n`;
      context += `Description: ${deal.description || 'No description'}\n`;
      context += `Sector: ${deal.sector || 'Unspecified'}\n`;
      context += `Stage: ${getStageLabel(deal.stage)}\n`;
      context += `Target Return: ${deal.targetReturn || 'Not specified'}\n`;
      
      if (deal.notes) {
        context += `Notes: ${deal.notes}\n`;
      }

      // Add document information
      let documentContext = '';
      if (documents.length > 0) {
        documentContext += `\nRelated Documents:\n`;
        
        // First list all documents with their metadata
        documents.forEach(doc => {
          documentContext += `- ${doc.fileName}: ${doc.description || 'No description'}\n`;
        });
        
        // For PDF files, attempt to extract the content
        const pdfDocs = documents.filter(doc => 
          doc.fileType === 'application/pdf' && doc.filePath
        );
        
        // Add PDF content if available
        if (pdfDocs.length > 0) {
          documentContext += `\nPDF Content:\n`;
          
          // Process each PDF (we'll do this sequentially to avoid hitting API rate limits)
          for (const doc of pdfDocs) {
            try {
              // Extract PDF text content
              const pdfText = await PdfExtractionService.extractText(doc.filePath);
              
              if (pdfText && pdfText.trim()) {
                documentContext += `\n--- Content from ${doc.fileName} ---\n`;
                // Limit PDF text to a reasonable size to avoid token limit issues
                documentContext += pdfText.substring(0, 8000) + (pdfText.length > 8000 ? '...(truncated)' : '');
                documentContext += `\n--- End of ${doc.fileName} ---\n`;
              }
            } catch (error: any) {
              console.error(`Error extracting PDF content from ${doc.fileName}:`, error);
              documentContext += `\nCould not extract content from ${doc.fileName}: ${error.message || 'Processing error'}\n`;
            }
          }
        }
      }

      // Add memos information
      let memoContext = '';
      if (memos.length > 0) {
        memoContext += `\nRelated Memos:\n`;
        memos.forEach(memo => {
          memoContext += `- Thesis: ${memo.thesis}\n`;
          if (memo.risksAndMitigations) {
            memoContext += `  Risks and Mitigations: ${memo.risksAndMitigations}\n`;
          }
          if (memo.pricingConsideration) {
            memoContext += `  Pricing Considerations: ${memo.pricingConsideration}\n`;
          }
        });
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: `You are an AI investment analyst assistant. Answer the user's question based on the deal information provided.
            Be specific, accurate, and concise. If you can't answer with high confidence, acknowledge the limitations in your response.
            Reference specific documents or memos if they're relevant to your answer.
            Respond in JSON format with 'text' containing your answer and optionally 'sources' array listing references to specific documents or memos.`
          },
          {
            role: "user",
            content: `Deal Information:\n${context}\n${documentContext}\n${memoContext}\n\nQuestion: ${question}`
          }
        ],
        response_format: { type: "json_object" }
      });

      // Parse the response and handle potential null content
      const content = response.choices[0].message.content as string || '{"text":"No content generated"}';
      const result = JSON.parse(content);
      
      // Return formatted answer
      return {
        text: result.text || "I couldn't generate an answer to your question.",
        sources: result.sources || []
      };
    } catch (error) {
      console.error("Error answering question with AI:", error);
      
      // Return a fallback answer
      return {
        text: "I encountered an error while processing your question. This could be due to API limits or connection issues. Please try again later."
      };
    }
  }
}