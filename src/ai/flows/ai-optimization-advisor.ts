import { ai } from '@/ai/genkit';
import {
  AiOptimizationSuggestionsInputSchema,
  AiOptimizationSuggestionsOutputSchema,
  type AiOptimizationSuggestionsInput,
  type AiOptimizationSuggestionsOutput
} from '@/lib/types';

export async function getAiOptimizationSuggestions(
  input: AiOptimizationSuggestionsInput
): Promise<AiOptimizationSuggestionsOutput> {
  return aiOptimizationSuggestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiOptimizationSuggestionsPrompt',
  input: { schema: AiOptimizationSuggestionsInputSchema },
  output: { schema: AiOptimizationSuggestionsOutputSchema },
  prompt: `You are an AI simulation expert helping optimize an electronic switching device.

Component Name: {{{componentName}}}
Cooling Method: {{{coolingMethod}}}
Maximum Temperature: {{{maxTemperature}}} C
Cooling Budget: {{{coolingBudget}}} W
Simulation Results:
{{{simulationResults}}}

Return a concise list of practical suggestions and then a short reasoning paragraph. Prefer operating changes that are plausible in a real design review.`,
});

const aiOptimizationSuggestionsFlow = ai.defineFlow(
  {
    name: 'aiOptimizationSuggestionsFlow',
    inputSchema: AiOptimizationSuggestionsInputSchema,
    outputSchema: AiOptimizationSuggestionsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
