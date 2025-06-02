import OpenAI from 'openai';
import { StorageFactory } from '../../storage-factory';
import { DataExtractor } from '../../services/data-extractor';
import * as fs from 'fs';
import * as path from 'path';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface AnalysisRequest {
  dealId: number;
  query?: string;
  userId: number;
}

export interface DocumentContent {
  documentId: number;
  fileName: string;
  documentType: string;
  content: string;
  extractedData?: any;
}

export class DocumentAnalyzer {
  /**
   * Extract content from all documents for a deal
   */
  async extractDealDocuments(dealId: number): Promise<DocumentContent[]> {
    const storage = StorageFactory.getStorage();
    const documents = await storage.getDocumentsByDeal(dealId);
    const documentContents: DocumentContent[] = [];

    console.log(`📄 Extracting content from ${documents.length} documents for deal ${dealId}`);

    for (const doc of documents) {
      try {
        const content = await this.extractDocumentContent(doc);
        if (content) {
          documentContents.push({
            documentId: doc.id,
            fileName: doc.fileName,
            documentType: doc.documentType,
            content: content.content,
            extractedData: content.extractedData
          });
        }
      } catch (error) {
        console.error(`Failed to extract content from ${doc.fileName}:`, error);
      }
    }

    console.log(`✅ Successfully extracted content from ${documentContents.length} documents`);
    return documentContents;
  }

  /**
   * Extract content from a single document
   */
  private async extractDocumentContent(document: any): Promise<{ content: string; extractedData?: any } | null> {
    const extension = path.extname(document.fileName).toLowerCase();
    
    // Find the actual file path
    const UPLOAD_PATH = process.env.UPLOAD_PATH || './uploads';
    const possiblePaths = [
      path.resolve(UPLOAD_PATH, 'deals', document.dealId?.toString() || '', document.fileName),
      path.resolve(UPLOAD_PATH, document.dealId?.toString() || '', document.fileName),
      path.resolve(UPLOAD_PATH, document.fileName),
      path.resolve(document.filePath || '')
    ];
    
    let actualFilePath = null;
    for (const testPath of possiblePaths) {
      if (fs.existsSync(testPath)) {
        actualFilePath = testPath;
        break;
      }
    }

    if (!actualFilePath) {
      console.warn(`File not found for document: ${document.fileName}`);
      return null;
    }

    if (extension === '.pdf') {
      // Extract text content from PDF
      const pdfParse = await import('pdf-parse');
      const pdfBuffer = fs.readFileSync(actualFilePath);
      const pdfData = await pdfParse.default(pdfBuffer);
      
      return {
        content: pdfData.text,
        extractedData: {
          pages: pdfData.numpages,
          info: pdfData.info
        }
      };
    } else if (['.xlsx', '.xls', '.xlsm', '.csv'].includes(extension)) {
      // Extract structured data from Excel/CSV
      const data = await DataExtractor.extractData(actualFilePath, document.fileName);
      const summary = DataExtractor.formatForAI(data);
      
      return {
        content: summary,
        extractedData: data
      };
    } else if (['.txt', '.md'].includes(extension)) {
      // Read text files directly
      const content = fs.readFileSync(actualFilePath, 'utf-8');
      return { content };
    }

    return null;
  }

  /**
   * Validate that we have sufficient data for analysis
   */
  validateAnalysisData(documentContents: DocumentContent[], deal: any): void {
    if (documentContents.length === 0) {
      console.warn(`No document content available for ${deal.name}, proceeding with deal-level analysis only`);
    }
  }

  /**
   * Perform AI analysis on the provided documents
   */
  async performAnalysis(
    request: AnalysisRequest, 
    deal: any, 
    documentContents: DocumentContent[]
  ): Promise<any> {
    const { query, dealId } = request;

    // Build the context for AI analysis
    let analysisPrompt = `You are an expert investment analyst. Analyze the following deal and documents:\n\n`;
    
    // Add deal information
    analysisPrompt += `DEAL: ${deal.name}\n`;
    analysisPrompt += `Sector: ${deal.sector}\n`;
    analysisPrompt += `Stage: ${deal.stage}\n`;
    analysisPrompt += `Description: ${deal.description || 'No description'}\n`;
    if (deal.targetReturn) analysisPrompt += `Target Return: ${deal.targetReturn}\n`;
    if (deal.valuation) analysisPrompt += `Valuation: ${deal.valuation}\n`;
    analysisPrompt += `\n`;

    // Add document contents if available
    if (documentContents.length > 0) {
      analysisPrompt += `DOCUMENTS (${documentContents.length}):\n\n`;
      documentContents.forEach((doc, index) => {
        analysisPrompt += `Document ${index + 1}: ${doc.fileName} (${doc.documentType})\n`;
        analysisPrompt += `Content:\n${doc.content}\n\n`;
      });
    } else {
      analysisPrompt += `NOTE: No document content available for detailed analysis. Analysis will be based on available deal information only.\n\n`;
    }

    // Add specific query or default analysis request
    const analysisQuery = query || 
      `Provide a comprehensive investment analysis including:
      1. Investment thesis and opportunity
      2. Key financial metrics and projections
      3. Risk assessment and mitigation strategies
      4. Market opportunity and competitive positioning
      5. Management team evaluation
      6. Overall recommendation with rationale`;

    analysisPrompt += `\nANALYSIS REQUEST: ${analysisQuery}\n`;
    analysisPrompt += `\nProvide a detailed, professional analysis based solely on the authentic documents provided.`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert investment analyst. Provide detailed, professional analysis based on the provided documents. Focus on actionable insights and data-driven conclusions."
          },
          {
            role: "user",
            content: analysisPrompt
          }
        ],
        max_tokens: 3000,
        temperature: 0.3
      });

      const analysis = completion.choices[0]?.message?.content || 'No analysis generated';
      
      return {
        analysis,
        response: analysis,
        context: {
          dealId,
          dealName: deal.name,
          documentsAnalyzed: documentContents.length,
          dataSourcesUsed: documentContents.map(doc => doc.fileName),
          timestamp: new Date()
        }
      };

    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error(`AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}