import { Router, Request, Response } from 'express';
import { StorageFactory } from '../../storage';
import { requireAuth } from '../../utils/auth';
import { AIAnalyzer } from '../../services/ai-analyzer';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();

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
    const document = documents.find(doc => doc.id === parseInt(documentId));
    
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

    // Get AI analysis
    const analysis = await AIAnalyzer.generateAnalysis(analysisPrompt);
    
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