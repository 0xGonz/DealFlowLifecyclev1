import { Router } from "express";
import { requireAuth } from "../utils/auth";
import { fundController } from "../controllers/fund.controller";

const router = Router();

// Get all funds with allocations and statistics
router.get('/', requireAuth, fundController.getFunds.bind(fundController));

// Get specific fund by ID
router.get('/:id', requireAuth, fundController.getFundById.bind(fundController));

// Create new fund
router.post('/', requireAuth, fundController.createFund.bind(fundController));

// Update fund
router.patch('/:id', requireAuth, fundController.updateFund.bind(fundController));

// Get fund deletion preview (must come before the general /:id route)
router.get('/:id/deletion-preview', requireAuth, fundController.getFundDeletionPreview.bind(fundController));

// Delete fund
router.delete('/:id', requireAuth, fundController.deleteFund.bind(fundController));

export default router;