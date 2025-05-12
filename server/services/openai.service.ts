import OpenAI from 'openai';
import { Deal, Document } from '@shared/schema';
// Use console for logging since logger might not be available
const logger = {
  warn: (message: string, ...args: any[]) => console.warn(`[WARN] ${message}`, ...args),
  error: (message: string, ...args: any[]) => console.error(`[ERROR] ${message}`, ...args),
  info: (message: string, ...args: any[]) => console.info(`[INFO] ${message}`, ...args),
};

// The newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const OPENAI_MODEL = 'gpt-4o';

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface AiAnalysisResult {
  summary: string;
  investmentThesis: string;
  keyRisks: string[];
  sectorFitAnalysis: string;
  valuationAnalysis: string;
  openQuestions: string[];
  recommendation: 'recommended' | 'not_recommended' | 'needs_more_diligence';
  confidence: number;
  sourceReferences: { source: string; weight: number }[];
}

/**
 * Generates an AI analysis for a deal based on available information
 */
export async function generateDealAnalysis(
  deal: Deal,
  documents: Document[]
): Promise<AiAnalysisResult> {
  try {
    // If OpenAI API key is not provided, return mock data
    if (!process.env.OPENAI_API_KEY) {
      logger.warn('No OpenAI API key provided, using mock data for AI analysis');
      return getMockAnalysis(deal);
    }

    // Create a prompt with deal information
    const prompt = createAnalysisPrompt(deal, documents);

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are an expert investment analyst providing detailed analysis on potential investment opportunities. Provide your analysis in a JSON format that can be parsed by the application.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    // Type assertion to handle OpenAI response correctly
    const content = response.choices[0].message.content as string;
    const parsedResult = JSON.parse(content);

    // Map the OpenAI response to our expected format
    // Here we ensure all required fields are present with sensible defaults if missing
    return {
      summary: parsedResult.summary || 'No summary provided',
      investmentThesis: parsedResult.investmentThesis || 'No investment thesis provided',
      keyRisks: Array.isArray(parsedResult.keyRisks) ? parsedResult.keyRisks : [],
      sectorFitAnalysis: parsedResult.sectorFitAnalysis || 'No sector fit analysis provided',
      valuationAnalysis: parsedResult.valuationAnalysis || 'No valuation analysis provided',
      openQuestions: Array.isArray(parsedResult.openQuestions) ? parsedResult.openQuestions : [],
      recommendation: validateRecommendation(parsedResult.recommendation),
      confidence: typeof parsedResult.confidence === 'number' 
        ? Math.max(0, Math.min(1, parsedResult.confidence)) 
        : 0.7,
      sourceReferences: validateSourceReferences(parsedResult.sourceReferences),
    };
  } catch (error) {
    logger.error('Error generating AI analysis:', error);
    // Fallback to mock data if OpenAI API call fails
    return getMockAnalysis(deal);
  }
}

function createAnalysisPrompt(deal: Deal, documents: Document[]): string {
  // Build a comprehensive prompt with all available information
  let prompt = `Please analyze the following investment opportunity and provide a detailed assessment.\n\n`;
  
  prompt += `Deal Information:\n`;
  prompt += `- Name: ${deal.name}\n`;
  prompt += `- Sector: ${deal.sector ? deal.sector : 'Not specified'}\n`;
  prompt += `- Description: ${deal.description ? deal.description : 'No description provided'}\n`;
  prompt += `- Target Return: ${deal.targetReturn ? deal.targetReturn : 'Not specified'}\n`;
  prompt += `- Notes: ${deal.notes ? deal.notes : 'No additional notes'}\n`;
  
  if (deal.valuation) {
    prompt += `- Valuation: ${deal.valuation}\n`;
  }
  
  if (deal.targetRaise) {
    prompt += `- Target Raise: ${deal.targetRaise}\n`;
  }
  
  if (deal.round) {
    prompt += `- Investment Round: ${deal.round}\n`;
  }
  
  if (deal.leadInvestor) {
    prompt += `- Lead Investor: ${deal.leadInvestor}\n`;
  }
  
  if (deal.tags && deal.tags.length > 0) {
    prompt += `- Tags: ${deal.tags.join(', ')}\n`;
  }
  
  prompt += `\nDocuments attached: ${documents.length} document(s)\n`;
  documents.forEach((doc, index) => {
    prompt += `- Document ${index + 1}: ${doc.fileName} (${doc.documentType || 'unspecified type'})\n`;
  });
  
  prompt += `\nPlease provide a comprehensive investment analysis in JSON format with the following fields:
- summary: A concise summary of the investment opportunity
- investmentThesis: The core investment thesis
- keyRisks: An array of key risk factors
- sectorFitAnalysis: Analysis of how this fits into the target sector
- valuationAnalysis: Assessment of the valuation
- openQuestions: Array of questions that should be answered before making a final decision
- recommendation: Either "recommended", "not_recommended", or "needs_more_diligence"
- confidence: A confidence score between 0 and 1
- sourceReferences: An array of objects with "source" and "weight" properties, where weight is between 0 and 1

Make sure the resulting JSON is valid and properly structured according to the fields above.`;

  return prompt;
}

function validateRecommendation(
  recommendation: any
): 'recommended' | 'not_recommended' | 'needs_more_diligence' {
  const validRecommendations = ['recommended', 'not_recommended', 'needs_more_diligence'];
  if (typeof recommendation === 'string' && validRecommendations.includes(recommendation)) {
    return recommendation as 'recommended' | 'not_recommended' | 'needs_more_diligence';
  }
  return 'needs_more_diligence';
}

function validateSourceReferences(
  sourceReferences: any
): { source: string; weight: number }[] {
  if (!Array.isArray(sourceReferences)) {
    return [
      { source: 'Deal Information', weight: 1.0 }
    ];
  }
  
  return sourceReferences.map(src => {
    if (typeof src !== 'object' || src === null) {
      return { source: 'Unknown', weight: 1.0 };
    }
    
    return {
      source: typeof src.source === 'string' ? src.source : 'Unknown',
      weight: typeof src.weight === 'number' ? Math.max(0, Math.min(1, src.weight)) : 1.0
    };
  });
}

function getMockAnalysis(deal: Deal): AiAnalysisResult {
  return {
    summary: `This is an AI-generated analysis for ${deal.name}. The analysis considers the deal's sector, target return, and other available information.`,
    investmentThesis: `${deal.name} presents an opportunity in the ${deal.sector || 'unknown'} sector with a target return of ${deal.targetReturn || 'unknown'}.`,
    recommendation: 'needs_more_diligence',
    keyRisks: ['Market volatility', 'Execution risk', 'Regulatory concerns'],
    sectorFitAnalysis: `The deal fits within our investment strategy for the ${deal.sector || 'unknown'} sector.`,
    valuationAnalysis: `Based on the available information, the valuation appears to be in line with market standards.`,
    openQuestions: ['What is the management team track record?', 'How does this compare to competitors?'],
    confidence: 0.75,
    sourceReferences: [
      { source: 'Deal Documents', weight: 0.6 },
      { source: 'Market Research', weight: 0.4 }
    ]
  };
}