import { getBestEffortSpecs } from '@/ai/flows/ai-best-effort-search';
import { fail, ok } from '@/lib/server/http';
import { GetBestEffortSpecsOutputSchema } from '@/lib/server/schemas';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const componentName = typeof body.componentName === 'string' ? body.componentName.trim() : '';
    if (!componentName) {
      return fail('Component name is required.');
    }

    const result = await getBestEffortSpecs({ componentName });
    return ok(GetBestEffortSpecsOutputSchema.parse(result));
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Failed to get best-effort specs.', 500);
  }
};
