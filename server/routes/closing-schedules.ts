import { Router, Request, Response } from 'express';
import { StorageFactory } from '../storage-factory';
import { insertClosingScheduleEventSchema, type Deal } from '@shared/schema';
import { CLOSING_EVENT_STATUS } from '../constants/status-constants';

const router = Router();
const storage = StorageFactory.getStorage();

// Get all closing schedule events
router.get('/', async (req: Request, res: Response) => {
  try {
    // Get raw closing schedule events
    const closingEvents = await storage.getAllClosingScheduleEvents();
    
    // Get all deals to validate which deals exist
    const deals = await storage.getDeals();
    const dealMap = new Map<number, Deal>();
    deals.forEach(deal => dealMap.set(deal.id, deal));
    
    // Filter and enhance closing events
    const enhancedEvents = closingEvents
      .filter(event => dealMap.has(event.dealId))
      .map(event => {
        const deal = dealMap.get(event.dealId);
        return {
          ...event,
          dealName: deal?.name || 'Unknown Deal'
        };
      });
    
    res.json(enhancedEvents);
  } catch (error) {
    console.error('Error fetching closing schedule events:', error);
    res.status(500).json({ error: 'Failed to fetch closing schedule events' });
  }
});

// Get closing schedule events for a specific deal
router.get('/deal/:dealId', async (req: Request, res: Response) => {
  try {
    const dealId = parseInt(req.params.dealId);
    
    // First verify the deal exists
    const deal = await storage.getDeal(dealId);
    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }
    
    const closingEvents = await storage.getClosingScheduleEventsByDeal(dealId);
    res.json(closingEvents);
  } catch (error) {
    console.error(`Error fetching closing schedule events for deal ${req.params.dealId}:`, error);
    res.status(500).json({ error: 'Failed to fetch closing schedule events' });
  }
});

// Create a new closing schedule event
router.post('/', async (req: Request, res: Response) => {
  try {
    // Process input data
    let modifiedBody = { ...req.body };
    
    // Handle amountType field
    if (modifiedBody.amountType !== undefined) {
      // Make sure it's a valid value
      if (!['percentage', 'dollar'].includes(modifiedBody.amountType)) {
        modifiedBody.amountType = 'percentage'; // Default to percentage if invalid
      }
    } else {
      modifiedBody.amountType = 'percentage'; // Default value if not provided
    }
    
    // Convert date strings to Date objects
    const data = {
      ...modifiedBody,
      scheduledDate: modifiedBody.scheduledDate ? new Date(modifiedBody.scheduledDate) : new Date(),
      actualDate: modifiedBody.actualDate ? new Date(modifiedBody.actualDate) : undefined
    };
    
    const validatedData = insertClosingScheduleEventSchema.parse(data);
    const closingEvent = await storage.createClosingScheduleEvent(validatedData);
    
    // Create a timeline event for this closing schedule
    await storage.createTimelineEvent({
      dealId: closingEvent.dealId,
      eventType: 'closing_scheduled',
      content: `${closingEvent.eventName} scheduled for ${new Date(closingEvent.scheduledDate).toLocaleDateString()}${closingEvent.targetAmount ? ` with ${closingEvent.amountType === 'dollar' ? '$' + closingEvent.targetAmount.toLocaleString() : closingEvent.targetAmount + '%'}` : ''}`,
      createdBy: closingEvent.createdBy,
      metadata: {
        closingEventId: [closingEvent.id],
        closingEventType: [closingEvent.eventType]
      }
    });
    
    res.status(201).json(closingEvent);
  } catch (error) {
    console.error('Error creating closing schedule event:', error);
    res.status(400).json({ 
      error: 'Failed to create closing schedule event', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Update a closing schedule event status
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { status, actualDate, actualAmount } = req.body;
    
    if (!Object.values(CLOSING_EVENT_STATUS).includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }
    
    const updatedEvent = await storage.updateClosingScheduleEventStatus(id, status, actualDate, actualAmount);
    
    if (!updatedEvent) {
      return res.status(404).json({ error: 'Closing schedule event not found' });
    }
    
    // Create a timeline event for this status update
    if (status === CLOSING_EVENT_STATUS.COMPLETED) {
      const deal = await storage.getDeal(updatedEvent.dealId);
      await storage.createTimelineEvent({
        dealId: updatedEvent.dealId,
        eventType: 'note',
        content: `${updatedEvent.eventName} completed with ${actualAmount ? (updatedEvent.amountType === 'dollar' ? `$${actualAmount.toLocaleString()}` : `${actualAmount}%`) : 'an undisclosed amount'}`,
        createdBy: req.user?.id || updatedEvent.createdBy,
        metadata: {
          closingEventId: [updatedEvent.id],
          closingEventType: [updatedEvent.eventType],
          closingEventStatus: [status]
        }
      });
    }
    
    res.json(updatedEvent);
  } catch (error) {
    console.error(`Error updating closing schedule event ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to update closing schedule event' });
  }
});

export default router;