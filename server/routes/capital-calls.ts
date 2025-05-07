import express from 'express';
import { z } from 'zod';
import { StorageFactory } from '../storage-factory';
import { insertCapitalCallSchema } from '../../shared/schema';
import { requireAuth } from '../utils/auth';
import { requirePermission } from '../utils/permissions';

const router = express.Router();
const storage = StorageFactory.getStorage();

// Schema for validation with additional validation rules
const createCapitalCallSchema = insertCapitalCallSchema.extend({
  callAmount: z.number().positive("Call amount must be greater than 0"),
  amountType: z.enum(["percentage", "dollar"]),
  callDate: z.string().or(z.date()),
  dueDate: z.string().or(z.date())
});

// Get all capital calls for a deal
router.get('/deal/:dealId', requireAuth, async (req, res) => {
  try {
    const dealId = parseInt(req.params.dealId);
    if (isNaN(dealId)) {
      return res.status(400).json({ message: 'Invalid deal ID' });
    }

    const capitalCalls = await storage.getCapitalCallsByDeal(dealId);
    return res.json(capitalCalls);
  } catch (error: any) {
    console.error('Error fetching capital calls:', error);
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
});

// Get all capital calls for an allocation
router.get('/allocation/:allocationId', requireAuth, async (req, res) => {
  try {
    const allocationId = parseInt(req.params.allocationId);
    if (isNaN(allocationId)) {
      return res.status(400).json({ message: 'Invalid allocation ID' });
    }

    const capitalCalls = await storage.getCapitalCallsByAllocation(allocationId);
    return res.json(capitalCalls);
  } catch (error: any) {
    console.error('Error fetching capital calls:', error);
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
});

// Create a new capital call
router.post('/', requireAuth, requirePermission('create', 'capital-call'), async (req, res) => {
  try {
    // Validate the request body
    const validatedData = createCapitalCallSchema.parse(req.body);

    // Get the allocation to validate it exists
    const allocation = await storage.getFundAllocation(validatedData.allocationId);
    if (!allocation) {
      return res.status(404).json({ message: 'Fund allocation not found' });
    }

    // Create the capital call
    const capitalCall = await storage.createCapitalCall({
      ...validatedData,
      callDate: new Date(validatedData.callDate),
      dueDate: new Date(validatedData.dueDate)
    });

    // Get fund name for the timeline event
    const fund = await storage.getFund(allocation.fundId);
    
    // Add a timeline event for the capital call creation
    await storage.createTimelineEvent({
      dealId: allocation.dealId,
      eventType: 'capital_call',
      content: `Capital call ${validatedData.status === 'scheduled' ? 'scheduled' : 'created'} for ${fund?.name || 'a fund'}`,
      createdBy: req.user?.id || 0,
      metadata: {
        capitalCallId: String(capitalCall.id).split(','),
        allocationId: String(allocation.id).split(','),
        fundId: String(allocation.fundId).split(','),
        amount: String(validatedData.callAmount).split(','),
        amountType: String(validatedData.amountType).split(',')
      }
    });

    return res.status(201).json(capitalCall);
  } catch (error: any) {
    console.error('Error creating capital call:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
});

// Update a capital call's status
router.patch('/:id/status', requireAuth, requirePermission('edit', 'capital-call'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid capital call ID' });
    }

    const { status, paidAmount } = req.body;
    if (!status || !['scheduled', 'called', 'partial', 'paid', 'defaulted'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const updatedCapitalCall = await storage.updateCapitalCallStatus(id, status, paidAmount);
    if (!updatedCapitalCall) {
      return res.status(404).json({ message: 'Capital call not found' });
    }

    // Get the allocation to include in the timeline event
    const allocation = await storage.getFundAllocation(updatedCapitalCall.allocationId);
    
    // Add a timeline event for the status update
    if (allocation) {
      await storage.createTimelineEvent({
        dealId: allocation.dealId,
        eventType: 'capital_call_update',
        content: `Capital call status updated to ${status}`,
        createdBy: req.user?.id || 0,
        metadata: {
          capitalCallId: String(id).split(','),
          allocationId: String(allocation.id).split(','),
          fundId: String(allocation.fundId).split(','),
          newStatus: String(status).split(','),
          previousStatus: String(updatedCapitalCall.status).split(','),
          paidAmount: paidAmount ? String(paidAmount).split(',') : []
        }
      });
    }

    return res.json(updatedCapitalCall);
  } catch (error: any) {
    console.error('Error updating capital call status:', error);
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
});

// Update capital call dates
router.patch('/:id/dates', requireAuth, requirePermission('edit', 'capital-call'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid capital call ID' });
    }

    const { callDate, dueDate } = req.body;
    if (!callDate || !dueDate) {
      return res.status(400).json({ message: 'Both callDate and dueDate are required' });
    }

    const updatedCapitalCall = await storage.updateCapitalCallDates(
      id, 
      new Date(callDate), 
      new Date(dueDate)
    );
    
    if (!updatedCapitalCall) {
      return res.status(404).json({ message: 'Capital call not found' });
    }

    return res.json(updatedCapitalCall);
  } catch (error: any) {
    console.error('Error updating capital call dates:', error);
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
});

export default router;