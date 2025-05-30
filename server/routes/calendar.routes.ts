import express from 'express';
import { calendarController } from '../controllers/calendar.controller';
import { requireAuth } from '../utils/auth';

const router = express.Router();

/**
 * @route GET /api/calendar/events
 * @desc Get all calendar events (meetings, capital calls, closing schedules)
 * @access Private
 */
router.get('/events', requireAuth, calendarController.getAllEvents);

/**
 * @route GET /api/calendar/counts
 * @desc Get counts of upcoming events by type
 * @access Private
 */
router.get('/counts', requireAuth, calendarController.getEventCounts);

export default router;