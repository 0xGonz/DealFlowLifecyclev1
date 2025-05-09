import { Router, Request, Response } from "express";
import { StorageFactory } from "../storage-factory";
import { DealStageLabels, TimelineEvent } from "@shared/schema";

const router = Router();

// Helper function to calculate weights based on time
function calculateTimeWeight(date: Date | string): number {
  const activityDate = date instanceof Date ? date : new Date(date);
  const now = new Date();
  const daysDifference = Math.floor((now.getTime() - activityDate.getTime()) / (1000 * 3600 * 24));
  
  if (daysDifference <= 30) return 1.0;      // Last 30 days: 100%
  if (daysDifference <= 60) return 0.75;     // 30-60 days: 75%
  if (daysDifference <= 90) return 0.5;      // 60-90 days: 50%
  return 0.25;                              // Older than 90 days: 25%
}

// Calculate a weighted score based on multiple factors
function calculateWeightedScore(params: {
  baseScore: number; // Score from memos
  starCount: number; // Number of stars
  stage: string; // Deal stage
  recentActivity: number; // Recent activity count
}) {
  const { baseScore, starCount, stage, recentActivity } = params;
  
  // Weight factors (can be adjusted)
  const scoreWeight = 0.5; // 50% weight for memo scores
  const starWeight = 0.3; // 30% weight for stars
  const stageWeight = 0.1; // 10% weight for deal stage
  const activityWeight = 0.1; // 10% weight for recent activity
  
  // Calculate stage progression score (0-10)
  const stageProgression: Record<string, number> = {
    'initial_review': 2,
    'screening': 3,
    'diligence': 5,
    'ic_review': 7,
    'closing': 8,
    'closed': 9,
    'invested': 10,
    'rejected': 1,
    'passed': 1
  };
  
  // Star score (up to 10 for normalization)
  const starScore = Math.min(starCount * 2, 10);
  
  // Activity score (up to 10 for normalization)
  const activityScore = Math.min(recentActivity * 2, 10);
  
  // Calculate weighted score
  const weightedScore = (
    (baseScore || 0) * scoreWeight +
    starScore * starWeight +
    (stageProgression[stage] || 0) * stageWeight +
    activityScore * activityWeight
  );
  
  return Math.round(weightedScore * 10) / 10; // Round to 1 decimal place
}

// Get leaderboard data
router.get('/', async (req: Request, res: Response) => {
  try {
    const storage = StorageFactory.getStorage();
    let allDeals;
    try {
      allDeals = await storage.getDeals();
    } catch (error: any) {
      console.error('Database error when fetching deals:', error);
      return res.status(500).json({ message: 'Unable to fetch deal data due to database issues', error: error.message });
    }
    
    // Filter out deals in the "invested" stage as they're no longer part of the evaluation process
    const deals = allDeals.filter(deal => deal.stage !== 'invested');
    
    console.log(`Leaderboard: Found ${allDeals.length} total deals, ${deals.length} in active evaluation`);
    
    // For each deal, get stars and memos to calculate rankings
    const leaderboardItems = await Promise.all(deals.map(async (deal) => {
      const stars = await storage.getDealStars(deal.id);
      const memos = await storage.getMiniMemosByDeal(deal.id);
      const timelineEvents = await storage.getTimelineEventsByDeal(deal.id);
      
      // Calculate base score from mini memos
      let baseScore = 0;
      if (memos.length > 0) {
        baseScore = Math.floor(memos.reduce((sum, memo) => sum + memo.score, 0) / memos.length);
      }
      
      // Count recent activities (last 14 days)
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      const recentActivity = timelineEvents.filter(
        event => new Date(event.createdAt) > twoWeeksAgo
      ).length;
      
      // Calculate comprehensive score
      const score = calculateWeightedScore({
        baseScore,
        starCount: stars.length,
        stage: deal.stage,
        recentActivity
      });
      
      // Calculate score change
      // In a production app, this would use historical data
      // For demo purposes, we'll generate a change that's somewhat proportional to the score
      const changeMagnitude = Math.max(1, Math.floor(score / 2));
      const changeDirection = Math.random() > 0.3 ? 1 : -1; // 70% chance of positive change
      const change = changeDirection * (Math.floor(Math.random() * changeMagnitude) + 1);
      
      return {
        id: deal.id,
        name: deal.name,
        stage: deal.stage,
        stageLabel: DealStageLabels[deal.stage],
        score: score,
        starCount: stars.length,
        change,
        recentActivity
      };
    }));
    
    // Sort by score (descending)
    const sortedItems = leaderboardItems.sort((a, b) => b.score - a.score);
    
    res.json(sortedItems);
  } catch (error) {
    console.error('Error fetching leaderboard data:', error);
    res.status(500).json({ message: 'Failed to fetch leaderboard data' });
  }
});

// Deal leaderboard - This will be the same as the main leaderboard route for backward compatibility
router.get('/deals', async (req: Request, res: Response) => {
  try {
    const timePeriod = req.query.period || 'month';
    const storage = StorageFactory.getStorage();
    let allDeals;
    try {
      allDeals = await storage.getDeals();
    } catch (error: any) {
      console.error('Database error when fetching deals for leaderboard:', error);
      return res.status(500).json({ message: 'Unable to fetch deal data due to database issues', error: error.message });
    }
    
    // Filter out deals in the "invested" stage as they're no longer part of the evaluation process
    const deals = allDeals.filter(deal => deal.stage !== 'invested');
    
    // For each deal, get stars and memos to calculate rankings
    const leaderboardItems = await Promise.all(deals.map(async (deal) => {
      const stars = await storage.getDealStars(deal.id);
      const memos = await storage.getMiniMemosByDeal(deal.id);
      const timelineEvents = await storage.getTimelineEventsByDeal(deal.id);
      
      // Calculate base score from mini memos
      let baseScore = 0;
      if (memos.length > 0) {
        baseScore = Math.floor(memos.reduce((sum, memo) => sum + memo.score, 0) / memos.length);
      }
      
      // Filter events by time period
      let cutoffDate = new Date();
      switch (timePeriod) {
        case 'week': cutoffDate.setDate(cutoffDate.getDate() - 7); break;
        case 'month': cutoffDate.setDate(cutoffDate.getDate() - 30); break;
        case 'quarter': cutoffDate.setDate(cutoffDate.getDate() - 90); break;
        case 'year': cutoffDate.setDate(cutoffDate.getDate() - 365); break;
        default: cutoffDate.setDate(cutoffDate.getDate() - 30); break;
      }
      
      const recentActivity = timelineEvents.filter(
        event => new Date(event.createdAt) > cutoffDate
      ).length;
      
      // Calculate comprehensive score
      const score = calculateWeightedScore({
        baseScore,
        starCount: stars.length,
        stage: deal.stage,
        recentActivity
      });
      
      // Calculate score change based on event trend
      const previousCutoffDate = new Date(cutoffDate);
      previousCutoffDate.setDate(previousCutoffDate.getDate() - (cutoffDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24));
      
      const olderEvents = timelineEvents.filter(
        event => new Date(event.createdAt) > previousCutoffDate && new Date(event.createdAt) <= cutoffDate
      ).length;
      
      let change = 0;
      if (olderEvents > 0) {
        const percentChange = Math.round(((recentActivity - olderEvents) / olderEvents) * 100);
        change = Math.min(Math.max(percentChange, -5), 5); // Limit to -5 to +5 range
      } else if (recentActivity > 0) {
        change = 1; // If there were no older events but there are recent ones, it's a positive change
      }
      
      return {
        id: deal.id,
        name: deal.name,
        stage: deal.stage,
        stageLabel: DealStageLabels[deal.stage],
        score: score,
        starCount: stars.length,
        change,
        recentActivity
      };
    }));
    
    // Sort by score (descending)
    const sortedItems = leaderboardItems.sort((a, b) => b.score - a.score);
    
    res.json(sortedItems);
  } catch (error) {
    console.error('Error fetching deal leaderboard data:', error);
    res.status(500).json({ message: 'Failed to fetch deal leaderboard data' });
  }
});

// User leaderboard
router.get('/users', async (req: Request, res: Response) => {
  try {
    const timePeriod = req.query.period || 'month';
    const storage = StorageFactory.getStorage();
    
    // Get all users
    let users;
    try {
      users = await storage.getUsers();
    } catch (error: any) {
      console.error('Database error when fetching users for leaderboard:', error);
      return res.status(500).json({ message: 'Unable to fetch user data due to database issues', error: error.message });
    }
    
    // Calculate user leaderboard data
    const userLeaderboard = await Promise.all(users.map(async (user) => {
      // Get all activities by this user from various tables
      const [stars, assignments, documents, memos, timelineEvents, comments] = await Promise.all([
        storage.getUserStars(user.id),
        storage.getUserAssignments(user.id),
        storage.getDocumentsByUploader(user.id),
        storage.getMemosByUser(user.id),
        storage.getTimelineEventsByUser(user.id),
        storage.getMemoCommentsByUser(user.id)
      ]);
      
      // Filter by time period
      let cutoffDate = new Date();
      switch (timePeriod) {
        case 'week': cutoffDate.setDate(cutoffDate.getDate() - 7); break;
        case 'month': cutoffDate.setDate(cutoffDate.getDate() - 30); break;
        case 'quarter': cutoffDate.setDate(cutoffDate.getDate() - 90); break;
        case 'year': cutoffDate.setDate(cutoffDate.getDate() - 365); break;
        default: cutoffDate.setDate(cutoffDate.getDate() - 30); break;
      }
      
      // Apply time-based weighting to each activity
      const starsPoints = stars.reduce((total, star) => {
        return total + (1 * calculateTimeWeight(star.createdAt));
      }, 0);
      
      const assignmentsPoints = assignments.reduce((total, assignment) => {
        return total + (3 * calculateTimeWeight(assignment.createdAt));
      }, 0);
      
      const documentsPoints = documents.reduce((total, doc) => {
        // More points for critical document types
        const criticalDocTypes = ['diligence_report', 'financial_model', 'legal_document'];
        const weight = criticalDocTypes.includes(doc.documentType) ? 3 : 2;
        return total + (weight * calculateTimeWeight(doc.uploadedAt));
      }, 0);
      
      const memosPoints = memos.reduce((total, memo) => {
        // More points for longer, more detailed memos
        const detailLevel = memo.thesis.length > 500 ? 2 : 1;
        return total + (5 * detailLevel * calculateTimeWeight(memo.createdAt));
      }, 0);
      
      const timelinePoints = timelineEvents.reduce((total, event) => {
        return total + (2 * calculateTimeWeight(event.createdAt));
      }, 0);
      
      const commentsPoints = comments.reduce((total, comment) => {
        return total + (1 * calculateTimeWeight(comment.createdAt));
      }, 0);
      
      // Calculate total points
      const totalPoints = Math.round(
        starsPoints + 
        assignmentsPoints + 
        documentsPoints + 
        memosPoints + 
        timelinePoints + 
        commentsPoints
      );
      
      // Get previous period points to calculate trend
      const previousCutoffDate = new Date(cutoffDate);
      previousCutoffDate.setDate(previousCutoffDate.getDate() - (cutoffDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24));
      
      // Calculate previous period points using the same approach
      const previousStarsPoints = stars
        .filter(star => new Date(star.createdAt) > previousCutoffDate && new Date(star.createdAt) <= cutoffDate)
        .reduce((total, star) => total + 1, 0);
      
      const previousAssignmentsPoints = assignments
        .filter(assignment => new Date(assignment.createdAt) > previousCutoffDate && new Date(assignment.createdAt) <= cutoffDate)
        .reduce((total, assignment) => total + 3, 0);
      
      const previousDocumentsPoints = documents
        .filter(doc => new Date(doc.uploadedAt) > previousCutoffDate && new Date(doc.uploadedAt) <= cutoffDate)
        .reduce((total, doc) => {
          const criticalDocTypes = ['diligence_report', 'financial_model', 'legal_document'];
          const weight = criticalDocTypes.includes(doc.documentType) ? 3 : 2;
          return total + weight;
        }, 0);
      
      const previousMemosPoints = memos
        .filter(memo => new Date(memo.createdAt) > previousCutoffDate && new Date(memo.createdAt) <= cutoffDate)
        .reduce((total, memo) => {
          const detailLevel = memo.thesis.length > 500 ? 2 : 1;
          return total + (5 * detailLevel);
        }, 0);
      
      const previousTimelinePoints = timelineEvents
        .filter(event => new Date(event.createdAt) > previousCutoffDate && new Date(event.createdAt) <= cutoffDate)
        .reduce((total, event) => total + 2, 0);
      
      const previousCommentsPoints = comments
        .filter(comment => new Date(comment.createdAt) > previousCutoffDate && new Date(comment.createdAt) <= cutoffDate)
        .reduce((total, comment) => total + 1, 0);
      
      const previousTotalPoints = previousStarsPoints + 
        previousAssignmentsPoints + 
        previousDocumentsPoints + 
        previousMemosPoints + 
        previousTimelinePoints + 
        previousCommentsPoints;
      
      // Calculate trend
      const trend = totalPoints - previousTotalPoints;
      
      // Determine top categories
      const categoryPoints = [
        { name: 'Star', points: starsPoints },
        { name: 'Assignment', points: assignmentsPoints },
        { name: 'Document', points: documentsPoints },
        { name: 'Memo', points: memosPoints },
        { name: 'Timeline', points: timelinePoints },
        { name: 'Comment', points: commentsPoints }
      ].sort((a, b) => b.points - a.points);
      
      const topCategories = categoryPoints
        .filter(category => category.points > 0)
        .slice(0, 2)
        .map(category => category.name);
      
      // Find last active date
      const allDates = [
        ...stars.map(star => new Date(star.createdAt)),
        ...assignments.map(assignment => new Date(assignment.createdAt)),
        ...documents.map(doc => new Date(doc.uploadedAt)),
        ...memos.map(memo => new Date(memo.createdAt)),
        ...timelineEvents.map(event => new Date(event.createdAt)),
        ...comments.map(comment => new Date(comment.createdAt))
      ].sort((a, b) => b.getTime() - a.getTime());
      
      const lastActiveDate = allDates.length > 0 ? allDates[0].toISOString() : new Date().toISOString();
      
      return {
        id: user.id,
        userId: user.id,
        fullName: user.fullName,
        role: user.role,
        avatarColor: user.avatarColor,
        initials: user.initials,
        totalPoints,
        previousPoints: previousTotalPoints,
        trend,
        pointsBreakdown: {
          starsGiven: Math.round(starsPoints),
          assignmentsCompleted: Math.round(assignmentsPoints),
          documentsUploaded: Math.round(documentsPoints),
          memosWritten: Math.round(memosPoints),
          timelineUpdates: Math.round(timelinePoints),
          commentsAdded: Math.round(commentsPoints)
        },
        topCategories,
        lastActiveDate
      };
    }));
    
    // Sort by total points (descending)
    const sortedUserLeaderboard = userLeaderboard
      .filter(user => user.totalPoints > 0) // Only include users with activity
      .sort((a, b) => b.totalPoints - a.totalPoints);
    
    res.json(sortedUserLeaderboard);
  } catch (error) {
    console.error('Error fetching user leaderboard data:', error);
    res.status(500).json({ message: 'Failed to fetch user leaderboard data' });
  }
});

// Category leaders
router.get('/categories', async (req: Request, res: Response) => {
  try {
    const timePeriod = req.query.period || 'month';
    const storage = StorageFactory.getStorage();
    
    // Get all users
    let users;
    try {
      users = await storage.getUsers();
    } catch (error: any) {
      console.error('Database error when fetching users for category leaders:', error);
      return res.status(500).json({ message: 'Unable to fetch user data due to database issues', error: error.message });
    }
    
    // Define categories
    const categories = [
      { id: 'documents', name: 'Most Documents' },
      { id: 'memos', name: 'Most Memos' },
      { id: 'stars', name: 'Most Stars Given' },
      { id: 'assignments', name: 'Most Assignments' },
      { id: 'timeline', name: 'Most Timeline Updates' },
      { id: 'comments', name: 'Most Comments' }
    ];
    
    // Filter by time period
    let cutoffDate = new Date();
    switch (timePeriod) {
      case 'week': cutoffDate.setDate(cutoffDate.getDate() - 7); break;
      case 'month': cutoffDate.setDate(cutoffDate.getDate() - 30); break;
      case 'quarter': cutoffDate.setDate(cutoffDate.getDate() - 90); break;
      case 'year': cutoffDate.setDate(cutoffDate.getDate() - 365); break;
      default: cutoffDate.setDate(cutoffDate.getDate() - 30); break;
    }
    
    // Calculate category leaders
    const categoryResults = await Promise.all(categories.map(async (category) => {
      // Get data for this category from all users
      const userData = await Promise.all(users.map(async (user) => {
        let count = 0;
        
        switch (category.id) {
          case 'documents':
            const documents = await storage.getDocumentsByUploader(user.id);
            count = documents.filter(doc => new Date(doc.uploadedAt) > cutoffDate).length;
            break;
          case 'memos':
            const memos = await storage.getMemosByUser(user.id);
            count = memos.filter(memo => new Date(memo.createdAt) > cutoffDate).length;
            break;
          case 'stars':
            const stars = await storage.getUserStars(user.id);
            count = stars.filter(star => new Date(star.createdAt) > cutoffDate).length;
            break;
          case 'assignments':
            const assignments = await storage.getUserAssignments(user.id);
            count = assignments.filter(assignment => new Date(assignment.createdAt) > cutoffDate).length;
            break;
          case 'timeline':
            const timelineEvents = await storage.getTimelineEventsByUser(user.id);
            count = timelineEvents.filter(event => new Date(event.createdAt) > cutoffDate).length;
            break;
          case 'comments':
            const comments = await storage.getMemoCommentsByUser(user.id);
            count = comments.filter(comment => new Date(comment.createdAt) > cutoffDate).length;
            break;
        }
        
        return { user, count };
      }));
      
      // Find the leader for this category
      const sortedUsers = userData
        .filter(data => data.count > 0)
        .sort((a, b) => b.count - a.count);
      
      // Return category with leader (if found)
      if (sortedUsers.length > 0) {
        const leader = sortedUsers[0];
        return {
          categoryName: category.name,
          categoryId: category.id,
          user: {
            id: leader.user.id,
            fullName: leader.user.fullName,
            initials: leader.user.initials,
            avatarColor: leader.user.avatarColor
          },
          count: leader.count
        };
      }
      return null;
    }));
    
    // Filter out categories with no leaders
    const validCategories = categoryResults.filter(cat => cat !== null);
    
    res.json(validCategories);
  } catch (error) {
    console.error('Error fetching category leaders:', error);
    res.status(500).json({ message: 'Failed to fetch category leaders' });
  }
});

export default router;