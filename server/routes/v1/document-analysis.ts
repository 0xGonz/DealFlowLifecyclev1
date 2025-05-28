import { Router, Request, Response } from 'express';
import { StorageFactory } from '../../storage-factory';
import { requireAuth } from '../../utils/auth';
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
    
    // Get all related data
    const [documents, memos] = await Promise.all([
      storage.getDocumentsByDeal(parseInt(dealId)),
      storage.getMiniMemosByDeal(parseInt(dealId))
    ]);
    
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

Deal Information:
- Name: ${deal.name}
- Description: ${deal.description}
- Sector: ${deal.sector}
- Stage: ${deal.stageLabel}
- Target Return: ${deal.targetReturn || 'Not specified'}
- Notes: ${deal.notes || 'None'}

Available Documents: ${documents.length} documents
Available Memos: ${memos.length} mini memos
Timeline Events: ${timeline.length} events

User Question: ${query}

Please provide a detailed, professional response based on the available deal information. Focus on investment analysis, due diligence insights, and strategic recommendations.
`;
    } else {
      // Comprehensive analysis
      analysisPrompt = `
You are an expert investment analyst. Please provide a comprehensive investment analysis for the following deal:

Deal Information:
- Name: ${deal.name}
- Description: ${deal.description}
- Sector: ${deal.sector}
- Stage: ${deal.stageLabel}
- Target Return: ${deal.targetReturn || 'Not specified'}
- Notes: ${deal.notes || 'None'}

Data Available:
- ${documents.length} documents uploaded
- ${memos.length} mini memos created
- ${timeline.length} timeline events

Please provide:
1. Investment Thesis Analysis
2. Risk Assessment
3. Market Opportunity Evaluation
4. Financial Analysis (based on available data)
5. Strategic Recommendations
6. Key Questions for Due Diligence

Format your response with clear sections and bullet points for easy reading.
`;
    }

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
    
    // Create analysis prompt focused on the specific document
    const analysisPrompt = `You are analyzing a specific document: "${document.fileName}"

Document Content:
${documentContent}

User Request: ${query || 'Provide a comprehensive analysis of this document'}

Please provide a detailed analysis of this document, focusing on:
1. Key financial metrics and terms (if applicable)
2. Investment structure and conditions
3. Risk factors identified
4. Opportunities and strategic implications
5. Important dates, deadlines, or milestones
6. Any red flags or concerns

Base your analysis ONLY on the actual content of this document. Do not reference external deal data unless it's mentioned in the document itself.`;

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