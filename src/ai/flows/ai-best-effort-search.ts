/**
 * @fileOverview An AI agent that scours the internet for transistor parameters
 * when a datasheet cannot be found, acting like a "transistor bloodhound".
 *
 * - getBestEffortSpecs - The main function to find parameters.
 * - GetBestEffortSpecsInput - The input type for the function.
 * - GetBestEffortSpecsOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { ManualSpecs } from '@/lib/types';


const GetBestEffortSpecsInputSchema = z.object({
  componentName: z.string().describe('The name of the transistor component to search for.'),
});
export type GetBestEffortSpecsInput = z.infer<typeof GetBestEffortSpecsInputSchema>;


const GetBestEffortSpecsOutputSchema = z.object({
    transistorType: z.string().describe('The type of the transistor (e.g., MOSFET (N-Channel), BJT (NPN)).'),
    maxCurrent: z.string().describe('The maximum continuous drain/collector current in Amps.'),
    maxVoltage: z.string().describe('The maximum drain-source/collector-emitter voltage in Volts.'),
    powerDissipation: z.string().describe('The maximum power dissipation in Watts.'),
    rdsOn: z.string().describe('The drain-source on-resistance in mOhms. N/A for non-MOSFETs.'),
    vceSat: z.string().describe('The collector-emitter saturation voltage in Volts. N/A for MOSFETs.'),
    riseTime: z.string().describe('The rise time in nanoseconds (ns).'),
    fallTime: z.string().describe('The fall time in nanoseconds (ns).'),
    rthJC: z.string().describe('The thermal resistance from junction to case in °C/W.'),
    maxTemperature: z.string().describe('The maximum junction temperature in degrees Celsius.'),
    confidence: z.enum(['High', 'Medium', 'Low']).describe("The AI's confidence in the accuracy of the found parameters."),
    sources: z.string().describe("A brief, human-readable description of where the information was aggregated from (e.g., 'Aggregated from distributor listings and forum discussions.')."),
});
export type GetBestEffortSpecsOutput = z.infer<typeof GetBestEffortSpecsOutputSchema>;


export async function getBestEffortSpecs(input: GetBestEffortSpecsInput): Promise<GetBestEffortSpecsOutput> {
  return getBestEffortSpecsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'getBestEffortSpecsPrompt',
  input: {schema: GetBestEffortSpecsInputSchema},
  output: {schema: GetBestEffortSpecsOutputSchema},
  prompt: `You are an expert AI assistant, a "transistor bloodhound". Your task is to find all relevant specifications for a given component, even if a single datasheet isn't available. You will scour distributor websites (like Digi-Key, Mouser), forums, and application notes.

  Component Name: {{{componentName}}}

  1.  **Exhaustive Search**: Simulate a deep search for all parameters for the component.
  2.  **Educated Guesses**: If some parameters are missing, make a well-informed, conservative estimate based on similar components. For example, if you find Rds(on) but not rise/fall time, estimate them based on a typical MOSFET with that Rds(on).
  3.  **Fill All Fields**: You MUST provide a value for every field in the output schema. Use "N/A" only if the parameter is truly not applicable (e.g., rdsOn for a BJT).
  4.  **Confidence & Sources**: Assess your confidence (High, Medium, or Low) based on the quality of your sources. Briefly describe your sources. For example: "High confidence, data from manufacturer's official product page." or "Low confidence, data estimated from similar components as only partial specs were found on a forum."
  5.  **Output Format**: Provide the result strictly in the JSON format. Do not include any other text or explanation outside of the JSON structure.`,
});


const getBestEffortSpecsFlow = ai.defineFlow(
  {
    name: 'getBestEffortSpecsFlow',
    inputSchema: GetBestEffortSpecsInputSchema,
    outputSchema: GetBestEffortSpecsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
