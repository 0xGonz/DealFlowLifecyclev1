import express from 'express';
import { 
  getMeetings, 
  createMeeting,
  getMeetingById,
  updateMeeting,
  deleteMeeting
} from '../controllers/meeting.controller';

const router = express.Router();

// GET /api/meetings - Get all meetings
router.get('/', getMeetings);

// POST /api/meetings - Create a new meeting
router.post('/', createMeeting);

// GET /api/meetings/:id - Get a meeting by ID
router.get('/:id', getMeetingById);

// PUT /api/meetings/:id - Update a meeting
router.put('/:id', updateMeeting);

// DELETE /api/meetings/:id - Delete a meeting
router.delete('/:id', deleteMeeting);

export default router;