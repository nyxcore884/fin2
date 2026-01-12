import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface AIAnalysis {
  revenueClassification: { retail: number; wholesale: number };
  anomalies: string[];
  insights: string[];
  recommendations: string[];
}

export const analyzeWithAI = async (data: any): Promise<AIAnalysis> => {
  try {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-pro',
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.3,
      },
    });
    
    // Handle PDF content if present
    let pdfContext = '';
    if (data.rawDataForAI && data.rawDataForAI.some((item: any) => item.rawText)) {
      pdfContext = `PDF CONTEXT: Some data was extracted from PDF files. 
      This may include additional context not captured in structured fields.`;
    }


    const prompt = `
As a senior financial analyst for a gas distribution company, analyze the following budget data:

BUDGET OVERVIEW:
- Total Costs: $${data.totalCosts.toLocaleString()}
- Retail Revenue: $${data.retailRevenue.toLocaleString()}
- Wholesale Revenue: $${data.wholesaleRevenue.toLocaleString()}
- Transaction Count: ${data.transactionCount}

COST BREAKDOWN BY DEPARTMENT:
${Object.entries(data.costsByHolder).map(([dept, amount]) => `  - ${dept}: $${Number(amount).toLocaleString()}`).join('\n')}

COST BREAKDOWN BY REGION:
${Object.entries(data.costsByRegion).map(([region, amount]) => `  - ${region}: $${Number(amount).toLocaleString()}`).join('\n')}

${pdfContext}

Please provide:
1. REVENUE CLASSIFICATION: Accurate breakdown of retail vs wholesale revenue
2. ANOMALIES: 3-5 most significant anomalies or unusual patterns with potential causes
3. INSIGHTS: 3-5 key insights for executive management
4. RECOMMENDATIONS: 3 actionable recommendations for cost optimization

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
    
    // Parse the AI response
    const textResponse = response.text();
    
    // Clean the response (remove markdown code blocks if present)
    const cleanResponse = textResponse.replace(/```json\n?|\n?```/g, '');
    
    const aiAnalysis: AIAnalysis = JSON.parse(cleanResponse);
    return aiAnalysis;

  } catch (error) {
    console.error("AI analysis failed:", error);
    
    // Return default analysis if AI fails
    return {
      revenueClassification: {
        retail: data.retailRevenue || 0,
        wholesale: data.wholesaleRevenue || 0
      },
      anomalies: ["AI analysis temporarily unavailable. Please review data manually."],
      insights: ["Initial data processing completed successfully. AI analysis pending."],
      recommendations: ["Please verify the data quality and try AI analysis again."]
    };
  }
};
