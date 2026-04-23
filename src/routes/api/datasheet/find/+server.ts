import { FindDatasheetOutputSchema } from '@/lib/server/schemas';
import { fail, ok } from '@/lib/server/http';
import { findDatasheet } from '@/ai/flows/ai-datasheet-finder';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const componentName = typeof body.componentName === 'string' ? body.componentName.trim() : '';
    if (!componentName) {
      return fail('Component name is required.');
    }

    const result = await findDatasheet({ componentName });
    if (!result) {
      return ok(null);
    }

    return ok(FindDatasheetOutputSchema.parse(result));
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Failed to find datasheet.', 500);
  }
};
