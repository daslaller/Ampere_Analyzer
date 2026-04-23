import { runAiDeepDiveAnalysis } from '@/ai/flows/ai-deep-dive-analysis';
import { fail, ok } from '@/lib/server/http';
import { AiDeepDiveAnalysisInputSchema, AiDeepDiveAnalysisOutputSchema } from '@/lib/types';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const input = AiDeepDiveAnalysisInputSchema.parse(await request.json());
    const result = await runAiDeepDiveAnalysis(input);
    return ok(AiDeepDiveAnalysisOutputSchema.parse(result));
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Failed to run AI deep dive.', 500);
  }
};
