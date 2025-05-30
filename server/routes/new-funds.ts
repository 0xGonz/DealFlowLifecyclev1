import { Router } from "express";
import { fundController } from "../controllers/fund.controller";
import { requireAuth } from "../utils/auth";


const router = Router();

// Fund routes
router.get('/', requireAuth, fundController.getFunds.bind(fundController));
router.get('/:id', requireAuth, fundController.getFundById.bind(fundController));
router.post('/', requireAuth, requirePermission('create', 'fund'), fundController.createFund.bind(fundController));
router.patch('/:id', requireAuth, requirePermission('edit', 'fund'), fundController.updateFund.bind(fundController));
router.delete('/:id', requireAuth, requirePermission('delete', 'fund'), fundController.deleteFund.bind(fundController));

export default router;