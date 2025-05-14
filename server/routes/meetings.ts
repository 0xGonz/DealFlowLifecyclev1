import express from 'express';
import { 
  getMeetings, 
  createMeeting,
  getMeetingById,
  updateMeeting,
  deleteMeeting,
  getMeetingsByDeal
} from '../controllers/meeting.controller';
import { requireAuth } from '../utils/auth';

const router = express.Router();

// GET /api/meetings - Get all meetings
router.get('/', requireAuth, getMeetings);

// POST /api/meetings - Create a new meeting
router.post('/', requireAuth, createMeeting);

// GET /api/meetings/deal/:dealId - Get meetings for a specific deal
router.get('/deal/:dealId', requireAuth, getMeetingsByDeal);

// GET /api/meetings/:id - Get a meeting by ID
router.get('/:id', requireAuth, getMeetingById);

// PUT /api/meetings/:id - Update a meeting
router.put('/:id', requireAuth, updateMeeting);

// DELETE /api/meetings/:id - Delete a meeting
router.delete('/:id', requireAuth, deleteMeeting);

export default router;