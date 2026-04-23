import { getAiOptimizationSuggestions } from '@/ai/flows/ai-optimization-advisor';
import { fail, ok } from '@/lib/server/http';
import { AiOptimizationSuggestionsInputSchema, AiOptimizationSuggestionsOutputSchema } from '@/lib/types';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const input = AiOptimizationSuggestionsInputSchema.parse(await request.json());
    const result = await getAiOptimizationSuggestions(input);
    return ok(AiOptimizationSuggestionsOutputSchema.parse(result));
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Failed to generate AI suggestions.', 500);
  }
};
