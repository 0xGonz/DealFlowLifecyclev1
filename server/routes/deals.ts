import { Router } from 'express';
import { StorageFactory } from '../storage-factory';
import { asyncHandler } from '../utils/errorHandlers';
import { requireAuth } from '../utils/auth';
import { z } from 'zod';
import { insertDealSchema } from '@shared/schema';

const storage = StorageFactory.getStorage();
export const dealsRouter = Router();

// Apply authentication middleware to all routes
dealsRouter.use(requireAuth);

// Get all deals
dealsRouter.get('/', asyncHandler(async (req, res) => {
  const deals = await storage.getDeals();
  res.status(200).json(deals);
}));

// Get deals by stage
dealsRouter.get('/stage/:stage', asyncHandler(async (req, res) => {
  const { stage } = req.params;
  // Type casting to satisfy TypeScript - the storage implementation will validate the stage
  const deals = await storage.getDealsByStage(stage as any);
  res.status(200).json(deals);
}));

// Get a specific deal
dealsRouter.get('/:id', asyncHandler(async (req, res) => {
  const dealId = parseInt(req.params.id);
  const deal = await storage.getDeal(dealId);
  
  if (!deal) {
    return res.status(404).json({
      status: 'fail',
      message: 'Deal not found'
    });
  }
  
  res.status(200).json(deal);
}));

// Create a new deal
dealsRouter.post('/', asyncHandler(async (req, res) => {
  const validatedData = insertDealSchema.parse(req.body);
  const newDeal = await storage.createDeal(validatedData);
  res.status(201).json(newDeal);
}));

// Update a deal
dealsRouter.patch('/:id', asyncHandler(async (req, res) => {
  const dealId = parseInt(req.params.id);
  const updateSchema = insertDealSchema.partial();
  const validatedData = updateSchema.parse(req.body);
  
  const updatedDeal = await storage.updateDeal(dealId, validatedData);
  
  if (!updatedDeal) {
    return res.status(404).json({
      status: 'fail',
      message: 'Deal not found'
    });
  }
  
  res.status(200).json(updatedDeal);
}));

// Delete a deal
dealsRouter.delete('/:id', asyncHandler(async (req, res) => {
  const dealId = parseInt(req.params.id);
  const result = await storage.deleteDeal(dealId);
  
  if (!result) {
    return res.status(404).json({
      status: 'fail',
      message: 'Deal not found'
    });
  }
  
  res.status(200).json({
    status: 'success',
    message: 'Deal deleted successfully'
  });
}));
