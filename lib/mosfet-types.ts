export interface MOSFETParams {
  // Basic parameters
  vth: number;          // Threshold voltage (V)
  kn: number;           // Transconductance parameter (A/V²)
  lambda: number;       // Channel-length modulation (1/V)
  
  // Package & thermal
  rdsOn: number;        // On-resistance (mΩ)
  vgsMax: number;       // Max gate-source voltage (V)
  vdsMax: number;       // Max drain-source voltage (V)
  idMax: number;        // Max drain current (A)
  
  // Capacitances
  ciss: number;         // Input capacitance (pF)
  coss: number;         // Output capacitance (pF)
  crss: number;         // Reverse transfer capacitance (pF)
  
  // Additional
  gm?: number;          // Transconductance (S)
  bodyDiodeVf?: number; // Body diode forward voltage (V)
}

export interface MOSFETPreset {
  id: string;
  name: string;
  manufacturer: string;
  type: 'N-Channel' | 'P-Channel';
  params: MOSFETParams;
}

export interface IVDataPoint {
  vds: number;
  id: number;
  vgs: number;
}

export interface TransferDataPoint {
  vgs: number;
  id: number;
  vds: number;
}

// Popular MOSFET presets with realistic parameters
export const MOSFET_PRESETS: MOSFETPreset[] = [
  {
    id: 'irf540n',
    name: 'IRF540N',
    manufacturer: 'Infineon',
    type: 'N-Channel',
    params: {
      vth: 3.0,
      kn: 0.027,
      lambda: 0.02,
      rdsOn: 44,
      vgsMax: 20,
      vdsMax: 100,
      idMax: 33,
      ciss: 1700,
      coss: 470,
      crss: 80,
      bodyDiodeVf: 0.9
    }
  },
  {
    id: 'irfz44n',
    name: 'IRFZ44N',
    manufacturer: 'Infineon',
    type: 'N-Channel',
    params: {
      vth: 4.0,
      kn: 0.043,
      lambda: 0.015,
      rdsOn: 17.5,
      vgsMax: 20,
      vdsMax: 55,
      idMax: 49,
      ciss: 1470,
      coss: 330,
      crss: 100,
      bodyDiodeVf: 0.8
    }
  },
  {
    id: '2n7000',
    name: '2N7000',
    manufacturer: 'ON Semi',
    type: 'N-Channel',
    params: {
      vth: 2.1,
      kn: 0.0012,
      lambda: 0.04,
      rdsOn: 1800,
      vgsMax: 20,
      vdsMax: 60,
      idMax: 0.2,
      ciss: 20,
      coss: 6,
      crss: 4,
      bodyDiodeVf: 1.0
    }
  },
  {
    id: 'irf3205',
    name: 'IRF3205',
    manufacturer: 'Infineon',
    type: 'N-Channel',
    params: {
      vth: 2.0,
      kn: 0.07,
      lambda: 0.01,
      rdsOn: 8,
      vgsMax: 20,
      vdsMax: 55,
      idMax: 110,
      ciss: 3247,
      coss: 950,
      crss: 180,
      bodyDiodeVf: 0.9
    }
  },
  {
    id: 'irlz44n',
    name: 'IRLZ44N',
    manufacturer: 'Infineon',
    type: 'N-Channel',
    params: {
      vth: 1.0,
      kn: 0.055,
      lambda: 0.012,
      rdsOn: 22,
      vgsMax: 16,
      vdsMax: 55,
      idMax: 47,
      ciss: 1540,
      coss: 350,
      crss: 70,
      bodyDiodeVf: 0.85
    }
  },
  {
    id: 'irf9540n',
    name: 'IRF9540N',
    manufacturer: 'Infineon',
    type: 'P-Channel',
    params: {
      vth: -4.0,
      kn: 0.015,
      lambda: 0.02,
      rdsOn: 117,
      vgsMax: -20,
      vdsMax: -100,
      idMax: -23,
      ciss: 1700,
      coss: 450,
      crss: 120,
      bodyDiodeVf: 0.9
    }
  }
];

// MOSFET IV Curve Calculator using Level 1 SPICE model
export function calculateIdVds(
  vgs: number,
  vds: number,
  params: MOSFETParams
): number {
  const { vth, kn, lambda } = params;
  const isNChannel = vth >= 0;
  
  // Adjust for P-channel (use absolute values for calculation)
  const effectiveVgs = isNChannel ? vgs : -vgs;
  const effectiveVds = isNChannel ? vds : -vds;
  const effectiveVth = Math.abs(vth);
  
  // Cutoff region
  if (effectiveVgs <= effectiveVth) {
    return 0;
  }
  
  const vov = effectiveVgs - effectiveVth; // Overdrive voltage
  
  let id: number;
  
  if (effectiveVds < vov) {
    // Linear/Triode region
    id = kn * (vov * effectiveVds - 0.5 * effectiveVds * effectiveVds);
  } else {
    // Saturation region with channel-length modulation
    id = 0.5 * kn * vov * vov * (1 + lambda * effectiveVds);
  }
  
  return isNChannel ? id : -id;
}

// Generate IV curve data for multiple Vgs values
export function generateIVCurves(
  params: MOSFETParams,
  vgsValues: number[],
  vdsMax: number,
  points: number = 100
): IVDataPoint[] {
  const data: IVDataPoint[] = [];
  const isNChannel = params.vth >= 0;
  const actualVdsMax = isNChannel ? Math.abs(vdsMax) : -Math.abs(vdsMax);
  const step = actualVdsMax / points;
  
  for (const vgs of vgsValues) {
    for (let i = 0; i <= points; i++) {
      const vds = isNChannel ? i * step : -i * Math.abs(step);
      const id = calculateIdVds(vgs, vds, params);
      data.push({ vds, id, vgs });
    }
  }
  
  return data;
}

// Generate transfer characteristic (Id vs Vgs at fixed Vds)
export function generateTransferCurve(
  params: MOSFETParams,
  vdsFixed: number,
  vgsMin: number,
  vgsMax: number,
  points: number = 100
): TransferDataPoint[] {
  const data: TransferDataPoint[] = [];
  const step = (vgsMax - vgsMin) / points;
  
  for (let i = 0; i <= points; i++) {
    const vgs = vgsMin + i * step;
    const id = calculateIdVds(vgs, vdsFixed, params);
    data.push({ vgs, id, vds: vdsFixed });
  }
  
  return data;
}

// Calculate transconductance at operating point
export function calculateGm(
  vgs: number,
  vds: number,
  params: MOSFETParams
): number {
  const { vth, kn, lambda } = params;
  const effectiveVth = Math.abs(vth);
  const effectiveVgs = Math.abs(vgs);
  
  if (effectiveVgs <= effectiveVth) return 0;
  
  const vov = effectiveVgs - effectiveVth;
  
  if (Math.abs(vds) < vov) {
    // Linear region
    return kn * Math.abs(vds);
  } else {
    // Saturation region
    return kn * vov * (1 + lambda * Math.abs(vds));
  }
}

// Calculate output resistance
export function calculateRout(
  vgs: number,
  vds: number,
  params: MOSFETParams
): number {
  const id = calculateIdVds(vgs, vds, params);
  if (Math.abs(id) < 1e-9) return Infinity;
  
  const { lambda } = params;
  return 1 / (lambda * Math.abs(id));
}

// ============================================
// SIMULATION TYPES (Run-to-Failure Analysis)
// ============================================

export interface SimulationParams {
  // Device specs (from datasheet or AI extraction)
  componentName: string;
  transistorType: string;
  maxCurrent: number;        // A
  maxVoltage: number;        // V
  powerDissipation: number;  // W
  rdsOn: number;             // mΩ (for MOSFETs)
  vceSat?: number;           // V (for BJTs/IGBTs)
  riseTime: number;          // ns
  fallTime: number;          // ns
  rthJC: number;             // °C/W (thermal resistance junction-to-case)
  maxTemperature: number;    // °C (max junction temp)
  
  // Simulation settings
  switchingFrequency: number; // kHz
  ambientTemperature: number; // °C
  coolingMethod: CoolingMethod;
  simulationMode: 'ftf' | 'temp' | 'budget';
  simulationAlgorithm: 'iterative' | 'binary';
  precisionSteps: number;
  coolingBudget?: number;     // W (for budget mode)
}

export interface CoolingMethod {
  name: string;
  value: string;
  thermalResistance: number;  // °C/W
  coolingBudget: number;      // W
}

export interface LiveDataPoint {
  current: number;
  temperature: number;
  powerLoss: number;
  conductionLoss: number;
  switchingLoss: number;
  progress: number;
  limitValue: number;
}

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
  timeToFailure?: number;     // seconds until failure
  cycleCount?: number;        // number of switching cycles
}

export interface ExtractedSpecs {
  transistorType: string;
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

// Cooling methods available
export const COOLING_METHODS: CoolingMethod[] = [
  { name: 'No Heatsink (Natural Convection)', value: 'none', thermalResistance: 60, coolingBudget: 2 },
  { name: 'Small TO-220 Heatsink', value: 'small-hs', thermalResistance: 15, coolingBudget: 8 },
  { name: 'Medium Aluminum Heatsink', value: 'medium-hs', thermalResistance: 5, coolingBudget: 25 },
  { name: 'Large Finned Heatsink', value: 'large-hs', thermalResistance: 2, coolingBudget: 60 },
  { name: 'Heatsink + Fan (Noctua NH-D15)', value: 'air-nh-d15', thermalResistance: 0.8, coolingBudget: 150 },
  { name: 'Water Cooling (AIO 240mm)', value: 'water-240', thermalResistance: 0.3, coolingBudget: 300 },
  { name: 'Custom Loop Water Cooling', value: 'water-custom', thermalResistance: 0.15, coolingBudget: 500 },
  { name: 'Phase Change Cooling', value: 'phase-change', thermalResistance: 0.05, coolingBudget: 800 },
];

// ============================================
// SIMULATION ENGINE
// ============================================

export function runSimulation(
  params: SimulationParams,
  onDataPoint: (point: LiveDataPoint) => void
): Promise<SimulationResult> {
  return new Promise((resolve) => {
    const {
      maxCurrent,
      maxVoltage,
      powerDissipation: maxPowerDissipation,
      rdsOn,
      vceSat,
      riseTime,
      fallTime,
      rthJC,
      maxTemperature,
      switchingFrequency,
      ambientTemperature,
      coolingMethod,
      simulationMode,
      simulationAlgorithm,
      precisionSteps,
      coolingBudget,
      transistorType,
    } = params;

    const totalRth = rthJC + coolingMethod.thermalResistance;
    const rdsOnOhms = (rdsOn || 0) / 1000;
    const effectiveCoolingBudget = 
      simulationMode === 'budget' && coolingBudget 
        ? coolingBudget 
        : coolingMethod.coolingBudget;

    const isMosfet = transistorType.includes('MOSFET') || transistorType.includes('GaN');
    const freqHz = switchingFrequency * 1000;
    
    let currentStep = 0;
    const maxSteps = precisionSteps;
    const currentIncrement = maxCurrent / maxSteps;
    
    let lastSafeCurrent = 0;
    let failureReason: SimulationResult['failureReason'] = null;
    let finalTemp = ambientTemperature;
    let finalPower = { total: 0, conduction: 0, switching: 0 };

    const simulate = () => {
      if (currentStep >= maxSteps) {
        // Completed without failure
        resolve({
          status: 'success',
          maxSafeCurrent: lastSafeCurrent,
          failureReason: null,
          details: `Device can safely handle up to ${lastSafeCurrent.toFixed(2)}A under these conditions.`,
          finalTemperature: finalTemp,
          powerDissipation: finalPower,
        });
        return;
      }

      const testCurrent = (currentStep + 1) * currentIncrement;
      
      // Calculate losses
      let conductionLoss: number;
      if (isMosfet) {
        conductionLoss = testCurrent * testCurrent * rdsOnOhms;
      } else {
        conductionLoss = testCurrent * (vceSat || 1.5);
      }
      
      // Switching losses (simplified model)
      const switchingEnergy = 0.5 * maxVoltage * testCurrent * ((riseTime + fallTime) * 1e-9);
      const switchingLoss = switchingEnergy * freqHz;
      
      const totalLoss = conductionLoss + switchingLoss;
      const junctionTemp = ambientTemperature + (totalLoss * totalRth);
      
      // Calculate progress based on mode
      let progress: number;
      let limitValue: number;
      
      switch (simulationMode) {
        case 'temp':
          progress = ((junctionTemp - ambientTemperature) / (maxTemperature - ambientTemperature)) * 100;
          limitValue = maxTemperature;
          break;
        case 'budget':
          progress = (totalLoss / effectiveCoolingBudget) * 100;
          limitValue = effectiveCoolingBudget;
          break;
        default: // ftf - first to fail
          const tempProgress = junctionTemp / maxTemperature;
          const powerProgress = totalLoss / maxPowerDissipation;
          const budgetProgress = totalLoss / effectiveCoolingBudget;
          const currentProgress = testCurrent / maxCurrent;
          progress = Math.max(tempProgress, powerProgress, budgetProgress, currentProgress) * 100;
          limitValue = 100;
      }

      // Report data point
      onDataPoint({
        current: testCurrent,
        temperature: junctionTemp,
        powerLoss: totalLoss,
        conductionLoss,
        switchingLoss,
        progress: Math.min(progress, 100),
        limitValue,
      });

      // Check failure conditions
      let failed = false;
      
      if (junctionTemp >= maxTemperature) {
        failureReason = 'Thermal';
        failed = true;
      } else if (testCurrent >= maxCurrent) {
        failureReason = 'Current';
        failed = true;
      } else if (totalLoss >= maxPowerDissipation) {
        failureReason = 'Power Dissipation';
        failed = true;
      } else if (totalLoss >= effectiveCoolingBudget) {
        failureReason = 'Cooling Budget';
        failed = true;
      }

      if (failed) {
        resolve({
          status: 'failure',
          maxSafeCurrent: lastSafeCurrent,
          failureReason,
          details: `Limit reached at ${testCurrent.toFixed(2)}A due to ${failureReason}. Junction temperature: ${junctionTemp.toFixed(1)}°C, Power: ${totalLoss.toFixed(1)}W.`,
          finalTemperature: junctionTemp,
          powerDissipation: { total: totalLoss, conduction: conductionLoss, switching: switchingLoss },
        });
        return;
      }

      lastSafeCurrent = testCurrent;
      finalTemp = junctionTemp;
      finalPower = { total: totalLoss, conduction: conductionLoss, switching: switchingLoss };
      currentStep++;
      
      // Use setTimeout to allow UI updates
      setTimeout(simulate, simulationAlgorithm === 'binary' ? 50 : 10);
    };

    simulate();
  });
}
