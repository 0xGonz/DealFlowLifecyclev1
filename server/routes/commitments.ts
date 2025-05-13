import express from 'express';
import { requireAuth } from '../utils/auth';
import { requirePermission } from '../utils/permissions';
import { commitmentsService } from '../services/commitments.service';

const router = express.Router();

/**
 * Get commitment statistics for a fund allocation
 */
router.get('/allocation/:id/stats', requireAuth, async (req, res) => {
  try {
    const allocationId = parseInt(req.params.id);
    
    if (isNaN(allocationId)) {
      return res.status(400).json({ message: 'Invalid allocation ID' });
    }
    
    const stats = await commitmentsService.getCommitmentStats(allocationId);
    return res.json(stats);
  } catch (error: any) {
    console.error('Error getting commitment statistics:', error);
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
});

/**
 * Get fund-level commitment statistics
 */
router.get('/fund/:id/stats', requireAuth, async (req, res) => {
  try {
    const fundId = parseInt(req.params.id);
    
    if (isNaN(fundId)) {
      return res.status(400).json({ message: 'Invalid fund ID' });
    }
    
    const stats = await commitmentsService.getFundCommitmentStats(fundId);
    return res.json(stats);
  } catch (error: any) {
    console.error('Error getting fund commitment statistics:', error);
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
});

/**
 * Create a capital call for an allocation
 */
router.post('/allocation/:id/calls', requireAuth, requirePermission('create', 'capital-call'), async (req, res) => {
  try {
    const allocationId = parseInt(req.params.id);
    
    if (isNaN(allocationId)) {
      return res.status(400).json({ message: 'Invalid allocation ID' });
    }
    
    // Validate the request body format
    if (!Array.isArray(req.body) || req.body.length === 0) {
      return res.status(400).json({ message: 'Request body must be an array of capital calls' });
    }
    
    // Validate each capital call has the required fields
    for (const call of req.body) {
      if (typeof call.callAmount !== 'number' || call.callAmount <= 0) {
        return res.status(400).json({ message: 'Each call must have a valid callAmount greater than 0' });
      }
      
      if (!call.dueDate) {
        return res.status(400).json({ message: 'Each call must have a valid dueDate' });
      }
    }
    
    // Create the capital calls
    const calls = await commitmentsService.createCapitalCalls(allocationId, req.body);
    
    return res.status(201).json(calls);
  } catch (error: any) {
    console.error('Error creating capital calls:', error);
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
});

/**
 * Process a payment for a capital call
 */
router.post('/capital-calls/:id/payments', requireAuth, requirePermission('edit', 'capital-call'), async (req, res) => {
  try {
    const capitalCallId = parseInt(req.params.id);
    
    if (isNaN(capitalCallId)) {
      return res.status(400).json({ message: 'Invalid capital call ID' });
    }
    
    // Validate required fields
    const { paymentAmount, paymentDate, paymentType, notes } = req.body;
    
    if (typeof paymentAmount !== 'number' || paymentAmount <= 0) {
      return res.status(400).json({ message: 'Payment amount must be a number greater than 0' });
    }
    
    // Process the payment
    const result = await commitmentsService.processPayment(
      capitalCallId,
      paymentAmount,
      paymentDate ? new Date(paymentDate) : new Date(),
      paymentType || 'wire',
      req.user!.id,
      notes
    );
    
    return res.status(201).json(result);
  } catch (error: any) {
    console.error('Error processing payment:', error);
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
});

export default router;