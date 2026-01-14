'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ClassifyRevenueInputSchema = z.object({
  revenueEntry: z.string().describe('The description of the revenue entry.'),
  keywordsRetail: z.string().describe('Keywords indicating retail revenue.'),
  keywordsWholesale: z.string().describe('Keywords indicating wholesale revenue.'),
});

const ClassifyRevenueOutputSchema = z.object({
  classification: z.enum(['wholesale', 'retail']).describe('The classification of the revenue entry.'),
});

export async function classifyRevenue(input: z.infer<typeof ClassifyRevenueInputSchema>) {
  return classifyRevenueFlow(input);
}

const classifyRevenueFlow = ai.defineFlow(
  {
    name: 'classifyRevenueFlow',
    inputSchema: ClassifyRevenueInputSchema,
    outputSchema: ClassifyRevenueOutputSchema,
  },
  async (input) => {
    const { output } = await ai.generate({
      prompt: `Classify the following revenue entry into 'wholesale' or 'retail' based on the description and provided keywords.

Revenue Entry: ${input.revenueEntry}

Retail Keywords: ${input.keywordsRetail}
Wholesale Keywords: ${input.keywordsWholesale}

If the entry matches wholesale keywords or looks like a business entity, classify as 'wholesale'.
If it matches retail keywords or looks like an individual, classify as 'retail'.
If uncertain, default to 'retail'.`,
      output: { schema: ClassifyRevenueOutputSchema },
    });

    if (!output) {
      throw new Error('Failed to classify revenue');
    }

    return output;
  }
);
