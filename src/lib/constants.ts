import type { CoolingMethod, PredefinedTransistor, SimulationFormValues } from './types';
export { transistorTypes } from './types';

export const coolingMethods: CoolingMethod[] = [
  { name: 'Noctua NH-L9i/a', value: 'air-nh-l9', thermalResistance: 3.5, coolingBudget: 95, group: 'Air Cooling' },
  { name: 'Cryorig C7', value: 'air-c7', thermalResistance: 3.2, coolingBudget: 100, group: 'Air Cooling' },
  { name: 'Scythe Big Shuriken 3', value: 'air-shuriken-3', thermalResistance: 2.8, coolingBudget: 125, group: 'Air Cooling' },
  { name: 'Cooler Master Hyper 212 EVO', value: 'air-hyper-212', thermalResistance: 2.0, coolingBudget: 150, group: 'Air Cooling' },
  { name: 'be quiet! Pure Rock 2', value: 'air-pure-rock-2', thermalResistance: 1.8, coolingBudget: 150, group: 'Air Cooling' },
  { name: 'ARCTIC Freezer 34 eSports DUO', value: 'air-freezer-34', thermalResistance: 1.6, coolingBudget: 210, group: 'Air Cooling' },
  { name: 'Noctua NH-D15', value: 'air-nh-d15', thermalResistance: 1.1, coolingBudget: 220, group: 'Air Cooling' },
  { name: 'be quiet! Dark Rock Pro 4', value: 'air-dark-rock-pro-4', thermalResistance: 1.0, coolingBudget: 250, group: 'Air Cooling' },
  { name: 'Deepcool Assassin IV', value: 'air-assassin-iv', thermalResistance: 0.95, coolingBudget: 280, group: 'Air Cooling' },
  { name: 'Corsair H60 (120mm)', value: 'aio-120-h60', thermalResistance: 0.8, coolingBudget: 170, group: 'AIO Water Cooling' },
  { name: 'ARCTIC Liquid Freezer III (240mm)', value: 'aio-240-lf3', thermalResistance: 0.5, coolingBudget: 280, group: 'AIO Water Cooling' },
  { name: 'Corsair H115i (280mm)', value: 'aio-280-h115i', thermalResistance: 0.45, coolingBudget: 320, group: 'AIO Water Cooling' },
  { name: 'Lian Li Galahad (360mm)', value: 'aio-360-galahad', thermalResistance: 0.35, coolingBudget: 360, group: 'AIO Water Cooling' },
  { name: 'EK-Nucleus AIO CR360 Lux (360mm)', value: 'aio-360-ek-nucleus', thermalResistance: 0.3, coolingBudget: 400, group: 'AIO Water Cooling' },
  { name: 'ARCTIC Liquid Freezer III (420mm)', value: 'aio-420-lf3', thermalResistance: 0.25, coolingBudget: 450, group: 'AIO Water Cooling' },
  { name: 'Custom Loop (Single 240mm Slim Rad)', value: 'custom-loop-single-240', thermalResistance: 0.28, coolingBudget: 450, group: 'Custom Water Cooling' },
  { name: 'Custom Loop (Single 360mm Thick Rad)', value: 'custom-loop-single-360', thermalResistance: 0.15, coolingBudget: 700, group: 'Custom Water Cooling' },
  { name: 'Custom Loop (Dual 360mm Rads)', value: 'custom-loop-dual-360', thermalResistance: 0.08, coolingBudget: 1200, group: 'Custom Water Cooling' },
  { name: 'Custom Loop (Dual 480mm Rads)', value: 'custom-loop-dual-480', thermalResistance: 0.06, coolingBudget: 1500, group: 'Custom Water Cooling' },
  { name: 'Extreme Custom Loop (Triple+ Rads)', value: 'custom-loop-extreme', thermalResistance: 0.04, coolingBudget: 2000, group: 'Custom Water Cooling' },
  { name: 'Industrial Heatsink (Large Passive)', value: 'industrial-passive', thermalResistance: 4.0, coolingBudget: 50, group: 'Industrial Cooling' },
  { name: 'Thermoelectric Cooler (TEC/Peltier)', value: 'exotic-tec', thermalResistance: 0.15, coolingBudget: 800, group: 'Exotic Cooling' },
  { name: 'Phase Change Cooling', value: 'exotic-phase-change', thermalResistance: 0.02, coolingBudget: 2500, group: 'Exotic Cooling' },
  { name: 'Liquid Nitrogen (LN2 Pot)', value: 'exotic-ln2', thermalResistance: 0.001, coolingBudget: 5000, group: 'Exotic Cooling' }
];

export const predefinedTransistors: PredefinedTransistor[] = [
  {
    name: 'IRFZ44N (General Purpose MOSFET)',
    value: 'IRFZ44N',
    specs: {
      transistorType: 'MOSFET (N-Channel)',
      maxCurrent: '49',
      maxVoltage: '55',
      powerDissipation: '94',
      rdsOn: '17.5',
      vceSat: '',
      riseTime: '60',
      fallTime: '45',
      rthJC: '1.5',
      maxTemperature: '175'
    }
  },
  {
    name: '2N7000 (Small Signal MOSFET)',
    value: '2N7000',
    specs: {
      transistorType: 'MOSFET (N-Channel)',
      maxCurrent: '0.2',
      maxVoltage: '60',
      powerDissipation: '0.4',
      rdsOn: '5000',
      vceSat: '',
      riseTime: '20',
      fallTime: '20',
      rthJC: '312.5',
      maxTemperature: '150'
    }
  },
  {
    name: 'STP60NF06 (Automotive MOSFET)',
    value: 'STP60NF06',
    specs: {
      transistorType: 'MOSFET (N-Channel)',
      maxCurrent: '60',
      maxVoltage: '60',
      powerDissipation: '110',
      rdsOn: '14',
      vceSat: '',
      riseTime: '100',
      fallTime: '35',
      rthJC: '1.36',
      maxTemperature: '175'
    }
  },
  {
    name: 'BS170 (N-Channel MOSFET)',
    value: 'BS170',
    specs: {
      transistorType: 'MOSFET (N-Channel)',
      maxCurrent: '0.5',
      maxVoltage: '60',
      powerDissipation: '0.83',
      rdsOn: '1200',
      vceSat: '',
      riseTime: '10',
      fallTime: '10',
      rthJC: '150',
      maxTemperature: '150'
    }
  },
  {
    name: 'TIP31C (NPN BJT)',
    value: 'TIP31C',
    specs: {
      transistorType: 'BJT (NPN)',
      maxCurrent: '3',
      maxVoltage: '100',
      powerDissipation: '40',
      rdsOn: '',
      vceSat: '1.2',
      riseTime: '30',
      fallTime: '25',
      rthJC: '3.12',
      maxTemperature: '150'
    }
  }
];

export const defaultFormValues: SimulationFormValues = {
  predefinedComponent: '',
  componentName: '',
  transistorType: 'MOSFET (N-Channel)',
  maxCurrent: 49,
  maxVoltage: 55,
  powerDissipation: 94,
  rdsOn: 17.5,
  vceSat: null,
  riseTime: 60,
  fallTime: 45,
  rthJC: 1.5,
  maxTemperature: 175,
  switchingFrequency: 100,
  operatingVoltage: 48,
  dutyCycle: 0.5,
  coolingMethod: 'air-nh-d15',
  ambientTemperature: 25,
  coolingBudget: null,
  simulationMode: 'ftf',
  simulationAlgorithm: 'iterative',
  precisionSteps: 200
};
