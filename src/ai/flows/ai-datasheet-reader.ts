/**
 * @fileOverview AI-powered PDF reader tool to extract transistor specifications from datasheets.
 *
 * - extractTransistorSpecs - Extracts transistor specifications from a datasheet.
 * - ExtractTransistorSpecsInput - The input type for the extractTransistorSpecs function.
 * - ExtractTransistorSpecsOutput - The return type for the extractTransistorSpecs function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractTransistorSpecsInputSchema = z.object({
  pdfDataUri: z
    .string()
    .describe(
      "A transistor datasheet in PDF format, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  componentName: z.string().describe('The name of the transistor component.'),
});
export type ExtractTransistorSpecsInput = z.infer<typeof ExtractTransistorSpecsInputSchema>;

const ExtractTransistorSpecsOutputSchema = z.object({
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
});
export type ExtractTransistorSpecsOutput = z.infer<typeof ExtractTransistorSpecsOutputSchema>;

export async function extractTransistorSpecs(input: ExtractTransistorSpecsInput): Promise<ExtractTransistorSpecsOutput> {
  return extractTransistorSpecsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractTransistorSpecsPrompt',
  input: {schema: ExtractTransistorSpecsInputSchema},
  output: {schema: ExtractTransistorSpecsOutputSchema},
  prompt: `You are an AI expert in reading transistor datasheets. Given the datasheet PDF and component name, extract the following key parameters.

Component Name: {{{componentName}}}
Datasheet: {{media url=pdfDataUri}}

Extract:
- transistorType: The full type name, e.g., 'MOSFET (N-Channel)' or 'IGBT'.
- maxCurrent: Maximum continuous drain/collector current (Id/Ic) at 25°C.
- maxVoltage: Maximum drain-source or collector-emitter voltage (Vds/Vce).
- powerDissipation: Total power dissipation (Pd) at 25°C.
- rdsOn: Drain-source on-resistance (Rds(on)) in mOhms. If it's a BJT or IGBT, this should be "N/A".
- vceSat: Collector-emitter saturation voltage (Vce(sat)) in Volts. If it's a MOSFET/GaN, this should be "N/A".
- riseTime: Typical rise time (tr) in nanoseconds.
- fallTime: Typical fall time (tf) in nanoseconds.
- rthJC: Thermal resistance from junction-to-case (Rth(j-c)) in °C/W.
- maxTemperature: Maximum operating junction temperature (Tj max) in °C.

Ensure that the output matches the described JSON format. If a value cannot be determined, return a best-effort estimate or "N/A".`,
});

const extractTransistorSpecsFlow = ai.defineFlow(
  {
    name: 'extractTransistorSpecsFlow',
    inputSchema: ExtractTransistorSpecsInputSchema,
    outputSchema: ExtractTransistorSpecsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
