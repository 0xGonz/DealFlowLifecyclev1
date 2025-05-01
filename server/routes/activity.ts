import { Router, Request, Response } from "express";
import { StorageFactory } from "../storage-factory";

const router = Router();

// Get activity feed
router.get('/', async (req: Request, res: Response) => {
  try {
    // In a real app, this would get recent activities across all deals
    // For MVP, we're returning a simplified feed
    
    // Get recent timeline events from all deals
    const storage = StorageFactory.getStorage();
    const deals = await storage.getDeals();
    const allEvents: Array<any> = [];
    
    for (const deal of deals) {
      const events = await storage.getTimelineEventsByDeal(deal.id);
      
      // Add deal info to each event
      const eventsWithDealInfo = events.map(event => ({
        ...event,
        deal: {
          id: deal.id,
          name: deal.name
        }
      }));
      
      allEvents.push(...eventsWithDealInfo);
    }
    
    // Sort by date (descending) and limit to latest 20
    const sortedEvents = allEvents.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ).slice(0, 20);
    
    // Get user info for each event
    const userIds = Array.from(new Set(sortedEvents.map(e => e.createdBy)));
    const users = await Promise.all(userIds.map(id => storage.getUser(id)));
    
    const eventsWithUserInfo = sortedEvents.map(event => {
      const user = users.find(u => u?.id === event.createdBy);
      return {
        ...event,
        user: user ? {
          id: user.id,
          fullName: user.fullName,
          initials: user.initials,
          avatarColor: user.avatarColor
        } : null
      };
    });
    
    res.json(eventsWithUserInfo);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch activity feed' });
  }
});

export default router;