import { Router } from 'express';
import { capitalCallController } from '../controllers/capital-call.controller';
import { requirePermission } from '../utils/permissions';

const router = Router();

// Get all capital calls
router.get('/', capitalCallController.getAllCapitalCalls.bind(capitalCallController));

// Get capital calls for calendar view
router.get('/calendar', capitalCallController.getCapitalCallsForCalendar.bind(capitalCallController));

// Get capital call by ID
router.get('/:id', capitalCallController.getCapitalCallById.bind(capitalCallController));

// Get capital calls by allocation
router.get('/allocation/:allocationId', capitalCallController.getCapitalCallsByAllocation.bind(capitalCallController));

// Get capital calls by deal
router.get('/deal/:dealId', capitalCallController.getCapitalCallsByDeal.bind(capitalCallController));

// Create a new capital call
router.post('/', 
  requirePermission('create', 'capital-call'), 
  capitalCallController.createCapitalCall.bind(capitalCallController)
);

// Update capital call status
router.patch('/:id/status', 
  requirePermission('edit', 'capital-call'), 
  capitalCallController.updateCapitalCallStatus.bind(capitalCallController)
);

// Update capital call dates
router.patch('/:id/dates', 
  requirePermission('edit', 'capital-call'), 
  capitalCallController.updateCapitalCallDates.bind(capitalCallController)
);

export default router;