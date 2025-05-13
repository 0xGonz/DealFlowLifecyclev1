import { Router } from "express";
import { dealController } from "../controllers/deal.controller";
import { requireAuth } from "../utils/auth";
import { requirePermission } from "../utils/permissions";

const router = Router();

// Deal routes
router.get('/', requireAuth, dealController.getDeals.bind(dealController));
router.get('/:id', requireAuth, dealController.getDealById.bind(dealController));
router.post('/', requireAuth, requirePermission('create', 'deal'), dealController.createDeal.bind(dealController));
router.patch('/:id', requireAuth, requirePermission('edit', 'deal'), dealController.updateDeal.bind(dealController));
router.delete('/:id', requireAuth, requirePermission('delete', 'deal'), dealController.deleteDeal.bind(dealController));

// Timeline routes
router.get('/:dealId/timeline', requireAuth, dealController.getDealTimeline.bind(dealController));
router.post('/:dealId/timeline', requireAuth, dealController.createTimelineEvent.bind(dealController));
router.put('/:dealId/timeline/:eventId', requireAuth, dealController.updateTimelineEvent.bind(dealController));
router.delete('/:dealId/timeline/:eventId', requireAuth, dealController.deleteTimelineEvent.bind(dealController));

// Star routes
router.get('/:dealId/stars', requireAuth, dealController.getDealStars.bind(dealController));
router.post('/:dealId/star', requireAuth, dealController.toggleDealStar.bind(dealController));

export default router;