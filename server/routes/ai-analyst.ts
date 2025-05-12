import { Router } from 'express';
import { z } from 'zod';
import { StorageFactory } from '../storage-factory';
import { AppError } from '../utils/errorHandlers';
import { requireRole } from '../utils/auth';
import { insertAiAnalysisSchema } from '@shared/schema';

const router = Router();

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

    // Check if an analysis already exists for this deal
    const existingAnalysis = await storage.getAiAnalysisByDeal(dealId);
    if (existingAnalysis) {
      // If it exists, first delete it
      await storage.deleteAiAnalysis(existingAnalysis.id);
    }

    // In a real application, this would connect to an AI service
    // For now, we'll create a mock analysis with sample data
    const newAnalysis = await storage.createAiAnalysis({
      dealId,
      createdBy: req.user.id,
      summary: `This is an AI-generated analysis for ${deal.name}. The analysis considers the deal's sector, target return, and other available information.`,
      investmentThesis: `${deal.name} presents an opportunity in the ${deal.sector || 'unknown'} sector with a target return of ${deal.targetReturn || 'unknown'}.`,
      recommendation: 'needs_more_diligence',
      keyRisks: ['Market volatility', 'Execution risk', 'Regulatory concerns'],
      sectorFitAnalysis: `The deal fits within our investment strategy for the ${deal.sector || 'unknown'} sector.`,
      valuationAnalysis: `Based on the available information, the valuation appears to be in line with market standards.`,
      openQuestions: ['What is the management team track record?', 'How does this compare to competitors?'],
      confidence: 0.75,
      sourceReferences: [
        { source: 'Deal Documents', weight: 0.6 },
        { source: 'Market Research', weight: 0.4 }
      ]
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

export default router;