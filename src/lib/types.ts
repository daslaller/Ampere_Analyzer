import { z } from 'zod';

export const transistorTypes = [
  'MOSFET (N-Channel)',
  'MOSFET (P-Channel)',
  'SiC MOSFET',
  'GaN FET',
  'IGBT',
  'BJT (NPN)',
  'BJT (PNP)'
] as const;

export type TransistorType = (typeof transistorTypes)[number];

export const confidenceLevels = ['High', 'Medium', 'Low'] as const;
export type ConfidenceLevel = (typeof confidenceLevels)[number];

export interface ManualSpecs {
  transistorType: TransistorType | string;
  maxCurrent: string;
  maxVoltage: string;
  powerDissipation: string;
  rdsOn: string;
  vceSat: string;
  riseTime: string;
  fallTime: string;
  rthJC: string;
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
  };
}

export interface GetBestEffortSpecsOutput extends ManualSpecs {
  confidence: ConfidenceLevel;
  sources: string;
}

export interface AiCalculatedExpectedResultsOutput {
  expectedMaxCurrent: number;
  expectedMaxVoltage: number;
  expectedMaxTemperature: number;
  reasoning: string;
}

export type CoolingMethod = {
  name: string;
  value: string;
  thermalResistance: number;
  coolingBudget: number;
  group: 'Air Cooling' | 'AIO Water Cooling' | 'Custom Water Cooling' | 'Industrial Cooling' | 'Exotic Cooling';
};

export type PredefinedTransistor = {
  name: string;
  value: string;
  specs: ManualSpecs;
};

export type SimulationMode = 'ftf' | 'temp' | 'budget';
export type SimulationAlgorithm = 'iterative' | 'binary';
export type AnalysisStatus = 'within_limits' | 'limit_reached' | 'input_invalid';
export type LimitingFactor = 'Thermal' | 'Voltage' | 'Current' | 'Power Dissipation' | 'Cooling Budget' | null;

export interface DeviceLimits {
  transistorType: string;
  maxCurrent: number;
  maxVoltage: number;
  powerDissipation: number | null;
  rdsOnMilliOhms: number | null;
  vceSat: number | null;
  riseTimeNs: number;
  fallTimeNs: number;
  rthJC: number;
  maxTemperature: number;
}

export interface OperatingConditions {
  switchingFrequencyKHz: number;
  operatingVoltage: number;
  ambientTemperature: number;
  dutyCycle: number;
}

export interface ThermalModel {
  coolingMethod: string;
  coolingThermalResistance: number;
  coolingBudget: number;
}

export interface SearchModeConfig {
  mode: SimulationMode;
  algorithm: SimulationAlgorithm;
  precisionSteps: number;
  currentSweepMultiplier: number;
  epsilon: number;
}

export interface SimulationInput {
  componentName: string;
  deviceLimits: DeviceLimits;
  operatingConditions: OperatingConditions;
  thermalModel: ThermalModel;
  searchMode: SearchModeConfig;
  source: {
    kind: 'manual' | 'predefined' | 'datasheet' | 'best-effort' | 'ai-optimized';
    label: string;
    confidence?: ConfidenceLevel;
  };
}

export interface SimulationPowerLoss {
  total: number;
  conduction: number;
  switching: number;
}

export interface SimulationPoint {
  sampleIndex: number;
  current: number;
  temperature: number;
  powerLoss: number;
  conductionLoss: number;
  switchingLoss: number;
  progressPercent: number;
  limitingFactor: LimitingFactor;
  withinLimits: boolean;
}

export interface SimulationSeriesSummary {
  sampleCount: number;
  minCurrent: number;
  maxCurrent: number;
  maxTemperature: number;
  maxPowerLoss: number;
  sortedByCurrent: boolean;
}

export interface SimulationProgress {
  algorithm: SimulationAlgorithm;
  points: SimulationPoint[];
  latestPoint: SimulationPoint | null;
  seriesSummary: SimulationSeriesSummary;
}

export interface SimulationResult {
  analysisStatus: AnalysisStatus;
  maxSafeCurrent: number;
  limitingFactor: LimitingFactor;
  limitCurrent: number | null;
  details: string;
  finalTemperature: number;
  powerLoss: SimulationPowerLoss;
  finalPoint: SimulationPoint;
  seriesSummary: SimulationSeriesSummary;
}

export interface HistoryEntry {
  id: string;
  componentName: string;
  timestamp: string;
  source: SimulationInput['source'];
  input: SimulationInput;
  result: SimulationResult;
}

export interface SimulationFormValues {
  predefinedComponent: string;
  componentName: string;
  transistorType: string;
  maxCurrent: number;
  maxVoltage: number;
  powerDissipation: number | null;
  rdsOn: number | null;
  vceSat: number | null;
  riseTime: number;
  fallTime: number;
  rthJC: number;
  maxTemperature: number;
  switchingFrequency: number;
  operatingVoltage: number;
  dutyCycle: number;
  coolingMethod: string;
  ambientTemperature: number;
  coolingBudget: number | null;
  simulationMode: SimulationMode;
  simulationAlgorithm: SimulationAlgorithm;
  precisionSteps: number;
}

export interface ExtractedSpecPayload {
  specs: ManualSpecs;
  source: SimulationInput['source'];
}

export const SourceMetadataSchema = z.object({
  kind: z.enum(['manual', 'predefined', 'datasheet', 'best-effort', 'ai-optimized']),
  label: z.string(),
  confidence: z.enum(confidenceLevels).optional()
});

export const DeviceLimitsSchema = z.object({
  transistorType: z.string(),
  maxCurrent: z.number().positive(),
  maxVoltage: z.number().positive(),
  powerDissipation: z.number().positive().nullable(),
  rdsOnMilliOhms: z.number().positive().nullable(),
  vceSat: z.number().positive().nullable(),
  riseTimeNs: z.number().min(0),
  fallTimeNs: z.number().min(0),
  rthJC: z.number().positive(),
  maxTemperature: z.number().positive()
});

export const OperatingConditionsSchema = z.object({
  switchingFrequencyKHz: z.number().positive(),
  operatingVoltage: z.number().positive(),
  ambientTemperature: z.number(),
  dutyCycle: z.number().min(0).max(1)
});

export const ThermalModelSchema = z.object({
  coolingMethod: z.string(),
  coolingThermalResistance: z.number().nonnegative(),
  coolingBudget: z.number().positive()
});

export const SearchModeConfigSchema = z.object({
  mode: z.enum(['ftf', 'temp', 'budget']),
  algorithm: z.enum(['iterative', 'binary']),
  precisionSteps: z.number().int().min(10).max(500),
  currentSweepMultiplier: z.number().positive(),
  epsilon: z.number().positive()
});

export const SimulationInputSchema = z.object({
  componentName: z.string().min(1),
  deviceLimits: DeviceLimitsSchema,
  operatingConditions: OperatingConditionsSchema,
  thermalModel: ThermalModelSchema,
  searchMode: SearchModeConfigSchema,
  source: SourceMetadataSchema
});

export const AiExpectedResultsInputSchema = z.object({
  componentName: z.string().min(1),
  source: SourceMetadataSchema.extend({
    notes: z.string().optional()
  }),
  deviceLimits: DeviceLimitsSchema,
  operatingConditions: OperatingConditionsSchema,
  thermalModel: ThermalModelSchema
});
export type AiExpectedResultsInput = z.infer<typeof AiExpectedResultsInputSchema>;

export const AiExpectedResultsOutputSchema = z.object({
  expectedMaxCurrent: z.number(),
  expectedMaxVoltage: z.number(),
  expectedMaxTemperature: z.number(),
  reasoning: z.string()
});
export type AiExpectedResultsOutput = z.infer<typeof AiExpectedResultsOutputSchema>;

export const AiOptimizationSuggestionsInputSchema = z.object({
  componentName: z.string().min(1),
  coolingMethod: z.string().min(1),
  maxTemperature: z.number().positive(),
  coolingBudget: z.number().positive(),
  simulationResults: z.string().min(1)
});
export type AiOptimizationSuggestionsInput = z.infer<typeof AiOptimizationSuggestionsInputSchema>;

export const AiOptimizationSuggestionsOutputSchema = z.object({
  suggestions: z.array(z.string()),
  reasoning: z.string()
});
export type AiOptimizationSuggestionsOutput = z.infer<typeof AiOptimizationSuggestionsOutputSchema>;

export const AiDeepDiveAnalysisInputSchema = z.object({
  componentName: z.string(),
  coolingMethod: z.string(),
  maxTemperature: z.number(),
  coolingBudget: z.number(),
  simulationResults: z.string(),
  allCoolingMethods: z.string(),
  initialSpecs: z.string()
});
export type AiDeepDiveAnalysisInput = z.infer<typeof AiDeepDiveAnalysisInputSchema>;

export const AiDeepDiveAnalysisOutputSchema = z.object({
  bestCoolingMethod: z.string(),
  optimalFrequency: z.number(),
  reasoning: z.string(),
  projectedMaxSafeCurrent: z.number()
});
export type AiDeepDiveAnalysisOutput = z.infer<typeof AiDeepDiveAnalysisOutputSchema>;

export interface DeepDiveStep {
  id: string;
  title: string;
  description: string;
  inputPatch: Partial<SimulationFormValues>;
  result: SimulationResult | null;
}

export type DeepDivePhase = 'idle' | 'running' | 'complete' | 'error';
