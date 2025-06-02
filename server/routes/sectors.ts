import { Router } from 'express';
import { getStorage } from '../storage';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Get unique sectors from existing deals
router.get('/', requireAuth, async (req, res) => {
  try {
    const storage = getStorage();
    const deals = await storage.getDeals();
    
    // Extract unique sectors from deals, filter out empty/null values
    const uniqueSectors = [...new Set(
      deals
        .map(deal => deal.sector)
        .filter(sector => sector && sector.trim() !== '')
        .sort()
    )];
    
    res.json(uniqueSectors);
  } catch (error) {
    console.error('Error fetching sectors:', error);
    res.status(500).json({ message: 'Failed to fetch sectors' });
  }
});

// Get unique company stages from existing deals
router.get('/company-stages', requireAuth, async (req, res) => {
  try {
    const storage = getStorage();
    const deals = await storage.getDeals();
    
    // Extract unique company stages from deals, filter out empty/null values
    const uniqueStages = [...new Set(
      deals
        .map(deal => deal.companyStage)
        .filter(stage => stage && stage.trim() !== '')
        .sort()
    )];
    
    res.json(uniqueStages);
  } catch (error) {
    console.error('Error fetching company stages:', error);
    res.status(500).json({ message: 'Failed to fetch company stages' });
  }
});

export default router;