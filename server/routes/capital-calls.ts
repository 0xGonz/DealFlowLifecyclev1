import { Router, Request, Response } from 'express';
import { StorageFactory } from '../storage-factory';
import { insertCapitalCallSchema } from '@shared/schema';
import * as TimeConstants from '../constants/time-constants';
import { CAPITAL_CALL_STATUS, SCHEDULE_TYPES } from '../constants/status-constants';
import { formatPercentage } from '../utils/format';

// Extract time constants for easier use
const { TIME_MS, DEFAULT_DURATIONS } = TimeConstants;

const router = Router();
const storage = StorageFactory.getStorage();

// Get all capital calls with detail joins
router.get('/', async (req: Request, res: Response) => {
  try {
    // Get raw capital calls
    const capitalCalls = await storage.getAllCapitalCalls();
    
    // Enhance with deal and fund names
    const enhancedCalls = await Promise.all(capitalCalls.map(async (call) => {
      // Get the allocation
      const allocation = await storage.getFundAllocation(call.allocationId);
      if (!allocation) {
        return { ...call, dealName: 'Unknown Deal', fundName: 'Unknown Fund' };
      }
      
      // Get deal and fund names
      const deal = await storage.getDeal(allocation.dealId);
      const fund = await storage.getFund(allocation.fundId);
      
      return {
        ...call,
        dealName: deal?.name || 'Unknown Deal',
        fundName: fund?.name || 'Unknown Fund'
      };
    }));
    
    res.json(enhancedCalls);
  } catch (error) {
    console.error('Error fetching capital calls:', error);
    res.status(500).json({ error: 'Failed to fetch capital calls' });
  }
});

// Get capital calls for a specific deal
router.get('/deal/:dealId', async (req: Request, res: Response) => {
  try {
    const dealId = parseInt(req.params.dealId);
    const capitalCalls = await storage.getCapitalCallsByDeal(dealId);
    res.json(capitalCalls);
  } catch (error) {
    console.error(`Error fetching capital calls for deal ${req.params.dealId}:`, error);
    res.status(500).json({ error: 'Failed to fetch capital calls' });
  }
});

// Get capital calls for a specific allocation
router.get('/allocation/:allocationId', async (req: Request, res: Response) => {
  try {
    const allocationId = parseInt(req.params.allocationId);
    const capitalCalls = await storage.getCapitalCallsByAllocation(allocationId);
    res.json(capitalCalls);
  } catch (error) {
    console.error(`Error fetching capital calls for allocation ${req.params.allocationId}:`, error);
    res.status(500).json({ error: 'Failed to fetch capital calls' });
  }
});

// Create a new capital call
router.post('/', async (req: Request, res: Response) => {
  try {
    // Convert date strings to Date objects
    const data = {
      ...req.body,
      callDate: req.body.callDate ? new Date(req.body.callDate) : new Date(),
      dueDate: req.body.dueDate ? new Date(req.body.dueDate) : new Date(Date.now() + TIME_MS.DAY * DEFAULT_DURATIONS.CAPITAL_CALL_DUE_DAYS) // Default to configured days from now
    };
    
    const validatedData = insertCapitalCallSchema.parse(data);
    const capitalCall = await storage.createCapitalCall(validatedData);
    res.status(201).json(capitalCall);
  } catch (error) {
    console.error('Error creating capital call:', error);
    res.status(400).json({ error: 'Failed to create capital call', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Update capital call status
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { status, paidAmount } = req.body;
    
    if (!Object.values(CAPITAL_CALL_STATUS).includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }
    
    const updatedCall = await storage.updateCapitalCallStatus(id, status, paidAmount);
    
    if (!updatedCall) {
      return res.status(404).json({ error: 'Capital call not found' });
    }
    
    res.json(updatedCall);
  } catch (error) {
    console.error(`Error updating capital call ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to update capital call' });
  }
});

// Generate capital calls based on schedule
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { allocationId, scheduleType, options } = req.body;
    await generateCapitalCalls(allocationId, scheduleType, options);
    res.status(201).json({ message: 'Capital calls generated successfully' });
  } catch (error) {
    console.error('Error generating capital calls:', error);
    res.status(400).json({ error: 'Failed to generate capital calls', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Helper function to generate capital calls from allocation details
async function generateCapitalCalls(allocationId: number, scheduleType: string, options: any) {
  const { firstCallDate, callCount, callPercentage, customSchedule } = options;
  const allocation = await storage.getFundAllocation(allocationId);
  
  if (!allocation) {
    throw new Error('Allocation not found');
  }
  
  // Calculate call amount based on total and percentage
  const calculateAmount = (percentage: number) => {
    return (percentage / 100) * allocation.amount;
  };
  
  // For single payment
  if (scheduleType === SCHEDULE_TYPES.SINGLE) {
    const callAmount = calculateAmount(callPercentage || 100);
    const callDate = new Date(firstCallDate);
    const dueDate = new Date(firstCallDate);
    dueDate.setDate(dueDate.getDate() + DEFAULT_DURATIONS.CAPITAL_CALL_DUE_DAYS); // Due in configured days
    
    await storage.createCapitalCall({
      allocationId,
      callAmount,
      callDate,
      dueDate,
      status: CAPITAL_CALL_STATUS.SCHEDULED,
      notes: `${formatPercentage(callPercentage || 100)} capital call`
    });
    
    return;
  }
  
  // For custom schedule
  if (scheduleType === SCHEDULE_TYPES.CUSTOM && customSchedule) {
    const schedule = JSON.parse(customSchedule);
    
    for (const call of schedule) {
      const callAmount = calculateAmount(call.percentage);
      const callDate = new Date(call.date);
      const dueDate = new Date(call.date);
      dueDate.setDate(dueDate.getDate() + DEFAULT_DURATIONS.CAPITAL_CALL_DUE_DAYS); // Due in configured days
      
      await storage.createCapitalCall({
        allocationId,
        callAmount,
        callDate,
        dueDate,
        status: CAPITAL_CALL_STATUS.SCHEDULED,
        notes: `${formatPercentage(call.percentage)} capital call`
      });
    }
    
    return;
  }
  
  // For regular schedules (monthly, quarterly, biannual, annual)
  const count = callCount || 1;
  const percentage = callPercentage || 100;
  const perCallPercentage = percentage / count;
  const perCallAmount = calculateAmount(perCallPercentage);
  
  let intervalMonths = 1; // monthly
  if (scheduleType === SCHEDULE_TYPES.QUARTERLY) intervalMonths = 3;
  if (scheduleType === SCHEDULE_TYPES.BIANNUAL) intervalMonths = 6;
  if (scheduleType === SCHEDULE_TYPES.ANNUAL) intervalMonths = 12;
  
  for (let i = 0; i < count; i++) {
    const callDate = new Date(firstCallDate);
    callDate.setMonth(callDate.getMonth() + (i * intervalMonths));
    
    const dueDate = new Date(callDate);
    dueDate.setDate(dueDate.getDate() + DEFAULT_DURATIONS.CAPITAL_CALL_DUE_DAYS); // Due in configured days
    
    await storage.createCapitalCall({
      allocationId,
      callAmount: perCallAmount,
      callDate,
      dueDate,
      status: CAPITAL_CALL_STATUS.SCHEDULED,
      notes: `${scheduleType} capital call ${i + 1} of ${count} (${formatPercentage(perCallPercentage)})`
    });
  }
}

export default router;