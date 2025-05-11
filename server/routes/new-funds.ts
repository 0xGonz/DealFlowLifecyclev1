import { Router } from "express";
import { fundController } from "../controllers/fund.controller";
import { requirePermission } from "../utils/permissions";

const router = Router();

// Fund routes
router.get('/', fundController.getFunds.bind(fundController));
router.get('/:id', fundController.getFundById.bind(fundController));
router.post('/', requirePermission('create', 'fund'), fundController.createFund.bind(fundController));
router.patch('/:id', requirePermission('edit', 'fund'), fundController.updateFund.bind(fundController));
router.delete('/:id', requirePermission('delete', 'fund'), fundController.deleteFund.bind(fundController));

export default router;