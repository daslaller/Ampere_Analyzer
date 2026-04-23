import { aiCalculateExpectedResults } from '@/ai/flows/ai-calculate-expected-results';
import { fail, ok } from '@/lib/server/http';
import { AiExpectedResultsInputSchema, AiExpectedResultsOutputSchema } from '@/lib/types';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const input = AiExpectedResultsInputSchema.parse(await request.json());
    const result = await aiCalculateExpectedResults(input);
    return ok(AiExpectedResultsOutputSchema.parse(result));
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Failed to generate AI expected results.', 500);
  }
};
