import { Router } from "express";
import { dealController } from "../controllers/deal.controller";
import { requirePermission } from "../utils/permissions";

const router = Router();

// Deal routes
router.get('/', dealController.getDeals.bind(dealController));
router.get('/:id', dealController.getDealById.bind(dealController));
router.post('/', requirePermission('create', 'deal'), dealController.createDeal.bind(dealController));
router.patch('/:id', requirePermission('edit', 'deal'), dealController.updateDeal.bind(dealController));
router.delete('/:id', requirePermission('delete', 'deal'), dealController.deleteDeal.bind(dealController));

// Timeline routes
router.get('/:dealId/timeline', dealController.getDealTimeline.bind(dealController));
router.post('/:dealId/timeline', dealController.createTimelineEvent.bind(dealController));
router.put('/:dealId/timeline/:eventId', dealController.updateTimelineEvent.bind(dealController));
router.delete('/:dealId/timeline/:eventId', dealController.deleteTimelineEvent.bind(dealController));

// Star routes
router.get('/:dealId/stars', dealController.getDealStars.bind(dealController));
router.post('/:dealId/star', dealController.toggleDealStar.bind(dealController));

export default router;