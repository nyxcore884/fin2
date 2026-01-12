import { GoogleGenerativeAI } from '@google/generative-ai';
import { ProcessedData } from './dataProcessor';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface AIAnalysis {
  anomalies: string[];
  insights: string[];
  recommendations: string[];
}

export interface AIResult {
  verifiedMetrics: ProcessedData['verifiedMetrics'];
  aiAnalysis: AIAnalysis;
}

export const analyzeWithAI = async (data: ProcessedData): Promise<AIResult> => {
  try {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-pro',
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.3,
      },
    });
    
    let pdfContext = '';
    if (data.rawDataForAI && data.rawDataForAI.some((item: any) => item.rawText)) {
      pdfContext = `PDF CONTEXT: Some data was extracted from PDF files. 
      This may include additional context not captured in structured fields.`;
    }

    const prompt = `
CRITICAL INSTRUCTION: You are a financial analyst explaining PRE-CALCULATED data.
You MUST NOT perform any of your own calculations. You MUST ONLY use the numbers provided below.
Your task is to interpret, describe, and provide context for these verified figures.

VERIFIED FINANCIAL DATA (DO NOT DEVIATE FROM THESE NUMBERS):
- Total Costs: $${data.verifiedMetrics.totalCosts.toLocaleString()}
- Retail Revenue: $${data.verifiedMetrics.retailRevenue.toLocaleString()}
- Wholesale Revenue: $${data.verifiedMetrics.wholesaleRevenue.toLocaleString()}
- Transaction Count: ${data.verifiedMetrics.transactionCount}

TOP COST DRIVERS (Pre-Calculated):
${data.verifiedMetrics.topCostDrivers.map(d => `  - ${d.name}: $${d.amount.toLocaleString()} (${d.percentage})`).join('\n')}

REGIONAL DISTRIBUTION (Pre-Calculated):
${data.verifiedMetrics.regionalDistribution.map(d => `  - ${d.region}: $${d.amount.toLocaleString()} (${d.percentage})`).join('\n')}

YOUR TASK:
1. DESCRIBE the cost structure based on the pre-calculated drivers and distribution.
2. HYPOTHESIZE about potential reasons for the observed distribution (e.g., "The high costs in Kakheti could be due to...").
3. RECOMMEND actions based on the pre-calculated percentages.
4. UNDER NO CIRCUMSTANCES should you invent or calculate new numbers. Only use the percentages and figures provided above.

Format your response as valid JSON with this structure:
{
  "anomalies": string[],
  "insights": string[],
  "recommendations": string[]
}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    const textResponse = response.text();
    const cleanResponse = textResponse.replace(/```json\n?|\n?```/g, '');
    
    const aiAnalysis: AIAnalysis = JSON.parse(cleanResponse);

    return {
      verifiedMetrics: data.verifiedMetrics,
      aiAnalysis: aiAnalysis
    };

  } catch (error) {
    console.error("AI analysis failed:", error);
    
    return {
      verifiedMetrics: data.verifiedMetrics,
      aiAnalysis: {
        anomalies: ["AI analysis temporarily unavailable. Please review the verified metrics below."],
        insights: [],
        recommendations: []
      }
    };
  }
};
