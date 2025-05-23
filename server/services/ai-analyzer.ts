import OpenAI from 'openai';
import { StorageFactory } from '../storage-factory';
import { DataExtractor } from './data-extractor';
import * as fs from 'fs';
import * as path from 'path';

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface DealContext {
  deal: any;
  memos: any[];
  documents: any[];
  extractedData: any[];
  allocations: any[];
  activities: any[];
}

export interface AnalysisResponse {
  response: string;
  context: {
    dealId: number;
    dealName: string;
    dataSourcesUsed: string[];
    timestamp: Date;
  };
}

export class AIAnalyzer {
  
  /**
   * Extract all contextual data for a specific deal
   */
  static async extractDealContext(dealId: number): Promise<DealContext> {
    const storage = StorageFactory.getStorage();
    
    console.log(`🔍 Extracting full context for deal ${dealId}`);
    
    // Get the main deal information
    const deal = await storage.getDeal(dealId);
    if (!deal) {
      throw new Error(`Deal ${dealId} not found`);
    }
    
    // Get all related data
    const [memos, documents, allocations] = await Promise.all([
      storage.getMiniMemosByDeal(dealId),
      storage.getDocumentsByDeal(dealId),
      storage.getAllocationsByDeal(dealId)
    ]);
    
    // Get activities manually for now (will add proper method later)
    const dealActivities: any[] = [];
    
    // Extract data from Excel/CSV documents
    const extractedData: any[] = [];
    for (const doc of documents) {
      const extension = path.extname(doc.fileName).toLowerCase();
      if (['.xlsx', '.xls', '.xlsm', '.csv'].includes(extension)) {
        try {
          // Find the actual file path
          const UPLOAD_PATH = process.env.UPLOAD_PATH || './uploads';
          const possiblePaths = [
            path.resolve(UPLOAD_PATH, 'deals', dealId.toString(), doc.fileName),
            path.resolve(UPLOAD_PATH, dealId.toString(), doc.fileName),
            path.resolve(UPLOAD_PATH, doc.fileName),
            path.resolve(doc.filePath)
          ];
          
          let actualFilePath = null;
          for (const testPath of possiblePaths) {
            if (fs.existsSync(testPath)) {
              actualFilePath = testPath;
              break;
            }
          }
          
          if (actualFilePath) {
            const data = await DataExtractor.extractData(actualFilePath, doc.fileName);
            extractedData.push({
              documentId: doc.id,
              fileName: doc.fileName,
              documentType: doc.documentType,
              extractedData: data
            });
            console.log(`📊 Extracted data from ${doc.fileName}: ${data.metadata.totalRows} rows`);
          }
        } catch (error) {
          console.error(`Failed to extract data from ${doc.fileName}:`, error);
        }
      }
    }
    
    console.log(`✅ Extracted context for ${deal.name}: ${memos.length} memos, ${documents.length} documents, ${extractedData.length} data files`);
    
    return {
      deal,
      memos,
      documents,
      extractedData,
      allocations,
      activities: dealActivities
    };
  }

  /**
   * Format deal context into a comprehensive prompt for AI analysis
   */
  static formatDealContextForAI(context: DealContext): string {
    const { deal, memos, documents, extractedData, allocations, activities } = context;
    
    let prompt = `# DEAL ANALYSIS CONTEXT\n\n`;
    
    // Deal Overview
    prompt += `## DEAL OVERVIEW\n`;
    prompt += `**Name:** ${deal.name}\n`;
    prompt += `**Sector:** ${deal.sector || 'Not specified'}\n`;
    prompt += `**Stage:** ${deal.stage} (${deal.stageLabel})\n`;
    prompt += `**Description:** ${deal.description || 'No description provided'}\n`;
    prompt += `**Target Return:** ${deal.targetReturn || 'Not specified'}\n`;
    prompt += `**Score:** ${deal.score || 0}\n`;
    prompt += `**Contact:** ${deal.contactEmail || 'Not specified'}\n`;
    prompt += `**Created:** ${new Date(deal.createdAt).toLocaleDateString()}\n`;
    if (deal.targetRaise) prompt += `**Target Raise:** ${deal.targetRaise}\n`;
    if (deal.valuation) prompt += `**Valuation:** ${deal.valuation}\n`;
    if (deal.leadInvestor) prompt += `**Lead Investor:** ${deal.leadInvestor}\n`;
    if (deal.projectedIrr) prompt += `**Projected IRR:** ${deal.projectedIrr}\n`;
    if (deal.projectedMultiple) prompt += `**Projected Multiple:** ${deal.projectedMultiple}\n`;
    if (deal.notes) prompt += `**Notes:** ${deal.notes}\n`;
    prompt += `\n`;

    // Investment Memos
    if (memos.length > 0) {
      prompt += `## INVESTMENT MEMOS (${memos.length})\n`;
      memos.forEach((memo, index) => {
        prompt += `### Memo ${index + 1} (Score: ${memo.score})\n`;
        prompt += `**Thesis:** ${memo.thesis}\n`;
        if (memo.risksAndMitigations) prompt += `**Risks & Mitigations:** ${memo.risksAndMitigations}\n`;
        if (memo.pricingConsideration) prompt += `**Pricing:** ${memo.pricingConsideration}\n`;
        if (memo.marketRiskScore) prompt += `**Market Risk Score:** ${memo.marketRiskScore}\n`;
        if (memo.executionRiskScore) prompt += `**Execution Risk Score:** ${memo.executionRiskScore}\n`;
        if (memo.teamStrengthScore) prompt += `**Team Strength Score:** ${memo.teamStrengthScore}\n`;
        if (memo.competitiveAdvantageScore) prompt += `**Competitive Advantage Score:** ${memo.competitiveAdvantageScore}\n`;
        prompt += `**Created:** ${new Date(memo.createdAt).toLocaleDateString()}\n\n`;
      });
    }

    // Documents
    if (documents.length > 0) {
      prompt += `## DOCUMENTS (${documents.length})\n`;
      documents.forEach((doc, index) => {
        prompt += `### Document ${index + 1}: ${doc.fileName}\n`;
        prompt += `**Type:** ${doc.documentType}\n`;
        prompt += `**Size:** ${Math.round(doc.fileSize / 1024)} KB\n`;
        if (doc.description) prompt += `**Description:** ${doc.description}\n`;
        prompt += `**Uploaded:** ${new Date(doc.uploadedAt).toLocaleDateString()}\n\n`;
      });
    }

    // Extracted Financial Data
    if (extractedData.length > 0) {
      prompt += `## FINANCIAL DATA EXTRACTED FROM DOCUMENTS\n`;
      extractedData.forEach((data, index) => {
        prompt += `### Data from ${data.fileName} (${data.documentType})\n`;
        prompt += DataExtractor.formatForAI(data.extractedData);
        prompt += `\n`;
      });
    }

    // Allocations
    if (allocations.length > 0) {
      prompt += `## FUND ALLOCATIONS (${allocations.length})\n`;
      allocations.forEach((allocation, index) => {
        prompt += `### Allocation ${index + 1}\n`;
        prompt += `**Amount:** $${allocation.amount?.toLocaleString() || 'Not specified'}\n`;
        prompt += `**Security Type:** ${allocation.securityType}\n`;
        prompt += `**Status:** ${allocation.status}\n`;
        prompt += `**Date:** ${new Date(allocation.allocationDate).toLocaleDateString()}\n`;
        if (allocation.notes) prompt += `**Notes:** ${allocation.notes}\n`;
        prompt += `\n`;
      });
    }

    // Recent Activities
    if (activities.length > 0) {
      prompt += `## RECENT ACTIVITIES (${Math.min(activities.length, 10)})\n`;
      activities.slice(0, 10).forEach((activity, index) => {
        prompt += `### ${new Date(activity.createdAt).toLocaleDateString()}: ${activity.content}\n`;
        if (activity.metadata) {
          prompt += `**Details:** ${JSON.stringify(activity.metadata)}\n`;
        }
        prompt += `\n`;
      });
    }

    prompt += `\n---\n\n`;
    prompt += `This is all the available data for the deal "${deal.name}". `;
    prompt += `Please provide analysis and insights based ONLY on this specific deal data. `;
    prompt += `Do not make assumptions about data not provided above.\n\n`;

    return prompt;
  }

  /**
   * Analyze a specific deal using AI
   */
  static async analyzeDeal(dealId: number, userQuery?: string): Promise<AnalysisResponse> {
    try {
      console.log(`🤖 Starting AI analysis for deal ${dealId}`);
      
      // Extract all deal context
      const context = await this.extractDealContext(dealId);
      const dealPrompt = this.formatDealContextForAI(context);
      
      // Prepare the system message for investment analysis
      const systemMessage = `You are an expert investment analyst with deep knowledge of private equity, venture capital, and institutional investing. You analyze deals comprehensively based on provided data.

Key responsibilities:
- Provide detailed investment analysis based ONLY on the provided deal data
- Identify strengths, weaknesses, opportunities, and risks
- Analyze financial metrics and projections when available
- Evaluate team, market, and competitive positioning
- Assess valuation and return potential
- Highlight key concerns or red flags
- Suggest areas for further due diligence

Always base your analysis on the actual data provided. If information is missing, clearly state what additional data would be helpful for a complete analysis.`;

      const userMessage = userQuery 
        ? `Based on the deal data below, please answer this specific question: "${userQuery}"\n\n${dealPrompt}`
        : `Please provide a comprehensive investment analysis of this deal based on the data below:\n\n${dealPrompt}`;

      // Call OpenAI API
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: userMessage }
        ],
        max_tokens: 2000,
        temperature: 0.3
      });

      const response = completion.choices[0]?.message?.content || 'No analysis generated';
      
      // Determine data sources used
      const dataSourcesUsed = [];
      if (context.memos.length > 0) dataSourcesUsed.push(`${context.memos.length} investment memos`);
      if (context.documents.length > 0) dataSourcesUsed.push(`${context.documents.length} documents`);
      if (context.extractedData.length > 0) dataSourcesUsed.push(`${context.extractedData.length} financial data files`);
      if (context.allocations.length > 0) dataSourcesUsed.push(`${context.allocations.length} allocations`);
      if (context.activities.length > 0) dataSourcesUsed.push(`${context.activities.length} activities`);

      console.log(`✅ AI analysis complete for ${context.deal.name}`);

      return {
        response,
        context: {
          dealId,
          dealName: context.deal.name,
          dataSourcesUsed,
          timestamp: new Date()
        }
      };

    } catch (error) {
      console.error('AI analysis failed:', error);
      throw new Error(`Failed to analyze deal: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}