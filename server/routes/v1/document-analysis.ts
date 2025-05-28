import { Router, Request, Response } from 'express';
import { StorageFactory } from '../../storage-factory';
import { requireAuth } from '../../utils/auth';
import { DocumentAnalyzer, type AnalysisRequest } from '../../modules/documents/document-analyzer';

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
    
    const userId = (req.session as any)?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }
    
    console.log(`🔍 AI ANALYSIS REQUEST - Deal ${dealId}, User ${userId}, Query: ${query || 'comprehensive analysis'}`);
    
    const storage = StorageFactory.getStorage();
    
    // Get the deal with validation
    const deal = await storage.getDeal(parseInt(dealId));
    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }
    
    console.log(`📈 Analyzing deal: ${deal.name} (${deal.sector})`);

    // Initialize the document analyzer
    const analyzer = new DocumentAnalyzer();
    
    // Extract all authentic document content
    const documentContents = await analyzer.extractDealDocuments(parseInt(dealId));
    
    // Validate we have sufficient authentic data
    analyzer.validateAnalysisData(documentContents, deal);
    
    // Perform the AI analysis with authentic data only
    const analysisRequest: AnalysisRequest = {
      dealId: parseInt(dealId),
      query,
      userId
    };
    
    const result = await analyzer.performAnalysis(analysisRequest, deal, documentContents);
    
    console.log(`✅ AI analysis completed successfully for deal ${dealId}`);
    console.log(`📄 Analysis based on ${documentContents.length} authentic documents`);

    res.json(result);
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