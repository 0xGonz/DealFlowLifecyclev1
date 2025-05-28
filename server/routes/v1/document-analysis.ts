import { Router, Request, Response } from 'express';
import { StorageFactory } from '../../storage-factory';
import { requireAuth } from '../../utils/auth';
import { DocumentService } from '../../modules/documents/service';
import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();

/**
 * Test route to verify the document analysis router is working
 */
router.get('/test', (req, res) => {
  res.json({ message: 'Document analysis router is working!' });
});

/**
 * General deal analysis - for comprehensive AI analysis of entire deals
 */
router.post('/deals/:dealId/analyze', requireAuth, async (req: Request, res: Response) => {
  try {
    const { dealId } = req.params;
    const { query } = req.body;
    
    console.log(`🔍 Analyzing deal ${dealId} with query: ${query || 'comprehensive analysis'}`);
    
    const storage = StorageFactory.getStorage();
    
    // Get the deal
    const deal = await storage.getDeal(parseInt(dealId));
    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }
    
    // Get all related data and extract PDF content
    const [documents, memos] = await Promise.all([
      storage.getDocumentsByDeal(parseInt(dealId)),
      storage.getMiniMemosByDeal(parseInt(dealId))
    ]);
    
    // Extract actual content from PDF documents - ONLY use real document content
    let documentContents: string[] = [];
    let successfulExtractions = 0;
    
    console.log(`🔍 Starting content extraction for ${documents.length} documents in deal ${dealId}`);
    
    for (const doc of documents) {
      try {
        console.log(`📄 Extracting content from document: ${doc.fileName} (ID: ${doc.id})`);
        const content = await DocumentService.extractPdfContent(doc.id);
        if (content && content.trim().length > 0) {
          documentContents.push(`DOCUMENT: ${doc.fileName}\nCONTENT:\n${content}`);
          successfulExtractions++;
          console.log(`✅ Successfully extracted ${content.length} characters from ${doc.fileName}`);
        } else {
          console.log(`⚠️ No content extracted from ${doc.fileName} - content was empty`);
        }
      } catch (error) {
        console.error(`❌ Error extracting content from ${doc.fileName}:`, error.message);
        // Continue to next document instead of failing
      }
    }
    
    console.log(`📊 Content extraction complete: ${successfulExtractions}/${documents.length} documents processed successfully`);
    
    // CRITICAL: Only proceed if we have actual document content
    if (documentContents.length === 0) {
      console.error(`🚨 NO DOCUMENT CONTENT AVAILABLE - Cannot proceed with AI analysis`);
      return res.status(400).json({ 
        error: 'No document content available for analysis. The documents exist in the database but content extraction failed.',
        details: `Found ${documents.length} documents but none could be processed for content extraction.`,
        dealId: dealId,
        documentCount: documents.length
      });
    }
    
    console.log(`🚀 Proceeding with AI analysis using content from ${successfulExtractions} documents`);
    
    // Get timeline events (if available)
    let timeline = [];
    try {
      if (storage.getDealTimeline) {
        timeline = await storage.getDealTimeline(parseInt(dealId));
      }
    } catch (error) {
      console.log('Timeline not available, continuing without it');
    }

    // Create comprehensive analysis prompt
    let analysisPrompt = '';
    
    if (query) {
      // User has specific question
      analysisPrompt = `
You are an expert investment analyst. A user is asking about the deal "${deal.name}" in the ${deal.sector} sector.

User Question: ${query}

Deal Information:
- Name: ${deal.name}
- Description: ${deal.description}
- Sector: ${deal.sector}
- Stage: ${deal.stage}
- Target Return: ${deal.targetReturn || 'Not specified'}
- Notes: ${deal.notes || 'None'}

ACTUAL DOCUMENT CONTENT FROM DEAL ${dealId}:
${documentContents.join('\n\n---DOCUMENT SEPARATOR---\n\n')}

CRITICAL INSTRUCTIONS:
- Base your analysis EXCLUSIVELY on the actual document content provided above from this specific deal
- Quote specific numbers, amounts, dates, and metrics directly from the documents
- Reference exact figures from financial statements, balance sheets, term sheets, or other uploaded data
- If specific information is not in the documents, clearly state "This information is not available in the provided documents"
- Do NOT use generic investment templates, assumptions, or external knowledge
- NEVER say "I don't have access to the document" - you have the full content above
- Focus exclusively on real data extracted from the uploaded documents for this deal
- Provide specific, data-driven insights based only on the document content

Provide a detailed response based exclusively on the document content.`;
    } else {
      // Comprehensive analysis
      analysisPrompt = `
You are an expert investment analyst. Analyze the following deal and documents:

Deal Information:
- Name: ${deal.name}
- Description: ${deal.description}
- Sector: ${deal.sector}
- Stage: ${deal.stage}
- Target Return: ${deal.targetReturn || 'Not specified'}
- Notes: ${deal.notes || 'None'}

ACTUAL DOCUMENT CONTENT:
${documentContents.length > 0 ? documentContents.join('\n\n---DOCUMENT SEPARATOR---\n\n') : 'No document content available for analysis.'}

CRITICAL INSTRUCTIONS:
- Analyze ONLY the actual content from the documents above
- Reference specific financial figures, dates, amounts, and metrics from the documents
- Quote exact numbers and percentages from the source material
- If data is not available in documents, clearly state so
- Do NOT use generic analysis templates or make assumptions

Provide analysis covering:
1. Specific Financial Metrics (exact amounts from documents)
2. Investment Terms (as stated in documents)
3. Risk Factors (identified in documents)
4. Opportunities (based on document data)
5. Data-driven Recommendations

Base your entire analysis on the actual document content only.`;
    }

    console.log(`🔍 DEBUGGING: Document contents being sent to AI:`);
    console.log(`📄 Number of documents: ${documentContents.length}`);
    documentContents.forEach((content, index) => {
      console.log(`📝 Document ${index + 1} content length: ${content.length} characters`);
      console.log(`🔍 First 200 chars: ${content.substring(0, 200)}...`);
    });
    console.log(`🎯 Full analysis prompt being sent to AI:`);
    console.log(analysisPrompt);
    
    // Initialize OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are an expert investment analyst specializing in private equity and venture capital deal analysis."
        },
        {
          role: "user",
          content: analysisPrompt
        }
      ],
      max_tokens: 2000,
      temperature: 0.3
    });

    const analysis = response.choices[0].message.content;
    
    console.log(`✅ Generated ${query ? 'response' : 'comprehensive analysis'} for deal ${deal.name}`);
    
    res.json({
      success: true,
      response: analysis,
      analysis: analysis,
      dealName: deal.name,
      dealId: parseInt(dealId),
      analysisType: query ? 'query-response' : 'comprehensive',
      context: {
        dealName: deal.name,
        dataSourcesUsed: ['deal_data', 'documents', 'memos', 'timeline'],
        timestamp: new Date()
      }
    });
    
  } catch (error) {
    console.error('Deal analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze deal',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Analyze a specific document by ID
 */
router.post('/deals/:dealId/documents/:documentId/analyze', requireAuth, async (req: Request, res: Response) => {
  try {
    const { dealId, documentId } = req.params;
    const { query } = req.body;
    
    console.log(`🔍 Analyzing specific document ${documentId} for deal ${dealId}`);
    
    const storage = StorageFactory.getStorage();
    
    // Get the specific document
    const documents = await storage.getDocumentsByDeal(parseInt(dealId));
    const document = documents.find((doc: any) => doc.id === parseInt(documentId));
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Read the actual document content
    const UPLOAD_PATH = process.env.UPLOAD_PATH || './uploads';
    const actualFilePath = path.join(UPLOAD_PATH, path.basename(document.filePath));
    
    if (!fs.existsSync(actualFilePath)) {
      return res.status(404).json({ error: 'Document file not found on disk' });
    }
    
    let documentContent = '';
    const extension = path.extname(document.fileName).toLowerCase();
    
    // Extract content based on file type
    if (extension === '.pdf') {
      try {
        const pdfParse = (await import('pdf-parse')).default;
        const pdfBuffer = fs.readFileSync(actualFilePath);
        const pdfData = await pdfParse(pdfBuffer);
        documentContent = pdfData.text;
        console.log(`📄 Extracted ${pdfData.text.length} characters from PDF`);
      } catch (error) {
        console.error('Error reading PDF:', error);
        return res.status(500).json({ error: 'Failed to read PDF document' });
      }
    } else if (['.xlsx', '.xls', '.csv'].includes(extension)) {
      // Handle spreadsheet files
      try {
        const { DataExtractor } = await import('../../services/data-extractor');
        const extractedData = await DataExtractor.extractData(actualFilePath, document.fileName);
        documentContent = JSON.stringify(extractedData, null, 2);
        console.log(`📊 Extracted structured data from ${document.fileName}`);
      } catch (error) {
        console.error('Error reading spreadsheet:', error);
        return res.status(500).json({ error: 'Failed to read spreadsheet document' });
      }
    } else {
      return res.status(400).json({ error: 'Unsupported document type' });
    }
    
    if (!documentContent || documentContent.trim().length === 0) {
      return res.status(400).json({ error: 'Document appears to be empty or unreadable' });
    }
    
    // Enhanced logging for debugging
    console.log(`📊 Document Content Length: ${documentContent.length} characters`);
    console.log(`📋 Document Content Preview: ${documentContent.substring(0, 200)}...`);
    
    // Create analysis prompt focused on the specific document
    const analysisPrompt = `You are analyzing the document: "${document.fileName}"

IMPORTANT: Base your analysis ONLY on the actual document content provided below. Do not use general knowledge or assumptions.

DOCUMENT CONTENT TO ANALYZE:
${documentContent}

USER REQUEST: ${query || 'Analyze this document in detail'}

Please provide a comprehensive analysis based solely on the content above. Include:
1. Specific financial figures, metrics, and performance data found in the document
2. Investment terms, conditions, and structure details
3. Risk factors explicitly mentioned
4. Strategic insights and opportunities identified
5. Important dates, deadlines, and milestones
6. Any concerns or red flags noted in the document

Reference specific numbers, percentages, dates, and details from the document content. If certain information is not present in the document, clearly state that it is not available in the provided content.`;

    // Get AI analysis using OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are an expert investment analyst specializing in document analysis for private equity and venture capital investments."
        },
        {
          role: "user",
          content: analysisPrompt
        }
      ],
      max_tokens: 2000,
      temperature: 0.3
    });

    const analysis = response.choices[0].message.content;
    
    console.log(`✅ Generated document analysis for ${document.fileName}`);
    
    res.json({
      success: true,
      response: analysis,
      documentName: document.fileName,
      documentType: extension,
      analysisType: 'document-specific'
    });
    
  } catch (error) {
    console.error('Document analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze document',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;