import { Router, Request, Response } from 'express';
import { StorageFactory } from '../storage-factory';
import { insertCapitalCallSchema, type FundAllocation } from '@shared/schema';
import * as TimeConstants from '../constants/time-constants';
import { CAPITAL_CALL_STATUS, SCHEDULE_TYPES } from '../constants/status-constants';
import { formatPercentage } from '../utils/format';
import { inArray } from 'drizzle-orm';

// Extract time constants for easier use
const { TIME_MS, DEFAULT_DURATIONS } = TimeConstants;

const router = Router();
// Using static storage property directly for consistency

// Get all capital calls with detail joins
router.get('/', async (req: Request, res: Response) => {
  try {
    // Get raw capital calls
    const capitalCalls = await StorageFactory.storage.getAllCapitalCalls();
    // Get all deals to validate which deals exist
    const deals = await StorageFactory.storage.getDeals();
    const validDealIds = deals.map(deal => deal.id);

    // Get all allocations for validation
    interface AllocationMap {
      callId: number;
      allocation: FundAllocation | undefined;
    }
    
    const allocations: AllocationMap[] = [];
    for (const call of capitalCalls) {
      const allocation = await StorageFactory.storage.getFundAllocation(call.allocationId);
      allocations.push({ callId: call.id, allocation });
    }
    
    // Filter and enhance capital calls
    const enhancedCalls = await Promise.all(
      capitalCalls
        .filter(call => {
          // Find the allocation for this call
          const allocationData = allocations.find(a => a.callId === call.id);
          const allocation = allocationData?.allocation;
          
          // Keep only calls with valid allocations that link to valid deals
          return allocation && validDealIds.includes(allocation.dealId);
        })
        .map(async (call) => {
          // Get the allocation
          const allocation = await StorageFactory.storage.getFundAllocation(call.allocationId);
          if (!allocation) {
            return null; // Should never happen due to the filter, but just in case
          }
          
          // Get deal and fund names
          const deal = await StorageFactory.storage.getDeal(allocation.dealId);
          const fund = await StorageFactory.storage.getFund(allocation.fundId);
          
          return {
            ...call,
            dealName: deal?.name || 'Unknown Deal',
            fundName: fund?.name || 'Unknown Fund'
          };
        })
    );
    
    // Remove any null values that might have slipped through
    const validCalls = enhancedCalls.filter(call => call !== null);
    
    res.json(validCalls);
  } catch (error) {
    console.error('Error fetching capital calls:', error);
    res.status(500).json({ error: 'Failed to fetch capital calls' });
  }
});

// Get capital calls for a specific deal
router.get('/deal/:dealId', async (req: Request, res: Response) => {
  try {
    const dealId = parseInt(req.params.dealId);
    
    // First verify the deal exists
    const deal = await StorageFactory.storage.getDeal(dealId);
    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }
    
    const capitalCalls = await StorageFactory.storage.getCapitalCallsByDeal(dealId);
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
    
    // First verify the allocation exists
    const allocation = await StorageFactory.storage.getFundAllocation(allocationId);
    if (!allocation) {
      return res.status(404).json({ error: 'Allocation not found' });
    }
    
    // Then verify the deal exists
    const deal = await StorageFactory.storage.getDeal(allocation.dealId);
    if (!deal) {
      return res.status(404).json({ error: 'Allocation is linked to a nonexistent deal' });
    }
    
    const capitalCalls = await StorageFactory.storage.getCapitalCallsByAllocation(allocationId);
    res.json(capitalCalls);
  } catch (error) {
    console.error(`Error fetching capital calls for allocation ${req.params.allocationId}:`, error);
    res.status(500).json({ error: 'Failed to fetch capital calls' });
  }
});

// Create a new capital call
router.post('/', async (req: Request, res: Response) => {
  try {
    let modifiedBody = { ...req.body };
    
    // If percentage exists, use it for callAmount
    if (modifiedBody.percentage !== undefined) {
      modifiedBody.callAmount = modifiedBody.percentage;
      delete modifiedBody.percentage; // Remove percentage as it's not in the schema
    }
    
    // Handle amountType field
    if (modifiedBody.amountType !== undefined) {
      // Make sure it's a valid value
      if (!['percentage', 'dollar'].includes(modifiedBody.amountType)) {
        modifiedBody.amountType = 'percentage'; // Default to percentage if invalid
      }
    } else {
      modifiedBody.amountType = 'percentage'; // Default value if not provided
    }
    
    // If dealId is provided instead of allocationId, find a suitable allocation
    // This allows creating capital calls directly by deal without needing allocation IDs
    if (modifiedBody.dealId !== undefined && modifiedBody.allocationId === undefined) {
      const dealId = modifiedBody.dealId;
      
      // Find a suitable allocation for this deal
      const allocations = await StorageFactory.storage.getAllocationsByDeal(dealId);
      if (allocations && allocations.length > 0) {
        // Simply use the first allocation for this deal
        modifiedBody.allocationId = allocations[0].id;
      } else {
        return res.status(400).json({ 
          error: 'No fund allocations found for this deal',
          details: 'This deal must be allocated to at least one fund before capital calls can be created'
        });
      }
      
      // Remove dealId as it's not in the schema
      delete modifiedBody.dealId;
    }

    // If we have an allocationId, get the allocation to use its date as fallback
    let allocationDate = new Date();
    if (modifiedBody.allocationId) {
      const allocation = await StorageFactory.storage.getFundAllocation(modifiedBody.allocationId);
      if (allocation && allocation.allocationDate) {
        allocationDate = new Date(allocation.allocationDate);
      }
    }

    // Convert date strings to Date objects, using allocation date as fallback
    const data = {
      ...modifiedBody,
      callDate: modifiedBody.callDate ? new Date(modifiedBody.callDate) : allocationDate,
      dueDate: modifiedBody.dueDate ? new Date(modifiedBody.dueDate) : new Date(allocationDate.getTime() + TIME_MS.DAY * DEFAULT_DURATIONS.CAPITAL_CALL_DUE_DAYS)
    };
    
    const validatedData = insertCapitalCallSchema.parse(data);
    const capitalCall = await StorageFactory.storage.createCapitalCall(validatedData);
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
    
    // First get the capital call to get the allocation ID
    const capitalCall = await StorageFactory.storage.getCapitalCall(id);
    if (!capitalCall) {
      return res.status(404).json({ error: 'Capital call not found' });
    }
    
    // Update the capital call status
    const updatedCall = await StorageFactory.storage.updateCapitalCallStatus(id, status, paidAmount);
    
    if (!updatedCall) {
      return res.status(404).json({ error: 'Capital call not found or could not be updated' });
    }
    
    // Update the allocation status based on capital calls
    await updateAllocationStatusBasedOnCapitalCalls(capitalCall.allocationId);
    
    res.json(updatedCall);
  } catch (error) {
    console.error(`Error updating capital call ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to update capital call' });
  }
});

// Helper function to recalculate portfolio weights for a fund
async function recalculatePortfolioWeights(fundId: number): Promise<void> {
  try {
    // Get all allocations for the fund
    const allocations = await StorageFactory.storage.getAllocationsByFund(fundId);
    if (!allocations || allocations.length === 0) return;
    
    // Calculate the total called (funded) capital in the fund
    const calledCapital = allocations
      .filter(allocation => allocation.status === 'funded')
      .reduce((sum, allocation) => sum + allocation.amount, 0);
    
    // If there's no called capital yet, we don't need to update weights
    if (calledCapital <= 0) return;
    
    // Update the weight for each allocation
    for (const allocation of allocations) {
      // Only funded allocations contribute to portfolio weight
      const weight = allocation.status === 'funded'
        ? (allocation.amount / calledCapital) * 100
        : 0;
      
      // Update the allocation with the new weight
      await StorageFactory.storage.updateFundAllocation(
        allocation.id,
        { portfolioWeight: parseFloat(weight.toFixed(2)) }
      );
    }
    
    console.log(`Successfully recalculated portfolio weights for fund ID ${fundId}`);
  } catch (error) {
    console.error(`Error recalculating portfolio weights for fund ID ${fundId}:`, error);
  }
}

// Helper function to update allocation status based on capital calls
// Export for testing purposes
export async function updateAllocationStatusBasedOnCapitalCalls(allocationId: number): Promise<void> {
  try {
    // Get the allocation
    const allocation = await StorageFactory.storage.getFundAllocation(allocationId);
    if (!allocation) return;
    
    // Get capital calls for this allocation
    const capitalCalls = await StorageFactory.storage.getCapitalCallsByAllocation(allocationId);
    if (!capitalCalls || capitalCalls.length === 0) return;
    
    // Calculate total called amount and total paid amount
    let totalCalledAmount = 0;
    let totalPaidAmount = 0;
    
    for (const call of capitalCalls) {
      if (call.status !== 'scheduled') {
        // Only count calls that have been actually called or paid
        totalCalledAmount += call.callAmount;
      }
      
      if (call.status === 'paid' && call.paidAmount) {
        totalPaidAmount += call.paidAmount;
      }
    }
    
    // Determine allocation status based on capital calls
    let newStatus = allocation.status;
    
    // If no capital has been called, status remains 'committed'
    if (totalCalledAmount === 0) {
      newStatus = 'committed';
    }
    // If some capital has been called and fully paid, status is 'funded'
    else if (totalPaidAmount >= totalCalledAmount) {
      newStatus = 'funded';
    }
    // If some capital has been called but not fully paid, status is 'committed'
    else if (totalPaidAmount < totalCalledAmount) {
      newStatus = 'committed';
    }
    
    // Only update if status changed
    if (newStatus !== allocation.status) {
      await StorageFactory.storage.updateFundAllocation(allocation.id, { status: newStatus });
      
      // After updating the allocation status, recalculate portfolio weights
      // for all allocations in this fund to ensure they add up to 100%
      await recalculatePortfolioWeights(allocation.fundId);
    }
  } catch (error) {
    console.error(`Error updating allocation status for allocation ${allocationId}:`, error);
  }
}

// Generate capital calls based on schedule
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { allocationId: allocId, scheduleType, options } = req.body;
    const generatedAllocId = await generateCapitalCalls(allocId, scheduleType, options);
    
    // Update the allocation status based on capital calls
    await updateAllocationStatusBasedOnCapitalCalls(generatedAllocId);
    
    res.status(201).json({ message: 'Capital calls generated successfully' });
  } catch (error) {
    console.error('Error generating capital calls:', error);
    res.status(400).json({ error: 'Failed to generate capital calls', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Test endpoint to verify amountType field
router.get('/test-amounttype', async (req: Request, res: Response) => {
  try {
    // Create a test capital call with dollar amount type
    const testAllocation = await StorageFactory.storage.getFundAllocation(1); // Get first allocation for test
    
    if (!testAllocation) {
      return res.status(404).json({ error: 'No allocations found for testing' });
    }
    
    const testCall = await StorageFactory.storage.createCapitalCall({
      allocationId: testAllocation.id,
      callAmount: 50, // 50%
      amountType: 'dollar', // Explicitly set to dollar
      callDate: new Date(),
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      status: 'scheduled',
      notes: 'Test capital call with dollar amount type'
    });
    
    // Retrieve the test call to verify the amountType was saved
    const retrievedCall = await StorageFactory.storage.getCapitalCall(testCall.id);
    
    res.json({
      created: testCall,
      retrieved: retrievedCall,
      amountTypeMatch: retrievedCall?.amountType === 'dollar'
    });
  } catch (error) {
    console.error('Error testing amountType:', error);
    res.status(500).json({ error: 'Failed to test amountType field', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Helper function to generate capital calls from allocation details
async function generateCapitalCalls(allocationId: number, scheduleType: string, options: any): Promise<number> {
  const { firstCallDate, callCount, callPercentage, customSchedule } = options;
  const allocation = await StorageFactory.storage.getFundAllocation(allocationId);
  
  if (!allocation) {
    throw new Error('Allocation not found');
  }
  
  // This function is no longer needed as we're directly using percentages
  // Keeping it for reference in case we need to convert back to dollar amounts
  const calculateAmount = (percentage: number) => {
    return (percentage / 100) * allocation.amount;
  };
  
  // For single payment - just pass through the percentage value directly
  if (scheduleType === SCHEDULE_TYPES.SINGLE) {
    const percentage = callPercentage || 100;
    // Use the allocation date if it exists, otherwise use the firstCallDate
    const allocationDate = allocation.allocationDate ? new Date(allocation.allocationDate) : new Date(firstCallDate);
    const callDate = allocationDate;
    const dueDate = new Date(allocationDate);
    dueDate.setDate(dueDate.getDate() + DEFAULT_DURATIONS.CAPITAL_CALL_DUE_DAYS); // Due in configured days
    
    // For single payments, we create a capital call that's already paid
    // This matches the 'funded' status that we set on the allocation
    await StorageFactory.storage.createCapitalCall({
      allocationId,
      callAmount: percentage, // Now callAmount represents percentage
      amountType: 'percentage', // Explicitly set the amount type
      callDate,
      dueDate,
      status: CAPITAL_CALL_STATUS.PAID, // Mark as PAID for single payments
      paidAmount: percentage, // Set paid amount to match call amount
      paidDate: allocationDate, // Set paid date to allocation date
      notes: `${formatPercentage(percentage)} single payment - fully funded`
    });
    
    // Also update the allocation status to 'funded'
    await StorageFactory.storage.updateFundAllocation(allocationId, { status: 'funded' });
    
    // Get the fundId to recalculate portfolio weights for all allocations in this fund
    await recalculatePortfolioWeights(allocation.fundId);
    
    return allocationId;
  }
  
  // For custom schedule
  if (scheduleType === SCHEDULE_TYPES.CUSTOM && customSchedule) {
    const schedule = JSON.parse(customSchedule);
    // Get the allocation date to use as a reference point
    const baseDate = allocation.allocationDate ? new Date(allocation.allocationDate) : new Date();
    
    for (const call of schedule) {
      const percentage = call.percentage;
      // Use relative dates if provided, otherwise use allocation date
      const callDate = call.date ? new Date(call.date) : new Date(baseDate);
      const dueDate = new Date(callDate);
      dueDate.setDate(dueDate.getDate() + DEFAULT_DURATIONS.CAPITAL_CALL_DUE_DAYS); // Due in configured days
      
      await StorageFactory.storage.createCapitalCall({
        allocationId,
        callAmount: percentage, // Now callAmount represents percentage
        amountType: call.amountType || 'percentage', // Use the amountType from the call or default to percentage
        callDate,
        dueDate,
        status: CAPITAL_CALL_STATUS.SCHEDULED,
        notes: `${call.amountType === 'dollar' ? `$${percentage.toLocaleString()}` : formatPercentage(percentage)} capital call`
      });
    }
    
    return allocationId;
  }
  
  // For regular schedules (monthly, quarterly, biannual, annual)
  const count = callCount || 1;
  const percentage = callPercentage || 100;
  const perCallPercentage = percentage / count;
  
  let intervalMonths = 1; // monthly
  if (scheduleType === SCHEDULE_TYPES.QUARTERLY) intervalMonths = 3;
  if (scheduleType === SCHEDULE_TYPES.BIANNUAL) intervalMonths = 6;
  if (scheduleType === SCHEDULE_TYPES.ANNUAL) intervalMonths = 12;
  
  // Use allocation date as base date if available, otherwise use the provided firstCallDate
  const baseDate = allocation.allocationDate ? new Date(allocation.allocationDate) : new Date(firstCallDate);
  
  for (let i = 0; i < count; i++) {
    const callDate = new Date(baseDate);
    callDate.setMonth(callDate.getMonth() + (i * intervalMonths));
    
    const dueDate = new Date(callDate);
    dueDate.setDate(dueDate.getDate() + DEFAULT_DURATIONS.CAPITAL_CALL_DUE_DAYS); // Due in configured days
    
    await StorageFactory.storage.createCapitalCall({
      allocationId,
      callAmount: perCallPercentage, // Now callAmount represents percentage
      amountType: 'percentage', // For regular schedules, always use percentage
      callDate,
      dueDate,
      status: CAPITAL_CALL_STATUS.SCHEDULED,
      notes: `${scheduleType} capital call ${i + 1} of ${count} (${formatPercentage(perCallPercentage)})`
    });
  }
  
  return allocationId;
}

export default router;