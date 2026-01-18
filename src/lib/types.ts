

import { z } from 'zod';

export interface ManualSpecs {
  transistorType: string;
  maxCurrent: string;
  maxVoltage: string;
  powerDissipation: string;
  rdsOn: string;
  vceSat: string;
  riseTime: string;
  fallTime: string;
  rthJC: string; // Thermal resistance from junction to case
  maxTemperature: string;
}

export interface ExtractTransistorSpecsOutput extends ManualSpecs {}

export interface FindDatasheetOutput {
    foundDatasheetName: string;
    keyParameters: {
        maxCurrent: string;
        maxVoltage: string;
        rdsOn: string;
        vceSat: string;
    }
}

export interface GetBestEffortSpecsOutput extends ManualSpecs {
    confidence: 'High' | 'Medium' | 'Low';
    sources: string;
}


export interface AiCalculatedExpectedResultsOutput {
  expectedMaxCurrent: number;
  expectedMaxVoltage: number;
  expectedMaxTemperature: number;
  reasoning: string;
}

export interface AiOptimizationSuggestionsOutput {
  suggestions: string[];
  reasoning: string;
}

export const AiDeepDiveAnalysisInputSchema = z.object({
  componentName: z.string().describe('The name of the component being simulated.'),
  coolingMethod: z.string().describe('The current cooling method being used.'),
  maxTemperature: z.number().describe('The maximum allowed temperature in degrees Celsius.'),
  coolingBudget: z.number().describe('The cooling budget available in Watts.'),
  simulationResults: z.string().describe('The results of the initial simulation.'),
  allCoolingMethods: z.string().describe('A JSON string of all available cooling methods and their specs (name, value, thermalResistance, coolingBudget).'),
  initialSpecs: z.string().describe('A JSON string of the initial transistor specifications.'),
});
export type AiDeepDiveAnalysisInput = z.infer<typeof AiDeepDiveAnalysisInputSchema>;


export const AiDeepDiveAnalysisOutputSchema = z.object({
    bestCoolingMethod: z.string().describe("The 'value' for the optimal cooling method found (e.g., 'air-nh-d15')."),
    optimalFrequency: z.number().describe("The suggested optimal switching frequency in kHz."),
    reasoning: z.string().describe("Detailed reasoning for why these new parameters are optimal, explaining the step-by-step thought process and extreme indepth analyses made to optimize the performance of the power transistor."),
    projectedMaxSafeCurrent: z.number().describe("The new projected max safe current in Amps with these changes."),
});
export type AiDeepDiveAnalysisOutput = z.infer<typeof AiDeepDiveAnalysisOutputSchema>;


export interface SimulationResult {
  status: 'success' | 'failure';
  maxSafeCurrent: number;
  failureReason: 'Thermal' | 'Voltage' | 'Current' | 'Power Dissipation' | 'Cooling Budget' | null;
  details: string;
  finalTemperature: number;
  powerDissipation: {
    total: number;
    conduction: number;
    switching: number;
  };
}

export type CoolingMethod = {
  name: string;
  value: string;
  thermalResistance: number;
  coolingBudget: number;
};

export type PredefinedTransistor = {
  name: string;
  value: string;
  specs: ManualSpecs;
};

export interface LiveDataPoint {
    current: number;
    temperature: number;
    powerLoss: number;
    conductionLoss: number;
    switchingLoss: number;
    progress: number;
    limitValue: number;
}

export interface InterpolatedDataPoint extends LiveDataPoint {
    isInterpolated: boolean;
    timestamp: number;
}

export interface AiDeepDiveStep {
  title: string;
  description: string;
  simulationParams: any;
  simulationResult: SimulationResult | null;
}

export interface HistoryEntry {
  id: string;
  componentName: string;
  timestamp: string;
  simulationResult: SimulationResult;
  formValues: any; // Store form values for potential re-run
}
