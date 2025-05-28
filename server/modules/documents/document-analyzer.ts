import { DocumentService } from './service';
import OpenAI from 'openai';

export interface AnalysisRequest {
  dealId: number;
  query?: string;
  userId: number;
}

export interface AnalysisResult {
  analysis: string;
  context: {
    dealName: string;
    dealId: number;
    dataSourcesUsed: string[];
    documentCount: number;
    documentsProcessed: number;
    timestamp: Date;
  };
}

export interface DocumentContent {
  documentId: number;
  fileName: string;
  content: string;
  extractedLength: number;
}

export class DocumentAnalyzer {
  private openai: OpenAI;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  /**
   * Extract content from all deal documents
   */
  async extractDealDocuments(dealId: number): Promise<DocumentContent[]> {
    const documents = await DocumentService.getDocumentsByDeal(dealId);
    const documentContents: DocumentContent[] = [];

    console.log(`📄 Processing ${documents.length} documents for deal ${dealId}`);

    for (const doc of documents) {
      try {
        const content = await DocumentService.extractPdfContent(doc.filePath);
        
        if (content && content.trim().length > 0) {
          documentContents.push({
            documentId: doc.id,
            fileName: doc.fileName,
            content: content.trim(),
            extractedLength: content.length
          });
          
          console.log(`✅ Extracted ${content.length} chars from ${doc.fileName}`);
        } else {
          console.warn(`⚠️ No content extracted from ${doc.fileName}`);
        }
      } catch (error) {
        console.error(`❌ Failed to extract content from ${doc.fileName}:`, error);
      }
    }

    return documentContents;
  }

  /**
   * Validate that we have sufficient authentic data for analysis
   */
  validateAnalysisData(documentContents: DocumentContent[], deal: any): void {
    if (!deal) {
      throw new Error('Deal not found');
    }

    if (documentContents.length === 0) {
      throw new Error(`No authentic document content available for analysis of "${deal.name}". Please upload investment documents to enable AI analysis.`);
    }

    const totalContent = documentContents.reduce((sum, doc) => sum + doc.extractedLength, 0);
    if (totalContent < 100) {
      throw new Error(`Insufficient document content for reliable analysis. Only ${totalContent} characters extracted from uploaded documents.`);
    }

    console.log(`✅ Analysis validation passed: ${documentContents.length} documents, ${totalContent} total characters`);
  }

  /**
   * Create analysis prompt from authentic deal and document data
   */
  createAnalysisPrompt(deal: any, documentContents: DocumentContent[], userQuery?: string): string {
    const documents = documentContents.map(doc => ({
      fileName: doc.fileName,
      content: doc.content.substring(0, 8000) // Reasonable limit per document
    }));

    const prompt = `Please analyze this investment opportunity based on the provided authentic documents and deal information.

**Deal Information:**
- Name: ${deal.name}
- Sector: ${deal.sector || 'Not specified'}
- Stage: ${deal.stage || 'Not specified'}
- Target Return: ${deal.targetReturn || 'Not specified'}
- Description: ${deal.description || 'Not specified'}

**Available Documents (${documents.length} authentic documents):**
${documents.map((doc, index) => `
${index + 1}. **${doc.fileName}**
Content: ${doc.content}
`).join('\n')}

${userQuery ? `**Specific Analysis Request:** ${userQuery}` : '**Request:** Provide a comprehensive investment analysis covering key strengths, risks, financial projections, and investment recommendation.'}

Please provide a detailed analysis based solely on the information contained in these authentic documents and deal data. If any critical information is missing from the provided documents, please note what additional documentation would be helpful.`;

    return prompt;
  }

  /**
   * Perform AI analysis with authentic data only
   */
  async performAnalysis(request: AnalysisRequest, deal: any, documentContents: DocumentContent[]): Promise<AnalysisResult> {
    const prompt = this.createAnalysisPrompt(deal, documentContents, request.query);
    
    console.log(`🤖 Sending analysis request to OpenAI for deal ${request.dealId}`);
    console.log(`📊 Prompt length: ${prompt.length} characters`);

    try {
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an expert investment analyst. Provide detailed, professional analysis based solely on the provided authentic investment documents and deal information. Be specific about what data supports your conclusions.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.3
      });

      const analysis = response.choices[0]?.message?.content || 'Analysis could not be completed.';
      
      return {
        analysis,
        context: {
          dealName: deal.name,
          dealId: request.dealId,
          dataSourcesUsed: documentContents.map(doc => doc.fileName),
          documentCount: documentContents.length,
          documentsProcessed: documentContents.length,
          timestamp: new Date()
        }
      };
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error('Failed to complete AI analysis. Please ensure OpenAI API key is configured correctly.');
    }
  }
}