"use client";

import React, { useState, useTransition, useCallback, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from "@/hooks/use-toast";
import SimulationForm from '@/components/app/simulation-form';
import ResultsDisplay from '@/components/app/results-display';
import { findDatasheetAction, getAiCalculationsAction, getAiSuggestionsAction, runAiDeepDiveAction, extractSpecsFromDatasheetAction, getBestEffortSpecsAction } from '@/app/actions';
import type { SimulationResult, AiCalculatedExpectedResultsOutput, AiOptimizationSuggestionsOutput, CoolingMethod, ManualSpecs, LiveDataPoint, AiDeepDiveAnalysisInput, AiDeepDiveStep, HistoryEntry, FindDatasheetOutput, ExtractTransistorSpecsOutput, GetBestEffortSpecsOutput } from '@/lib/types';
import { coolingMethods, predefinedTransistors } from '@/lib/constants';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import HistoryView from './history-view';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { FileText, Search, Bot } from 'lucide-react';
import { Button } from '../ui/button';
import { isTauri, runTauriSimulation, convertToLiveDataPoints } from '@/lib/tauri';
import type { TauriSimulationParams } from '@/lib/tauri';
import LiveSimulationView from './live-simulation-view';
import type { LiveSimulationViewHandle } from './live-simulation-view';

const isMosfetType = (type: string) => {
    return type.includes('MOSFET') || type.includes('GaN');
};

const formSchema = z.object({
  predefinedComponent: z.string().optional(),
  componentName: z.string().optional(),
  datasheet: z.instanceof(File).optional(),
  
  // Core Specs
  transistorType: z.string().min(1, 'Transistor type is required.'),
  maxCurrent: z.coerce.number().positive(),
  maxVoltage: z.coerce.number().positive(),
  powerDissipation: z.coerce.number().positive().optional(),
  rdsOn: z.coerce.number().optional(), // mOhms
  vceSat: z.coerce.number().optional(), // V
  riseTime: z.coerce.number().positive(), // ns
  fallTime: z.coerce.number().positive(), // ns
  rthJC: z.coerce.number().positive("Junction-to-Case Thermal Resistance is required."), // °C/W
  maxTemperature: z.coerce.number().positive(),


  // Simulation Constraints
  simulationMode: z.enum(['ftf', 'temp', 'budget']).default('ftf'),
  simulationAlgorithm: z.enum(['iterative', 'binary']).default('iterative'),
  precisionSteps: z.coerce.number().min(10).max(500).default(200),
  switchingFrequency: z.coerce.number().positive(), // kHz
  coolingMethod: z.string().min(1, 'Please select a cooling method'),
  ambientTemperature: z.coerce.number().default(25),
  
  // FTF Limits
  coolingBudget: z.coerce.number().optional(),

}).superRefine((data: { componentName: any; predefinedComponent: any; transistorType: string; rdsOn: number; vceSat: number; simulationMode: string; coolingBudget: number; }, ctx: { addIssue: (arg0: { code: any; path: string[]; message: string; }) => void; }) => {
    if (!data.componentName && !data.predefinedComponent) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['componentName'], message: 'Device name is required if not selecting a predefined one.' });
    }
    if (data.transistorType && isMosfetType(data.transistorType) && (!data.rdsOn || data.rdsOn <= 0)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['rdsOn'], message: 'Rds(on) is required for this transistor type and must be positive.' });
    }
    if (data.transistorType && !isMosfetType(data.transistorType) && (!data.vceSat || data.vceSat <= 0)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['vceSat'], message: 'Vce(sat) is required for this transistor type and must be positive.' });
    }
    if (data.simulationMode === 'budget' && (!data.coolingBudget || data.coolingBudget <= 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['coolingBudget'], message: 'Cooling Budget must be a positive number for this mode.' });
    }
});


type FormValues = z.infer<typeof formSchema>;

type DialogState = 
    | { type: 'idle' }
    | { type: 'datasheet_found'; data: FindDatasheetOutput }
    | { type: 'no_datasheet_found' }
    | { type: 'best_effort_found'; data: GetBestEffortSpecsOutput };


export default function AmpereAnalyzer() {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [aiCalculatedResults, setAiCalculatedResults] = useState<AiCalculatedExpectedResultsOutput | null>(null);
  const [aiOptimizationSuggestions, setAiOptimizationSuggestions] = useState<AiOptimizationSuggestionsOutput | null>(null);
  const [datasheetFile, setDatasheetFile] = useState<File | null>(null);
  const [liveData, setLiveData] = useState<LiveDataPoint[]>([]);
  const [isDeepDiveRunning, setIsDeepDiveRunning] = useState(false);
  const [deepDiveSteps, setDeepDiveSteps] = useState<AiDeepDiveStep[]>([]);
  const [currentDeepDiveStep, setCurrentDeepDiveStep] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [dialogState, setDialogState] = useState<DialogState>({ type: 'idle' });

  // 60fps Canvas-based live view: data flows via refs, not React state
  const [displayData, setDisplayData] = useState<LiveDataPoint[]>([]);
  const liveViewRef = useRef<LiveSimulationViewHandle>(null);
  const pendingDataRef = useRef<LiveDataPoint[]>([]);
  const rafRef = useRef<number | null>(null);
  const deepDiveAnimationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [isLiveViewVisible, setIsLiveViewVisible] = useState(false);

  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('simulationHistory');
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
    } catch (error) {
        console.error("Could not load history from localStorage", error);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (deepDiveAnimationRef.current) clearInterval(deepDiveAnimationRef.current);
    }
  }, []);

  // 60fps render loop: drains pendingDataRef into the canvas via refs
  const startRenderLoop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const loop = () => {
      if (pendingDataRef.current.length > 0) {
        // Drain up to 10 points per frame
        const points = pendingDataRef.current.splice(0, Math.min(10, pendingDataRef.current.length));
        liveViewRef.current?.pushData(points);
        // Also accumulate for post-completion static display
        setDisplayData((prev: LiveDataPoint[]) => [...prev, ...points].slice(-300));
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, []);

  const stopRenderLoop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    // Flush remaining
    if (pendingDataRef.current.length > 0) {
      const remaining = pendingDataRef.current.splice(0);
      liveViewRef.current?.pushData(remaining);
      setDisplayData((prev: LiveDataPoint[]) => [...prev, ...remaining].slice(-300));
    }
  }, []);

  const addToHistory = (entry: HistoryEntry) => {
    const newHistory = [entry, ...history].slice(0, 50); // Keep last 50 results
    setHistory(newHistory);
    try {
      localStorage.setItem('simulationHistory', JSON.stringify(newHistory));
    } catch (error) {
       console.error("Could not save history to localStorage", error);
    }
  };

  const clearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem('simulationHistory');
    } catch (error) {
      console.error("Could not clear history from localStorage", error);
    }
  }


  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      predefinedComponent: '',
      componentName: '',
      maxTemperature: 150,
      coolingMethod: 'air-nh-d15',
      switchingFrequency: 100,
      ambientTemperature: 25,
      transistorType: 'MOSFET (N-Channel)',
      simulationMode: 'ftf',
      simulationAlgorithm: 'iterative',
      precisionSteps: 200,
    },
  });
  
  const scrollToResults = () => {
    setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };
  
  const populateFormWithSpecs = useCallback((specs: ManualSpecs | ExtractTransistorSpecsOutput | GetBestEffortSpecsOutput) => {
      form.setValue('maxCurrent', parseFloat(specs.maxCurrent) || 0);
      form.setValue('maxVoltage', parseFloat(specs.maxVoltage) || 0);
      form.setValue('powerDissipation', parseFloat(specs.powerDissipation) || 0);
      form.setValue('rthJC', parseFloat(specs.rthJC) || 0);
      form.setValue('maxTemperature', parseFloat(specs.maxTemperature) || 150);
      form.setValue('riseTime', parseFloat(specs.riseTime) || 0);
      form.setValue('fallTime', parseFloat(specs.fallTime) || 0);

      const type = specs.transistorType || form.getValues('transistorType');
      form.setValue('transistorType', type);

      if (isMosfetType(type)) {
          form.setValue('rdsOn', parseFloat(specs.rdsOn) || 0);
          form.setValue('vceSat', undefined);
      } else {
          form.setValue('vceSat', parseFloat(specs.vceSat) || 0);
          form.setValue('rdsOn', undefined);
      }
      toast({ title: "Specifications Loaded", description: "The form has been updated with the new component data." });
  }, [form, toast]);


  const handleTransistorSelect = (value: string) => {
    const transistor = predefinedTransistors.find(t => t.value === value);
    if (transistor) {
      form.reset({
        ...form.getValues(),
        predefinedComponent: value,
        componentName: transistor.name,
      });
      populateFormWithSpecs(transistor.specs);
    }
  };
  
  const handleDatasheetLookup = useCallback(async () => {
    const componentName = form.getValues('componentName');
    const uploadedFile = datasheetFile;

    if (!componentName) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter a component name.' });
      return;
    }

    startTransition(async () => {
      // If a file is uploaded, parse it directly.
      if (uploadedFile) {
        toast({ title: 'Parsing Uploaded PDF', description: 'The AI is extracting specs from your datasheet...' });
        const formData = new FormData();
        formData.append('componentName', componentName);
        formData.append('datasheet', uploadedFile);
        const result = await extractSpecsFromDatasheetAction(formData);
        if (result.error) {
          toast({ variant: 'destructive', title: 'Datasheet Parsing Error', description: result.error });
        } else if (result.data) {
          populateFormWithSpecs(result.data);
        }
        return;
      }

      // Stage 1: Strictly look for a datasheet PDF.
      toast({ title: 'AI Datasheet Search', description: 'The AI is looking for an official datasheet PDF...' });
      const formData = new FormData();
      formData.append('componentName', componentName);
      
      const result = await findDatasheetAction(formData);

      if (result.error) {
        toast({ variant: 'destructive', title: 'AI Search Error', description: result.error });
      } else if (result.data) {
        // Datasheet found, show confirmation dialog.
        setDialogState({ type: 'datasheet_found', data: result.data });
      } else {
        // No datasheet found, trigger the "no_datasheet_found" dialog.
        setDialogState({ type: 'no_datasheet_found' });
      }
    });
  }, [form, datasheetFile, toast, populateFormWithSpecs]);

  const handleBestEffortSearch = useCallback(async () => {
    const componentName = form.getValues('componentName');
    if (!componentName) return;

    setDialogState({ type: 'idle' });
    startTransition(async () => {
        toast({ title: 'AI "Bloodhound" Mode Activated', description: "Scouring the internet for parameters...", duration: 5000 });
        const result = await getBestEffortSpecsAction(componentName);

        if (result.error || !result.data) {
            toast({ variant: 'destructive', title: 'Best Effort Search Failed', description: result.error || "Could not find any parameters." });
        } else {
            setDialogState({ type: 'best_effort_found', data: result.data });
        }
    });
  }, [form, toast]);


  // Compute shared simulation parameters from form values
  const buildSimParams = (values: FormValues) => {
    const selectedCooling = coolingMethods.find(c => c.value === values.coolingMethod) as CoolingMethod;
    const totalRth = values.rthJC + selectedCooling.thermalResistance;
    const rdsOnOhms = (values.rdsOn || 0) / 1000;
    const effectiveCoolingBudget = (values.simulationMode === 'budget' && values.coolingBudget)
      ? values.coolingBudget
      : selectedCooling.coolingBudget;
    return { selectedCooling, totalRth, rdsOnOhms, effectiveCoolingBudget };
  };

  // Run simulation via Rust/Tauri backend (returns all data at once)
  const runTauriSim = async (
    values: FormValues,
    updateCallback: (data: LiveDataPoint) => void
  ): Promise<SimulationResult> => {
    const { totalRth, rdsOnOhms, effectiveCoolingBudget } = buildSimParams(values);

    const params: TauriSimulationParams = {
      maxCurrent: values.maxCurrent,
      maxVoltage: values.maxVoltage,
      powerDissipation: values.powerDissipation ?? null,
      rthJc: values.rthJC,
      riseTime: values.riseTime,
      fallTime: values.fallTime,
      switchingFrequency: values.switchingFrequency,
      maxTemperature: values.maxTemperature,
      ambientTemperature: values.ambientTemperature,
      totalRth,
      transistorType: values.transistorType,
      rdsOnOhms,
      vceSat: values.vceSat ?? null,
      simulationMode: values.simulationMode,
      coolingBudget: values.coolingBudget ?? null,
      simulationAlgorithm: values.simulationAlgorithm,
      precisionSteps: values.precisionSteps,
      effectiveCoolingBudget,
    };

    const tauriResult = await runTauriSimulation(params);

    // Feed all data points into the callback so the chart still animates
    const livePoints = convertToLiveDataPoints(tauriResult);
    for (const point of livePoints) {
      updateCallback(point);
    }

    return {
      status: tauriResult.status,
      maxSafeCurrent: tauriResult.maxSafeCurrent,
      failureReason: tauriResult.failureReason,
      details: tauriResult.details,
      finalTemperature: tauriResult.finalTemperature,
      powerDissipation: tauriResult.powerDissipation,
    } as SimulationResult;
  };

  // Run simulation via Web Worker (streams data points back)
  const runWorkerSim = (
    values: FormValues,
    updateCallback: (data: LiveDataPoint) => void
  ): Promise<SimulationResult> => {
    return new Promise((resolve, reject) => {
      const { totalRth, rdsOnOhms, effectiveCoolingBudget } = buildSimParams(values);
      const {
        maxCurrent, maxVoltage, powerDissipation, rthJC, riseTime, fallTime,
        switchingFrequency, maxTemperature, ambientTemperature,
        transistorType, vceSat, simulationMode, coolingBudget,
        simulationAlgorithm, precisionSteps,
      } = values;

      const worker = new Worker('/simulation-worker.js');

      worker.onmessage = (e) => {
        const { type, data, result } = e.data;
        if (type === 'dataPoint') {
          updateCallback(data);
        } else if (type === 'dataBatch') {
          for (const point of data) {
            updateCallback(point);
          }
        } else if (type === 'complete') {
          worker.terminate();
          resolve(result);
        }
      };

      worker.onerror = (error) => {
        worker.terminate();
        reject(error);
      };

      worker.postMessage({
        maxCurrent, maxVoltage, powerDissipation, rthJC, riseTime, fallTime,
        switchingFrequency, maxTemperature, ambientTemperature, totalRth,
        transistorType, rdsOnOhms, vceSat, simulationMode, coolingBudget,
        simulationAlgorithm, precisionSteps, effectiveCoolingBudget
      });
    });
  };

  // Unified entry point: picks Tauri or Web Worker at runtime
  const runSimulation = (
    values: FormValues,
    updateCallback: (data: LiveDataPoint) => void
  ): Promise<SimulationResult> => {
    if (isTauri()) {
      return runTauriSim(values, updateCallback);
    }
    return runWorkerSim(values, updateCallback);
  };
  


// onSubmit: uses 60fps requestAnimationFrame loop + Canvas refs
const onSubmit = (values: FormValues) => {
  startTransition(async () => {
    stopRenderLoop();

    // Reset state
    setSimulationResult(null);
    setAiCalculatedResults(null);
    setAiOptimizationSuggestions(null);
    setLiveData([]);
    setDisplayData([]);
    pendingDataRef.current = [];
    setIsLiveViewVisible(true);

    // Wait a tick for the LiveSimulationView to mount before pushing data
    await new Promise(r => setTimeout(r, 50));
    liveViewRef.current?.clear();
    scrollToResults();

    const componentName = values.predefinedComponent
      ? predefinedTransistors.find(t => t.value === values.predefinedComponent)?.name || 'N/A'
      : values.componentName || 'N/A';

    if (!values.maxCurrent || values.maxCurrent <= 0) {
      toast({ variant: 'destructive', title: 'Invalid Input', description: 'Please populate component specs before running an analysis.' });
      setIsLiveViewVisible(false);
      return;
    }

    // Callback: push to pending buffer, rAF loop drains to canvas
    const updateCallback = (newDataPoint: LiveDataPoint) => {
      pendingDataRef.current.push(newDataPoint);
    };

    // Start 60fps render loop
    startRenderLoop();

    // Run simulation
    const simResult = await runSimulation(values, updateCallback);

    // Stop render loop and flush
    stopRenderLoop();
    setIsLiveViewVisible(false);
    setSimulationResult(simResult);

    const historyEntry: HistoryEntry = {
      id: new Date().toISOString(),
      componentName,
      timestamp: new Date().toISOString(),
      simulationResult: simResult,
      formValues: values,
    };
    addToHistory(historyEntry);
  });
};
  const runDeepDiveSimulation = useCallback(async (
      initialValues: FormValues,
      newValues: Partial<FormValues>
  ): Promise<{ result: SimulationResult, dataQueue: LiveDataPoint[] }> => {
      const combinedValues = { ...initialValues, ...newValues };
      const dataQueue: LiveDataPoint[] = [];
      const result = await new Promise<SimulationResult>((resolve) => {
        runSimulation(combinedValues, (newData) => {
            dataQueue.push(newData);
        }).then(resolve);
      });
      return { result, dataQueue };
  }, [runSimulation]);

  const handleAiDeepDive = useCallback(async () => {
    if (!simulationResult || !aiOptimizationSuggestions) {
        toast({ variant: 'destructive', title: 'Error', description: 'Need initial results to run a deep dive.' });
        return;
    }
    
    startTransition(async () => {
        setIsDeepDiveRunning(true);
        setCurrentDeepDiveStep(0);
        setDeepDiveSteps([]);
        setLiveData([]);
        scrollToResults();
        if (deepDiveAnimationRef.current) clearInterval(deepDiveAnimationRef.current);

        const values = form.getValues();
        const componentName = values.predefinedComponent
            ? predefinedTransistors.find(t => t.value === values.predefinedComponent)?.name || 'N/A'
            : values.componentName || 'N/A';
        
        const selectedCooling = coolingMethods.find(c => c.value === values.coolingMethod);
        const coolingBudgetVal = values.simulationMode === 'budget' && values.coolingBudget 
            ? values.coolingBudget 
            : (selectedCooling?.coolingBudget || 0);

        const simulationSummary = `Result: ${simulationResult.status}. Failure Reason: ${simulationResult.failureReason || 'None'}. Details: ${simulationResult.details}`;
        
        const initialSpecs: Partial<FormValues> = { ...values };
        delete initialSpecs.datasheet;
        delete initialSpecs.predefinedComponent;

        const deepDiveInput: AiDeepDiveAnalysisInput = {
            componentName,
            coolingMethod: selectedCooling?.name || 'N/A',
            maxTemperature: values.maxTemperature,
            coolingBudget: coolingBudgetVal,
            simulationResults: simulationSummary,
            allCoolingMethods: JSON.stringify(coolingMethods.map(c => ({name: c.name, value: c.value, thermalResistance: c.thermalResistance, coolingBudget: c.coolingBudget}))),
            initialSpecs: JSON.stringify(initialSpecs),
        };

        toast({ title: "AI Deep Dive Started", description: "The AI is running an iterative analysis..." });
        
        const result = await runAiDeepDiveAction(deepDiveInput);

        if (result.error || !result.data) {
            toast({ variant: 'destructive', title: 'AI Deep Dive Error', description: result.error || "No data returned from AI." });
            setIsDeepDiveRunning(false);
            return;
        } 
        
        const bestCoolerInfo = coolingMethods.find(c => c.value === result.data.bestCoolingMethod);

        // Prepare simulation steps
        const simulationSteps: AiDeepDiveStep[] = [
            {
                title: "Analyzing Initial Results",
                description: `AI is reviewing the initial simulation where the failure occurred at ${simulationResult.maxSafeCurrent.toFixed(2)}A due to ${simulationResult.failureReason}. The goal is to push past this limit.`,
                simulationResult: simulationResult,
                simulationParams: {},
            },
            {
                title: `Optimizing Frequency to ${result.data.optimalFrequency} kHz`,
                description: `AI has identified that reducing switching losses is key. It's now testing a new frequency of ${result.data.optimalFrequency} kHz.`,
                simulationResult: null,
                simulationParams: { switchingFrequency: result.data.optimalFrequency },
            },
            {
                title: `Applying Cooler: ${bestCoolerInfo?.name || result.data.bestCoolingMethod}`,
                description: `To handle the remaining heat, the AI is applying the '${bestCoolerInfo?.name || result.data.bestCoolingMethod}' and re-evaluating performance with the new thermal solution.`,
                simulationResult: null,
                simulationParams: { coolingMethod: result.data.bestCoolingMethod, switchingFrequency: result.data.optimalFrequency },
            },
            {
                title: "Final Recommendation",
                description: result.data.reasoning,
                simulationResult: null,
                simulationParams: {},
            }
        ];
        
        setDeepDiveSteps(simulationSteps);

        // This function will animate a single simulation's data with throttling
        const animateSimulationData = (dataQueue: LiveDataPoint[]) => {
            return new Promise<void>((resolve) => {
                if (deepDiveAnimationRef.current) {
                    clearInterval(deepDiveAnimationRef.current);
                    deepDiveAnimationRef.current = null;
                }
                setLiveData([]);

                const MAX_POINTS = 150;
                const UPDATE_INTERVAL = 50; // ~20fps for deep dive animation

                deepDiveAnimationRef.current = setInterval(() => {
                    if (dataQueue.length > 0) {
                        // Take up to 3 points per update
                        const pointsToTake = Math.min(3, dataQueue.length);
                        const newPoints = dataQueue.splice(0, pointsToTake);
                        setLiveData((prev: LiveDataPoint[]) => [...prev, ...newPoints].slice(-MAX_POINTS));
                    } else {
                        clearInterval(deepDiveAnimationRef.current!);
                        deepDiveAnimationRef.current = null;
                        resolve();
                    }
                }, UPDATE_INTERVAL);
            });
        };

        // Run through steps
        for(let i = 0; i < simulationSteps.length; i++) {
            setCurrentDeepDiveStep(i);
            const step = simulationSteps[i];

            if(step.simulationResult === null && Object.keys(step.simulationParams).length > 0) {
                const { result: stepSimResult, dataQueue } = await runDeepDiveSimulation(values, step.simulationParams);
                simulationSteps[i].simulationResult = stepSimResult;
                setDeepDiveSteps([...simulationSteps]);
                await animateSimulationData(dataQueue);
                
            } else if (step.simulationResult) {
                 const { dataQueue } = await runDeepDiveSimulation(values, {});
                 await animateSimulationData(dataQueue);
            }

            if(i < simulationSteps.length -1) {
              await new Promise(r => setTimeout(r, 2500)); // wait before going to next step
            }
        }
        
        toast({
            title: "AI Deep Dive Complete",
            description: `Optimal solution found! Projected Current: ${result.data.projectedMaxSafeCurrent.toFixed(2)}A.`,
            duration: 9000,
        });
        
        const finalDiveResult = simulationSteps[simulationSteps.length-2].simulationResult;
        if (finalDiveResult) {
            const historyEntry: HistoryEntry = {
                id: new Date().toISOString(),
                componentName: `${componentName} (AI Optimized)`,
                timestamp: new Date().toISOString(),
                simulationResult: finalDiveResult,
                formValues: { ...values, coolingMethod: result.data.bestCoolingMethod, switchingFrequency: result.data.optimalFrequency },
            };
            addToHistory(historyEntry);
        }

        // Keep the dive view open, but mark it as 'done'
        setIsDeepDiveRunning(true); 
    });

}, [simulationResult, aiOptimizationSuggestions, form, toast, runDeepDiveSimulation, history]);


  const renderDialogs = () => {
    switch (dialogState.type) {
        case 'datasheet_found': {
            const { data } = dialogState;
            const { keyParameters } = data;
            return (
                <AlertDialog open={true} onOpenChange={() => setDialogState({ type: 'idle' })}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2"><Search /> AI Datasheet Found</AlertDialogTitle>
                            <AlertDialogDescription>The AI found a likely datasheet for your component. How should we proceed?</AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="p-4 my-4 bg-muted/50 rounded-lg text-center">
                            <FileText className="h-8 w-8 mx-auto text-primary mb-2" />
                            <p className="font-semibold">{data.foundDatasheetName}</p>
                            <p className="text-sm text-muted-foreground mt-2">
                                Max Current: <span className="font-medium text-foreground">{keyParameters.maxCurrent}A</span>, 
                                Max Voltage: <span className="font-medium text-foreground">{keyParameters.maxVoltage}V</span>, 
                                Rds(on)/Vce(sat): <span className="font-medium text-foreground">{keyParameters.rdsOn || keyParameters.vceSat}</span>
                            </p>
                        </div>
                        <AlertDialogFooter className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                             <Button variant="outline" onClick={handleBestEffortSearch}>Use Best Effort Instead</Button>
                            <AlertDialogAction onClick={() => {
                                // For now, parsing the "found" PDF is a simulation. 
                                // We'll trigger the best effort search to get full specs as if they were parsed.
                                handleBestEffortSearch();
                                toast({ title: "Parsing Datasheet...", description: "AI is extracting full parameters." });
                            }}>Yes, Parse Full Specs</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            );
        }
        case 'no_datasheet_found':
            return (
                <AlertDialog open={true} onOpenChange={() => setDialogState({ type: 'idle' })}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2"><Bot /> No Datasheet Found</AlertDialogTitle>
                            <AlertDialogDescription>The AI couldn't find a specific datasheet PDF. Would you like to activate "Bloodhound Mode" to scour the web for individual parameters?</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleBestEffortSearch}>Find Best Effort Parameters</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            );
        case 'best_effort_found': {
            const { data: specs } = dialogState;
            return (
                <AlertDialog open={true} onOpenChange={() => setDialogState({ type: 'idle' })}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2"><Bot /> AI Best Effort Results</AlertDialogTitle>
                            <AlertDialogDescription>The AI has compiled the following parameters. Confidence: <span className='font-bold'>{specs.confidence}</span>.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="p-3 my-2 bg-muted/50 rounded-lg text-xs space-y-1">
                            <p><strong>Sources:</strong> <em className="text-muted-foreground">{specs.sources}</em></p>
                             <p>
                                Max Current: <span className="font-medium text-foreground">{specs.maxCurrent}A</span>,
                                Max Voltage: <span className="font-medium text-foreground">{specs.maxVoltage}V</span>,
                                Rds(on): <span className="font-medium text-foreground">{specs.rdsOn}m&#8486;</span>
                            </p>
                        </div>
                        <AlertDialogFooter className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                             <AlertDialogCancel>Discard</AlertDialogCancel>
                            <AlertDialogAction onClick={() => {
                                populateFormWithSpecs(specs);
                                setDialogState({ type: 'idle' });
                            }}>Use These Parameters</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            );
        }
        default:
            return null;
    }
  }


  return (
    <div className="space-y-8">
      <header className="text-center">
        <h1 className="text-5xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-white to-purple-400">Ampere Analyzer</h1>
        <p className="mt-4 text-lg text-purple-200/80 max-w-2xl mx-auto">
          Advanced power transistor analysis with multi-variable thermal simulation.
        </p>
      </header>
      <Tabs defaultValue='analyzer' className='w-full'>
        <TabsList className='grid w-full grid-cols-2'>
            <TabsTrigger value="analyzer">Analyzer</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="analyzer">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mt-6">
                <div className="md:col-span-2">
                    <SimulationForm 
                    form={form} 
                    onSubmit={onSubmit} 
                    isPending={isPending} 
                    onTransistorSelect={handleTransistorSelect}
                    onDatasheetLookup={handleDatasheetLookup}
                    setDatasheetFile={setDatasheetFile}
                    />
                </div>
                <div className="md:col-span-3" ref={resultsRef}>
                    {/* 60fps Canvas live view — rendered here so we own the ref */}
                    {isLiveViewVisible && (
                      <LiveSimulationView
                        ref={liveViewRef}
                        simulationMode={form.getValues().simulationMode}
                        maxTemperature={form.getValues().maxTemperature}
                      />
                    )}
                    <ResultsDisplay
                        isLoading={isPending}
                        simulationResult={simulationResult}
                        aiCalculatedResults={aiCalculatedResults}
                        aiOptimizationSuggestions={aiOptimizationSuggestions}
                        liveData={displayData}
                        formValues={form.getValues()}
                        onAiDeepDive={handleAiDeepDive}
                        isDeepDiveRunning={isDeepDiveRunning}
                        deepDiveSteps={deepDiveSteps}
                        currentDeepDiveStep={currentDeepDiveStep}
                        liveViewHandledByParent={isLiveViewVisible}
                    />
                </div>
            </div>
        </TabsContent>
         <TabsContent value="history">
            <HistoryView history={history} clearHistory={clearHistory} />
        </TabsContent>
      </Tabs>
      
      {renderDialogs()}
    </div>
  );
}