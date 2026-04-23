# Ampere Analyzer

Ampere Analyzer is now a `SvelteKit` web app with a worker-driven TypeScript simulation core, canvas-based live graphing, browser-local history, and explicit AI endpoints for datasheet extraction, best-effort spec search, expected-result estimation, optimization suggestions, and deep-dive analysis.

## Stack

- `SvelteKit` for the web app shell
- `TypeScript` for the simulation engine and worker protocol
- `Genkit + Google AI` for the AI flows
- `Vitest + Testing Library` for unit and component tests

## Commands

- `npm install`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run dev`

## Key Design Changes

- The live graph no longer depends on SVG chart reconciliation. It renders to canvas and consumes a bounded worker-fed buffer.
- The simulation engine uses normalized typed inputs with separate device ratings and operating conditions.
- `operatingVoltage` is now explicit and `dutyCycle` is no longer hidden inside the formulas.
- AI actions are exposed through real SvelteKit endpoints instead of unused Next server actions.
- Deep-dive analysis runs through an explicit finite-state flow and reuses the same simulation/graph path without forced remounts.
