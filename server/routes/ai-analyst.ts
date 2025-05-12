import { Router } from 'express';
import { z } from 'zod';
import { StorageFactory } from '../storage-factory';
import { AppError } from '../utils/errorHandlers';
import { requireRole } from '../utils/auth';
import { insertAiAnalysisSchema } from '@shared/schema';
import OpenAI from 'openai';

const router = Router();

// Initialize OpenAI with API key
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Get AI analysis for a specific deal
router.get('/:dealId', async (req, res, next) => {
  try {
    const dealId = parseInt(req.params.dealId);
    if (isNaN(dealId)) {
      throw new AppError('Invalid deal ID', 400);
    }

    const storage = StorageFactory.getStorage();
    const analysis = await storage.getAiAnalysisByDeal(dealId);
    if (!analysis) {
      return res.status(404).json({ message: 'No AI analysis found for this deal' });
    }

    res.json(analysis);
  } catch (error) {
    next(error);
  }
});

// Get specific AI analysis by its ID
router.get('/by-id/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      throw new AppError('Invalid analysis ID', 400);
    }

    const storage = StorageFactory.getStorage();
    const analysis = await storage.getAiAnalysis(id);
    if (!analysis) {
      return res.status(404).json({ message: 'AI analysis not found' });
    }

    res.json(analysis);
  } catch (error) {
    next(error);
  }
});

// Generate AI analysis for a deal
router.post('/:dealId/generate', requireRole(['admin', 'partner']), async (req, res, next) => {
  try {
    const dealId = parseInt(req.params.dealId);
    if (isNaN(dealId)) {
      throw new AppError('Invalid deal ID', 400);
    }

    const storage = StorageFactory.getStorage();
    
    // Check if the deal exists
    const deal = await storage.getDeal(dealId);
    if (!deal) {
      throw new AppError('Deal not found', 404);
    }

    // Get documents for the deal to include in the analysis
    const documents = await storage.getDocumentsByDeal(dealId);

    // Check if an analysis already exists for this deal
    const existingAnalysis = await storage.getAiAnalysisByDeal(dealId);
    if (existingAnalysis) {
      // If it exists, first delete it
      await storage.deleteAiAnalysis(existingAnalysis.id);
    }

    // Import OpenAI service
    const { generateDealAnalysis } = await import('../services/openai.service');
    
    // Generate AI analysis using OpenAI service
    const analysisResult = await generateDealAnalysis(deal, documents);
    
    // Save the result to the database
    const newAnalysis = await storage.createAiAnalysis({
      dealId,
      createdBy: req.user.id,
      summary: analysisResult.summary,
      investmentThesis: analysisResult.investmentThesis,
      recommendation: analysisResult.recommendation,
      keyRisks: analysisResult.keyRisks,
      sectorFitAnalysis: analysisResult.sectorFitAnalysis,
      valuationAnalysis: analysisResult.valuationAnalysis,
      openQuestions: analysisResult.openQuestions,
      confidence: analysisResult.confidence,
      sourceReferences: analysisResult.sourceReferences
    });

    res.status(201).json(newAnalysis);
  } catch (error) {
    next(error);
  }
});

// Delete an AI analysis
router.delete('/:id', requireRole(['admin', 'partner']), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      throw new AppError('Invalid analysis ID', 400);
    }

    const storage = StorageFactory.getStorage();
    const success = await storage.deleteAiAnalysis(id);
    if (!success) {
      return res.status(404).json({ message: 'AI analysis not found' });
    }

    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

// Get instant AI insights for a deal
router.post('/:dealId/insights', requireRole(['admin', 'partner', 'analyst']), async (req, res, next) => {
  try {
    const dealId = parseInt(req.params.dealId);
    if (isNaN(dealId)) {
      throw new AppError('Invalid deal ID', 400);
    }

    const storage = StorageFactory.getStorage();
    
    // Get the deal details
    const deal = await storage.getDeal(dealId);
    if (!deal) {
      throw new AppError('Deal not found', 404);
    }

    // Get documents for this deal
    const documents = await storage.getDocumentsByDeal(dealId);
    
    // Create a prompt with the deal information
    let prompt = `Analyze this investment opportunity:
    
Name: ${deal.name}
Sector: ${deal.sector || 'Not specified'}
Description: ${deal.description ? deal.description : 'No description provided'}
Target Return: ${deal.targetReturn ? deal.targetReturn : 'Not specified'}
Stage: ${deal.stage}
`;

    if (documents.length > 0) {
      prompt += `\nThe deal has ${documents.length} attached document(s), including: ${documents.map(doc => doc.documentType || doc.fileName).join(', ')}`;
    }
    
    prompt += `\n\nProvide a brief professional assessment of the investment opportunity, highlighting key strengths, risks, and potential returns. Keep it concise and actionable.`;

    // Call OpenAI to generate insights
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model released May 13, 2024
        messages: [
          { role: "system", content: "You are an expert investment analyst providing brief, high-value insights to investment professionals." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 500
      });

      const insight = response.choices[0].message.content;
      res.json({ insight });
    } catch (openAiError) {
      console.error('OpenAI API error:', openAiError);
      throw new AppError('Error generating AI insights. Please try again later.', 500);
    }
  } catch (error) {
    next(error);
  }
});

// Ask a specific question about a deal with AI
router.post('/:dealId/ask', requireRole(['admin', 'partner', 'analyst']), async (req, res, next) => {
  try {
    const dealId = parseInt(req.params.dealId);
    if (isNaN(dealId)) {
      throw new AppError('Invalid deal ID', 400);
    }
    
    // Validate the request body
    const questionSchema = z.object({
      question: z.string().min(3).max(500)
    });
    
    const validationResult = questionSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new AppError('Invalid question format', 400);
    }
    
    const { question } = validationResult.data;
    
    const storage = StorageFactory.getStorage();
    
    // Get the deal details
    const deal = await storage.getDeal(dealId);
    if (!deal) {
      throw new AppError('Deal not found', 404);
    }

    // Get documents for this deal
    const documents = await storage.getDocumentsByDeal(dealId);
    
    // Create a prompt that includes the deal context and the user's question
    let prompt = `For the following investment opportunity:
    
Name: ${deal.name}
Sector: ${deal.sector || 'Not specified'}
Description: ${deal.description ? deal.description : 'No description provided'}
Target Return: ${deal.targetReturn ? deal.targetReturn : 'Not specified'}
Stage: ${deal.stage}
`;

    if (documents.length > 0) {
      prompt += `\nThe deal has ${documents.length} attached document(s), including: ${documents.map(doc => doc.documentType || doc.fileName).join(', ')}`;
    }
    
    prompt += `\n\nQuestion from investment professional: "${question}"`;
    prompt += `\n\nPlease provide a concise, professional answer based on the available information.`;

    // Call OpenAI to generate an answer
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model released May 13, 2024
        messages: [
          { role: "system", content: "You are an expert investment analyst assistant providing clear and valuable answers to investment professionals." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 500
      });

      const answer = response.choices[0].message.content;
      res.json({ question, answer });
    } catch (openAiError) {
      console.error('OpenAI API error:', openAiError);
      throw new AppError('Error generating AI answer. Please try again later.', 500);
    }
  } catch (error) {
    next(error);
  }
});

export default router;