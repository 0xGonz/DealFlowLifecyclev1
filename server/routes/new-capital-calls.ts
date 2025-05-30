import { Router } from 'express';
import { capitalCallController } from '../controllers/capital-call.controller';
import { requireAuth } from '../utils/auth';


const router = Router();

// Get all capital calls
router.get('/', requireAuth, capitalCallController.getAllCapitalCalls.bind(capitalCallController));

// Get capital calls for calendar view
router.get('/calendar', requireAuth, capitalCallController.getCapitalCallsForCalendar.bind(capitalCallController));

// Get capital call by ID
router.get('/:id', requireAuth, capitalCallController.getCapitalCallById.bind(capitalCallController));

// Get capital calls by allocation
router.get('/allocation/:allocationId', requireAuth, capitalCallController.getCapitalCallsByAllocation.bind(capitalCallController));

// Get capital calls by deal
router.get('/deal/:dealId', requireAuth, capitalCallController.getCapitalCallsByDeal.bind(capitalCallController));

// Create a new capital call
router.post('/', 
  requireAuth,
  requirePermission('create', 'capital-call'), 
  capitalCallController.createCapitalCall.bind(capitalCallController)
);

// Update capital call status
router.patch('/:id/status', 
  requireAuth,
  requirePermission('edit', 'capital-call'), 
  capitalCallController.updateCapitalCallStatus.bind(capitalCallController)
);

// Update capital call dates
router.patch('/:id/dates', 
  requireAuth,
  requirePermission('edit', 'capital-call'), 
  capitalCallController.updateCapitalCallDates.bind(capitalCallController)
);

export default router;