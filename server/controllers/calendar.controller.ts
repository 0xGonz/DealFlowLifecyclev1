import { Request, Response } from 'express';
import { calendarService } from '../services/calendar.service';
import { z } from 'zod';
import { asyncHandler } from '../utils/errorHandlers';

/**
 * Calendar controller for unified calendar event handling
 */
export class CalendarController {
  /**
   * Get all calendar events aggregated from multiple sources
   * Supports optional date range filtering
   */
  getAllEvents = asyncHandler(async (req: Request, res: Response) => {
    try {
      // Parse and validate query parameters
      const querySchema = z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional()
      });

      const { startDate, endDate } = querySchema.parse(req.query);
      const dateRange = startDate || endDate ? { startDate, endDate } : undefined;

      // Fetch aggregated events using calendar service
      const events = await calendarService.getAllEvents(dateRange);
      
      return res.json(events);
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      return res.status(500).json({ 
        message: 'Failed to fetch calendar events',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Get event counts by type for summary/dashboard
   */
  getEventCounts = asyncHandler(async (req: Request, res: Response) => {
    try {
      const counts = await calendarService.getEventCounts();
      return res.json(counts);
    } catch (error) {
      console.error('Error fetching event counts:', error);
      return res.status(500).json({ 
        message: 'Failed to fetch event counts',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}

export const calendarController = new CalendarController();