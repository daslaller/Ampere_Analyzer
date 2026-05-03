"use server";

import { generateText, Output } from "ai";

import { z } from "zod";

const ExtractedSpecsSchema = z.object({
  transistorType: z.string().describe('The type of the transistor (e.g., MOSFET (N-Channel), BJT (NPN), IGBT).'),
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

export type ExtractedSpecs = z.infer<typeof ExtractedSpecsSchema>;

export async function extractSpecsFromDatasheet(
  pdfBase64: string,
  componentName: string
): Promise<{ data?: ExtractedSpecs; error?: string }> {
  try {
    const result = await generateText({
      model: "google/gemini-2.0-flash",
      output: Output.object({ schema: ExtractedSpecsSchema }),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `You are an AI expert in reading transistor datasheets. Given the datasheet PDF and component name, extract the following key parameters.

Component Name: ${componentName}

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
            },
            {
              type: "file",
              data: pdfBase64,
              mimeType: "application/pdf",
            },
          ],
        },
      ],
    });

    return { data: result.object as ExtractedSpecs };
  } catch (error) {
    console.error("Error extracting specs:", error);
    return { error: "Failed to extract specifications from the datasheet." };
  }
}

export async function searchComponentSpecs(
  componentName: string
): Promise<{ data?: ExtractedSpecs; confidence?: string; error?: string }> {
  try {
    const result = await generateText({
      model: "openai/gpt-4o",
      output: Output.object({
        schema: z.object({
          specs: ExtractedSpecsSchema,
          confidence: z.enum(["High", "Medium", "Low"]).describe("Confidence level in the extracted specs"),
          sources: z.string().describe("Brief description of knowledge sources used"),
        }),
      }),
      prompt: `You are an expert in power electronics components. Search your knowledge for the specifications of the transistor/MOSFET: "${componentName}".

Provide the following parameters based on typical datasheet values:
- transistorType: The full type name (e.g., 'MOSFET (N-Channel)', 'BJT (NPN)', 'IGBT', 'GaN FET').
- maxCurrent: Maximum continuous drain/collector current in Amps (just the number).
- maxVoltage: Maximum drain-source/collector-emitter voltage in Volts (just the number).
- powerDissipation: Total power dissipation in Watts (just the number).
- rdsOn: Drain-source on-resistance in mOhms (just the number, or "N/A" for BJTs).
- vceSat: Collector-emitter saturation voltage in Volts (just the number, or "N/A" for MOSFETs).
- riseTime: Rise time in nanoseconds (just the number).
- fallTime: Fall time in nanoseconds (just the number).
- rthJC: Thermal resistance junction-to-case in °C/W (just the number).
- maxTemperature: Maximum junction temperature in °C (just the number).

Also provide:
- confidence: How confident you are in these specs (High/Medium/Low)
- sources: Brief note on where this data comes from (e.g., "Common IRF540N specifications from multiple datasheets")

If the component is unknown, provide reasonable estimates for a similar class of device and mark confidence as "Low".`,
    });

    const output = result.object as {
      specs: ExtractedSpecs;
      confidence: string;
      sources: string;
    };

    return { data: output.specs, confidence: output.confidence };
  } catch (error) {
    console.error("Error searching specs:", error);
    return { error: "Failed to search for component specifications." };
  }
}

const OptimizationSchema = z.object({
  bestCoolingMethod: z.string().describe("The 'value' for the optimal cooling method (e.g., 'air-nh-d15')."),
  optimalFrequency: z.number().describe("The suggested optimal switching frequency in kHz."),
  reasoning: z.string().describe("Detailed reasoning for why these parameters are optimal."),
  projectedMaxSafeCurrent: z.number().describe("The new projected max safe current in Amps."),
  suggestions: z.array(z.string()).describe("List of optimization suggestions."),
});

export type OptimizationResult = z.infer<typeof OptimizationSchema>;

export async function getAiOptimizations(
  componentName: string,
  currentResults: string,
  coolingMethods: string,
  currentSpecs: string
): Promise<{ data?: OptimizationResult; error?: string }> {
  try {
    const result = await generateText({
      model: "openai/gpt-4o",
      output: Output.object({ schema: OptimizationSchema }),
      prompt: `You are an expert power electronics engineer. Analyze the following simulation results and provide optimization recommendations.

Component: ${componentName}

Current Simulation Results:
${currentResults}

Available Cooling Methods:
${coolingMethods}

Current Device Specifications:
${currentSpecs}

Based on this analysis:
1. Recommend the best cooling method from the available options (provide the 'value' field)
2. Suggest an optimal switching frequency in kHz that balances efficiency and thermal performance
3. Provide detailed reasoning for your recommendations
4. Project the new maximum safe current with these optimizations
5. List 3-5 specific suggestions to improve performance

Focus on practical, achievable optimizations that maximize current handling while maintaining thermal safety.`,
    });

    return { data: result.object as OptimizationResult };
  } catch (error) {
    console.error("Error getting optimizations:", error);
    return { error: "Failed to get AI optimization suggestions." };
  }
}
