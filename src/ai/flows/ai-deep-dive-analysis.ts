/**
 * @fileOverview An AI agent that performs an in-depth, iterative analysis to find optimal parameters.
 *
 * - runAiDeepDiveAnalysis - The main function to start the deep dive.
 */

import {ai} from '@/ai/genkit';
import { AiDeepDiveAnalysisInputSchema, AiDeepDiveAnalysisOutputSchema, type AiDeepDiveAnalysisInput, type AiDeepDiveAnalysisOutput } from '@/lib/types';


export async function runAiDeepDiveAnalysis(
  input: AiDeepDiveAnalysisInput
): Promise<AiDeepDiveAnalysisOutput> {
  return aiDeepDiveAnalysisFlow(input);
}


const prompt = ai.definePrompt({
    name: 'aiDeepDiveAnalysisPrompt',
    input: {schema: AiDeepDiveAnalysisInputSchema},
    output: {schema: AiDeepDiveAnalysisOutputSchema},
    prompt: `You are a world-class electrical engineer AI, specializing in power electronics and thermal simulation. You will be given the results of a simulation and asked to perform a "deep dive" analysis to find the absolute optimal parameters.

    **Your Goal:** Find the best combination of cooling and operating frequency to maximize the "Max Safe Current" of the component, without exceeding its thermal or power limits.

    **Available Tools & Data:**
    - Initial Simulation Results: {{{simulationResults}}}
    - Component Name: {{{componentName}}}
    - Initial Specs: {{{initialSpecs}}}
    - Available Cooling Methods (JSON with thermal resistance and budget): {{{allCoolingMethods}}}

    **Your Thought Process (Simulated):**
    1.  **Analyze the Failure:** First, understand why the initial simulation failed or where the bottleneck is. The failure reason is in 'simulationResults'. Was it thermal throttling? Power dissipation? Cooling budget?
    2.  **Iterate on Frequency:** Determine if lowering the switching frequency would be beneficial. Lower frequency reduces switching losses, which lowers heat. This might allow for a higher current. Find a sweet spot.
    3.  **Iterate on Cooling:** Examine the list of available coolers. If the failure was thermal or if you need more headroom, select a more powerful cooler (one with lower thermal resistance and higher budget). Consider the trade-off between thermal performance and cost/size (implied by budget).
    4.  **Synthesize and Recommend:** Based on your iterative analysis, determine the *single best* combination of a cooling solution (by its 'value' property) and switching frequency.

    **Output:**
    Provide your final recommendation in the specified JSON format. Your 'reasoning' should be clear, concise, and explain the trade-offs you considered and why you chose the final parameters. For example: "The initial simulation failed due to thermal limits. By reducing the frequency to 80kHz, we lowered switching losses. This alone wasn't enough, so upgrading to the 'air-dark-rock-pro-4' cooler provided the necessary headroom to reach a new projected max current of 55A."
    `,
});


const aiDeepDiveAnalysisFlow = ai.defineFlow(
  {
    name: 'aiDeepDiveAnalysisFlow',
    inputSchema: AiDeepDiveAnalysisInputSchema,
    outputSchema: AiDeepDiveAnalysisOutputSchema,
  },
  async input => {
    // In the future, this flow will become stateful and iterative.
    // For now, it performs a single, powerful analysis to find a better configuration.
    const {output} = await prompt(input);
    return output!;
  }
);
