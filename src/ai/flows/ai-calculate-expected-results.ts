import { ai } from '@/ai/genkit';
import { AiExpectedResultsInputSchema, AiExpectedResultsOutputSchema, type AiExpectedResultsInput, type AiExpectedResultsOutput } from '@/lib/types';

export async function aiCalculateExpectedResults(input: AiExpectedResultsInput): Promise<AiExpectedResultsOutput> {
  return aiCalculateExpectedResultsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiCalculateExpectedResultsPrompt',
  input: { schema: AiExpectedResultsInputSchema },
  output: { schema: AiExpectedResultsOutputSchema },
  prompt: `You are an expert AI assistant for electrical engineers. Estimate safe operating expectations from the normalized transistor data below.

Component Name: {{{componentName}}}
Source Kind: {{{source.kind}}}
Source Label: {{{source.label}}}
Source Confidence: {{{source.confidence}}}
Source Notes: {{{source.notes}}}

Device Limits:
- Transistor Type: {{{deviceLimits.transistorType}}}
- Max Current: {{{deviceLimits.maxCurrent}}} A
- Max Voltage: {{{deviceLimits.maxVoltage}}} V
- Max Power Dissipation: {{{deviceLimits.powerDissipation}}} W
- Rds(on): {{{deviceLimits.rdsOnMilliOhms}}} mOhm
- Vce(sat): {{{deviceLimits.vceSat}}} V
- Rise Time: {{{deviceLimits.riseTimeNs}}} ns
- Fall Time: {{{deviceLimits.fallTimeNs}}} ns
- RthJC: {{{deviceLimits.rthJC}}} C/W
- Max Temperature: {{{deviceLimits.maxTemperature}}} C

Operating Conditions:
- Operating Voltage: {{{operatingConditions.operatingVoltage}}} V
- Switching Frequency: {{{operatingConditions.switchingFrequencyKHz}}} kHz
- Duty Cycle: {{{operatingConditions.dutyCycle}}}
- Ambient Temperature: {{{operatingConditions.ambientTemperature}}} C

Thermal Model:
- Cooling Method: {{{thermalModel.coolingMethod}}}
- Cooling Thermal Resistance: {{{thermalModel.coolingThermalResistance}}} C/W
- Cooling Budget: {{{thermalModel.coolingBudget}}} W

Provide:
- expectedMaxCurrent
- expectedMaxVoltage
- expectedMaxTemperature
- reasoning

Be conservative and base your answer on the structured inputs rather than inventing missing data.`,
});

const aiCalculateExpectedResultsFlow = ai.defineFlow(
  {
    name: 'aiCalculateExpectedResultsFlow',
    inputSchema: AiExpectedResultsInputSchema,
    outputSchema: AiExpectedResultsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
