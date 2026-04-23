import { z } from 'zod';
import { confidenceLevels } from '@/lib/types';

export const ExtractTransistorSpecsOutputSchema = z.object({
  transistorType: z.string(),
  maxCurrent: z.string(),
  maxVoltage: z.string(),
  powerDissipation: z.string(),
  rdsOn: z.string(),
  vceSat: z.string(),
  riseTime: z.string(),
  fallTime: z.string(),
  rthJC: z.string(),
  maxTemperature: z.string()
});

export const FindDatasheetOutputSchema = z.object({
  foundDatasheetName: z.string(),
  keyParameters: z.object({
    maxCurrent: z.string(),
    maxVoltage: z.string(),
    rdsOn: z.string(),
    vceSat: z.string()
  })
});

export const GetBestEffortSpecsOutputSchema = ExtractTransistorSpecsOutputSchema.extend({
  confidence: z.enum(confidenceLevels),
  sources: z.string()
});
