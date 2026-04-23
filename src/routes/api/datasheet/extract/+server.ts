import { Buffer } from 'node:buffer';
import { extractTransistorSpecs } from '@/ai/flows/ai-datasheet-reader';
import { fail, ok } from '@/lib/server/http';
import { ExtractTransistorSpecsOutputSchema } from '@/lib/server/schemas';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const formData = await request.formData();
    const componentName = formData.get('componentName');
    const datasheet = formData.get('datasheet');

    if (typeof componentName !== 'string' || !componentName.trim()) {
      return fail('Component name is required.');
    }

    if (!(datasheet instanceof File)) {
      return fail('A datasheet PDF must be provided.');
    }

    const buffer = await datasheet.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const pdfDataUri = `data:${datasheet.type || 'application/pdf'};base64,${base64}`;
    const specs = await extractTransistorSpecs({
      componentName: componentName.trim(),
      pdfDataUri
    });

    return ok(ExtractTransistorSpecsOutputSchema.parse(specs));
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Failed to extract specs from datasheet.', 500);
  }
};
