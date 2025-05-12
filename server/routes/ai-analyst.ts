import { Router, Request, Response } from "express";
import { StorageFactory } from "../storage-factory";
import { z } from "zod";
import { insertAiAnalysisSchema } from "@shared/schema";
import { OpenAiService } from "../utils/openai-service";
import { requireAuth, requireRole } from "../utils/auth";

const storage = StorageFactory.getStorage();

const router = Router();

// Add authentication middleware
router.use(requireRole(['admin', 'partner', 'analyst']));

// Get AI analysis for a deal
router.get("/:dealId", async (req: Request, res: Response) => {
  try {
    const dealId = parseInt(req.params.dealId);
    if (isNaN(dealId)) {
      return res.status(400).json({ error: "Invalid deal ID" });
    }

    const analysis = await storage.getAiAnalysisByDeal(dealId);
    if (!analysis) {
      return res.status(404).json({ error: "No AI analysis found for this deal" });
    }

    return res.json(analysis);
  } catch (error) {
    console.error("Error fetching AI analysis:", error);
    return res.status(500).json({ error: "Failed to fetch AI analysis" });
  }
});

// Create or update AI analysis for a deal
router.post("/:dealId", async (req: Request, res: Response) => {
  try {
    const dealId = parseInt(req.params.dealId);
    if (isNaN(dealId)) {
      return res.status(400).json({ error: "Invalid deal ID" });
    }

    // First check if the deal exists
    const deal = await storage.getDeal(dealId);
    if (!deal) {
      return res.status(404).json({ error: "Deal not found" });
    }

    // Validate request body
    const validationSchema = insertAiAnalysisSchema.extend({
      // Additional runtime validation can be added here if needed
    });

    try {
      const analysisData = validationSchema.parse({
        ...req.body,
        dealId,
        createdBy: (req as any).user.id
      });

      // Check if analysis already exists
      const existingAnalysis = await storage.getAiAnalysisByDeal(dealId);
      if (existingAnalysis) {
        // Delete old analysis
        await storage.deleteAiAnalysis(existingAnalysis.id);
      }

      // Create new analysis
      const newAnalysis = await storage.createAiAnalysis(analysisData);

      // Add a timeline event for the analysis
      await storage.createTimelineEvent({
        dealId,
        eventType: 'ai_analysis',
        content: `AI analysis ${existingAnalysis ? 'updated' : 'created'} for this deal`,
        createdBy: (req as any).user.id,
        metadata: { analysisId: [newAnalysis.id] }
      });

      return res.status(201).json(newAnalysis);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data format", details: error.errors });
      }
      throw error;
    }
  } catch (error) {
    console.error("Error creating AI analysis:", error);
    return res.status(500).json({ error: "Failed to create AI analysis" });
  }
});

// Ask the AI a question about a deal
router.post("/:dealId/ask", async (req: Request, res: Response) => {
  try {
    const dealId = parseInt(req.params.dealId);
    if (isNaN(dealId)) {
      return res.status(400).json({ error: "Invalid deal ID" });
    }

    // Validate request body
    const questionSchema = z.object({
      question: z.string().min(1).max(1000)
    });

    try {
      const { question } = questionSchema.parse(req.body);

      // Check if deal exists
      const deal = await storage.getDeal(dealId);
      if (!deal) {
        return res.status(404).json({ error: "Deal not found" });
      }

      // Get related documents for the deal
      const documents = await storage.getDocumentsByDeal(dealId);
      
      // Memos are not currently implemented, so we'll pass an empty array
      const memos: any[] = [];

      // Call the OpenAI service to answer the question
      const aiResponse = await OpenAiService.answerQuestion(
        question,
        deal,
        documents,
        memos
      );

      return res.json(aiResponse);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data format", details: error.errors });
      }
      throw error;
    }
  } catch (error) {
    console.error("Error processing AI question:", error);
    return res.status(500).json({ error: "Failed to process question" });
  }
});

// Generate AI insights for a deal
router.post("/:dealId/insights", async (req: Request, res: Response) => {
  try {
    const dealId = parseInt(req.params.dealId);
    if (isNaN(dealId)) {
      return res.status(400).json({ error: "Invalid deal ID" });
    }

    // Check if deal exists
    const deal = await storage.getDeal(dealId);
    if (!deal) {
      return res.status(404).json({ error: "Deal not found" });
    }

    // Get related documents for the deal
    const documents = await storage.getDocumentsByDeal(dealId);
    
    // Memos are not currently implemented, so we'll pass an empty array
    const memos: any[] = [];

    // Use OpenAI service to generate insights
    const insights = await OpenAiService.generateInsights(
      deal,
      documents,
      memos
    );

    return res.json(insights);
  } catch (error) {
    console.error("Error generating AI insights:", error);
    return res.status(500).json({ error: "Failed to generate insights" });
  }
});

export default router;