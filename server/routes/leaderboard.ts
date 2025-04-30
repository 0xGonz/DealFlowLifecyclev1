import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { DealStageLabels } from "@shared/schema";

const router = Router();

// Get leaderboard data
router.get('/', async (req: Request, res: Response) => {
  try {
    const deals = await storage.getDeals();
    
    // For each deal, get stars and memos to calculate rankings
    const leaderboardItems = await Promise.all(deals.map(async (deal) => {
      const stars = await storage.getDealStars(deal.id);
      const memos = await storage.getMiniMemosByDeal(deal.id);
      
      // Calculate score from mini memos
      let score = 0;
      if (memos.length > 0) {
        score = Math.floor(memos.reduce((sum, memo) => sum + memo.score, 0) / memos.length);
      }
      
      // In a real app, this would be calculated from score history
      const change = Math.floor(Math.random() * 11) - 5; // Random number between -5 and 5
      
      return {
        id: deal.id,
        name: deal.name,
        stage: deal.stage,
        stageLabel: DealStageLabels[deal.stage],
        score: score,
        starCount: stars.length,
        change // Random trend for demo
      };
    }));
    
    // Sort by score (descending)
    const sortedItems = leaderboardItems.sort((a, b) => b.score - a.score);
    
    res.json(sortedItems);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch leaderboard data' });
  }
});

export default router;