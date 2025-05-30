import { Router, Request, Response } from "express";
import { pool } from '../db';
import { requireAuth } from "../utils/auth";

const router = Router();

// Get activity feed with improved error handling and performance
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    console.log('Activity feed request received');
    
    // Use a timeout to prevent long-running queries
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Activity feed query timed out')), 8000)
    );
    
    // First check if we can get deals to avoid long processing if database is unavailable
    const dealsResult = await Promise.race([
      pool.query('SELECT id, name FROM deals ORDER BY id DESC LIMIT 100'),
      timeoutPromise
    ]) as any;
    
    const deals = dealsResult.rows;
    
    if (!deals || !Array.isArray(deals)) {
      console.error('Failed to retrieve deals for activity feed');
      return res.status(404).json({ message: 'No deals available' });
    }
    
    console.log(`Retrieved ${deals.length} deals for activity feed`);
    
    // Get only the most recent events for better performance
    // Limit to 100 deals or less to avoid excessive queries
    const dealsToProcess = deals.slice(0, 100);
    const allEvents: Array<any> = [];
    
    // Process deals in batches to avoid memory issues
    const BATCH_SIZE = 10;
    for (let i = 0; i < dealsToProcess.length; i += BATCH_SIZE) {
      const batch = dealsToProcess.slice(i, i + BATCH_SIZE);
      const batchEvents = await Promise.all(
        batch.map(async (deal) => {
          try {
            // Only get the 5 most recent events per deal for better performance
            const eventsResult = await pool.query(
              `SELECT a.*, u.full_name, u.initials, u.avatar_color, u.role 
               FROM activities a 
               LEFT JOIN users u ON a.created_by = u.id 
               WHERE a.deal_id = $1 
               ORDER BY a.created_at DESC 
               LIMIT 5`,
              [deal.id]
            );
            const events = eventsResult.rows;
            
            // Add deal info to each event
            return events.map((event: any) => ({
              ...event,
              deal: {
                id: deal.id,
                name: deal.name,
                stageLabel: deal.stage
              },
              user: {
                id: event.created_by,
                fullName: event.full_name,
                initials: event.initials,
                avatarColor: event.avatar_color,
                role: event.role
              }
            }));
          } catch (err) {
            console.error(`Error fetching events for deal ${deal.id}:`, err);
            return []; // Return empty array for this deal instead of failing
          }
        })
      );
      
      // Flatten the batch events and add to all events
      for (const events of batchEvents) {
        allEvents.push(...events);
      }
    }
    
    console.log(`Retrieved ${allEvents.length} events for activity feed`);
    
    // Sort by date (descending) and limit to latest 20
    const sortedEvents = allEvents.sort((a: any, b: any) => 
      new Date(b.created_at || b.createdAt).getTime() - new Date(a.created_at || a.createdAt).getTime()
    ).slice(0, 20);
    
    console.log(`Retrieved ${sortedEvents.length} sorted events for activity feed`);
    
    // Return the events (user info is already included from the join query)
    const eventsWithUserInfo = sortedEvents;
    
    console.log('Activity feed successfully generated');
    res.json(eventsWithUserInfo);
  } catch (error) {
    console.error('Error generating activity feed:', error);
    // Return a more specific error message with a 500 status
    res.status(500).json({ 
      message: 'Failed to fetch activity feed',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

export default router;