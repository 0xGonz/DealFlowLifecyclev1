import { Router } from "express";
import { fundController } from "../controllers/fund.controller";
import { requireAuth } from "../utils/auth";


const router = Router();

// Fund routes
router.get('/', requireAuth, fundController.getFunds.bind(fundController));
router.get('/:id', requireAuth, fundController.getFundById.bind(fundController));

export default router;