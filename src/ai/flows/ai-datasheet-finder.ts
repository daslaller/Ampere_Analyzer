/**
 * @fileOverview An AI agent that finds a transistor datasheet from the web.
 *
 * - findDatasheet - The main function to find datasheet info.
 * - FindDatasheetInput - The input type for the function.
 * - FindDatasheetOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FindDatasheetOutputSchema = z.object({
  foundDatasheetName: z.string().describe("The simulated filename of a likely datasheet PDF if one is found (e.g., 'IRFZ44N-datasheet.pdf')."),
  keyParameters: z.object({
    maxCurrent: z.string().describe('The maximum continuous drain/collector current in Amps.'),
    maxVoltage: z.string().describe('The maximum drain-source/collector-emitter voltage in Volts.'),
    rdsOn: z.string().describe('The drain-source on-resistance in mOhms. N/A for non-MOSFETs.'),
    vceSat: z.string().describe('The collector-emitter saturation voltage in Volts. N/A for MOSFETs.'),
  }).describe("A brief summary of the most critical parameters found for confirmation.")
});

export type FindDatasheetOutput = z.infer<typeof FindDatasheetOutputSchema>;

const FindDatasheetInputSchema = z.object({
  componentName: z.string().describe('The name of the transistor component to search for.'),
});
export type FindDatasheetInput = z.infer<typeof FindDatasheetInputSchema>;

export async function findDatasheet(input: FindDatasheetInput): Promise<FindDatasheetOutput | null> {
  const result = await findDatasheetFlow(input);
  // If the AI says it didn't find one, we return null to signify that.
  if (result.foundDatasheetName.toLowerCase().includes("not found") || result.foundDatasheetName.toLowerCase().includes("n/a")) {
    return null;
  }
  return result;
}

const prompt = ai.definePrompt({
  name: 'findDatasheetPrompt',
  input: {schema: FindDatasheetInputSchema},
  output: {schema: FindDatasheetOutputSchema},
  prompt: `You are an expert electrical engineer AI. Your task is to act as if you are searching the web for the datasheet of a specific transistor.

  Component Name: {{{componentName}}}

  1.  **Simulate a Web Search**: Based on the component name, imagine you are looking through datasheets from major manufacturers (like Infineon, STMicroelectronics, onsemi, etc.).
  2.  **Identify a SINGLE Datasheet**: Your primary goal is to determine if a specific, downloadable PDF datasheet exists for this exact component.
  3.  **If Found**:
      - Set 'foundDatasheetName' to a realistic filename (e.g., "STP60NF06-datasheet.pdf").
      - Briefly extract only the most critical parameters for the 'keyParameters' object. This is just for user confirmation.
  4.  **If NOT Found**:
      - Set 'foundDatasheetName' to "Not Found".
      - Fill the 'keyParameters' fields with "N/A".
  5.  **Output Format**: Provide the result strictly in the JSON format defined by the output schema. Do not include any other text or explanation. You MUST respond, even if nothing is found.`,
});


const findDatasheetFlow = ai.defineFlow(
  {
    name: 'findDatasheetFlow',
    inputSchema: FindDatasheetInputSchema,
    outputSchema: FindDatasheetOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
