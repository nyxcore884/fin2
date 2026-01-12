import { GoogleGenerativeAI } from '@google/generative-ai';
import { ProcessedData } from './dataProcessor';

export interface AIAnalysis {
  revenueClassification: { retail: number; wholesale: number };
  anomalies: string[];
  insights: string[];
  recommendations: string[];
}

export interface AIResult {
  verifiedMetrics: ProcessedData['verifiedMetrics'];
  aiAnalysis: AIAnalysis;
}

// The API key is now passed as a parameter for better modularity and security.
export const analyzeWithAI = async (data: ProcessedData, apiKey: string): Promise<AIResult> => {
  try {
    // Initialize with the provided API key
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-pro',
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.2,
      },
    });
    
    const prompt = `
As a senior financial analyst specializing in gas distribution companies, analyze the following budget data:

FINANCIAL OVERVIEW:
- Total Costs: $${data.verifiedMetrics.totalCosts.toLocaleString()}
- Preliminary Revenue: $${data.verifiedMetrics.retailRevenue.toLocaleString()}
- Transaction Count: ${data.verifiedMetrics.transactionCount}

COST BREAKDOWN BY DEPARTMENT:
${Object.entries(data.verifiedMetrics.costsByHolder).map(([dept, amount]) => `  - ${dept}: $${Number(amount).toLocaleString()}`).join('\n')}

COST BREAKDOWN BY REGION:
${Object.entries(data.verifiedMetrics.costsByRegion).map(([region, amount]) => `  - ${region}: $${Number(amount).toLocaleString()}`).join('\n')}

DETAILED BREAKDOWN:
- By Budget Article: ${Object.keys(data.verifiedMetrics.detailedBreakdown.byBudgetArticle).length} categories
- By Structural Unit: ${Object.keys(data.verifiedMetrics.detailedBreakdown.byStructuralUnit).length} units
- By Region: ${Object.keys(data.verifiedMetrics.detailedBreakdown.byRegion).length} regions

RAW TRANSACTION DATA SAMPLE:
${JSON.stringify(data.rawDataForAI.slice(0, 5), null, 2)}

YOUR TASK:
1. REVENUE CLASSIFICATION: Analyze the raw transaction data and provide accurate retail vs wholesale revenue breakdown
2. ANOMALIES: Identify 3-5 significant anomalies or unusual patterns with specific evidence from the data
3. INSIGHTS: Provide 3-5 actionable insights for executive management with specific data references
4. RECOMMENDATIONS: Suggest 3 concrete recommendations for cost optimization and revenue growth

CRITICAL RULES:
- DO NOT invent or assume any numbers not present in the data
- Reference specific amounts and percentages from the data provided
- Focus on patterns that indicate efficiency opportunities or risks
- Consider regional variations and departmental performance

Format the response as valid JSON with this structure:
{
  "revenueClassification": {"retail": number, "wholesale": number},
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

    // Override the preliminary revenue with the AI's classification
    data.verifiedMetrics.retailRevenue = aiAnalysis.revenueClassification.retail;
    data.verifiedMetrics.wholesaleRevenue = aiAnalysis.revenueClassification.wholesale;

    return {
      verifiedMetrics: data.verifiedMetrics,
      aiAnalysis: aiAnalysis
    };

  } catch (error) {
    console.error("AI analysis failed:", error);
    
    return {
      verifiedMetrics: data.verifiedMetrics,
      aiAnalysis: {
        revenueClassification: { retail: data.verifiedMetrics.retailRevenue, wholesale: 0 },
        anomalies: ["AI analysis temporarily unavailable. Please review the verified metrics below."],
        insights: [],
        recommendations: []
      }
    };
  }
};
