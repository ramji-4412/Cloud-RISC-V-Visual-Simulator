# Frontend Reference

## Overview

The frontend is a React 18 application built with Vite, using Tailwind CSS for styling
and lucide-react for icons. It runs on `http://localhost:3000` (dev) or as a static
build (production). It communicates with the FastAPI backend at `http://127.0.0.1:8000`
via the Fetch API.

## Technology Stack

| Technology | Purpose |
|------------|---------|
| React 18 | UI framework |
| Vite | Build tool and dev server |
| lucide-react | Icon library |
| Tailwind CSS / PostCSS | Styling |
| Fetch API | HTTP client (no axios dependency) |

## Application Structure

```
frontend/src/
├── App.jsx                 # Main application orchestrator
├── main.jsx                # React entry point
├── index.css               # Global styles
├── components/
│   ├── layout/
│   │   ├── Panel.jsx       # Reusable collapsible panel container
│   │   ├── TopBar.jsx      # App header with status indicators
│   │   └── StatusBar.jsx   # Footer with cycle/stats/message log
│   ├── controls/
│   │   └── SimulationControls.jsx  # Start/stop/reset/step/run buttons
│   ├── editor/
│   │   ├── AssemblyEditor.jsx      # contenteditable assembly source editor
│   │   ├── AssemblyToolbar.jsx     # Assemble / Assemble & Load buttons
│   │   └── MachineCodePanel.jsx    # Assembled machine code table
│   ├── inspector/
│   │   ├── ProcessorInspector.jsx  # Tabbed: Registers / Memory / Pipeline
│   │   ├── RegisterFile.jsx        # x0-x31 with ABI aliases, hex + decimal
│   │   └── MemoryViewer.jsx        # Data memory viewer with copy-to-clipboard
│   ├── pipeline/
│   │   ├── PipelineView.jsx        # Five-stage pipeline visualization
│   │   └── PipelineStage.jsx       # Individual stage card
│   └── waveform/
│       ├── WaveformViewer.jsx      # SVG waveform renderer with signal selection
│       └── VcdParser.js            # Client-side VCD parser
├── hooks/
│   └── useBackendStatus.js   # Polls backend health every 4 seconds
├── services/
│   ├── backendApi.js         # Raw Fetch API wrappers for all endpoints
│   └── simulationService.js  # Higher-level service facade
├── stores/
│   └── simulationStore.js    # Simulation state store
└── styles/
    ├── theme.css             # Design tokens
    └── workspace.css         # Layout styles
```

## State Management

`App.jsx` is the central state holder. Key state variables:

| State | Type | Purpose |
|-------|------|---------|
| `source` | string | Assembly editor source text |
| `assembleResult` | object | Last assembler response |
| `assembleError` | string | Last assembler error message |
| `isAssembling` | boolean | Assembly in progress flag |
| `simStatus` | object | Simulator status from backend |
| `pipelineState` | object | Current pipeline stage data |
| `registers` | array | 32 GPR values |
| `memory` | array | Data memory contents |
| `memoryAddress` / `memoryWords` | number | Memory view address and word count |
| `isSimulating` | boolean | Any simulation operation in progress |
| `traceEnabled` / `isTracing` | boolean | VCD tracing state |
| `parsedTrace` | object | Parsed VCD data (signals + timeline) |
| `traceError` | string | Last trace error |
| `runCyclesCount` | number | User-configured cycle count for run |

## Data Flow

### Assembly Flow

1. User types in `AssemblyEditor` (contenteditable div with line numbers)
2. `App.jsx` `source` state stays in sync via `onChange`
3. Click "Assemble" → `simulationService.assemble(source)` → POST `/api/assembler/assemble`
4. Result stored in `assembleResult`; rendered in `MachineCodePanel`
5. Click "Assemble and Load" → also POSTs to `/api/assembler/assemble-and-load`,
   which writes `.hex` via WSL and loads into simulator

### Simulation Flow

1. Click "Start Sim" → POST `/api/simulator/start` → launches Verilator via WSL
2. Click "Step" → POST `/api/simulator/step` → returns pipeline state
3. Click "Run N cycles" → POST `/api/simulator/run-cycles` → returns pipeline state
4. After each operation, `refreshProcessorState()` concurrently fetches
   `/api/simulator/pipeline`, `/api/simulator/registers`, `/api/simulator/memory`
5. UI updates: `PipelineView`, `RegisterFile`, `MemoryViewer`, `StatusBar`

### Trace / Waveform Flow

1. Click "Start Trace" → POST `/api/trace/start` → enables VCD in simulator
2. Run cycles → VCD data accumulates in the WSL filesystem
3. Click "Stop Trace" → POST `/api/trace/stop` → closes VCD file
4. `GET /api/trace/file?filename=pipeline.vcd` → retrieves raw VCD text
5. `parseVcd(content)` → produces `{signals, timeline, timescale}`
6. `WaveformViewer` renders SVG waveforms with signal checkboxes, time axis,
   horizontal scrolling

## Key Components

### Panel (`components/layout/Panel.jsx`)

Reusable collapsible panel with title bar, optional actions, and scrollable body.
Used for Assembly Editor, Pipeline, Processor Inspector, and Waveform Viewer.

### TopBar (`components/layout/TopBar.jsx`)

Application header showing:
- App title ("Cloud RISC-V Visual Simulator")
- Backend status (online/offline/checking/error)
- Verilator status (running/stopped)
- ISA info (RV32I)
- Refresh button

### StatusBar (`components/layout/StatusBar.jsx`)

Footer showing:
- Simulator running/stopped indicator
- Cycle count, stall count, redirect flag, PC select
- Program file name
- Scrolling message log (last 3 messages)

### AssemblyEditor (`components/editor/AssemblyEditor.jsx`)

Lightweight `contenteditable` editor with:
- Manual line-number gutter (synced to scroll)
- Tab inserts 2 spaces (not focus change)
- Error line markers (rose-colored overlays)
- "Load Example" button (loads Phase A regression program)
- "Clear" button

### MachineCodePanel (`components/editor/MachineCodePanel.jsx`)

Displays assembled instructions as a table (Address, Source, Machine Code hex).
Clicking a row highlights it. Shows "No assembly result yet" or "Assembly failed"
states.

### SimulationControls (`components/controls/SimulationControls.jsx`)

Transport controls with:
- Start/Stop/Restart buttons (mutually exclusive based on connection state)
- Reset, Step buttons
- Run Cycles input (1–10000) + Run button
- Run All input (1–100000) + Run All button
- Busy/idle status with spinner and error/success messages

### RegisterFile (`components/inspector/RegisterFile.jsx`)

Displays all 32 GPRs in two columns (x0–x15, x16–x31) with:
- ABI aliases (zero, ra, sp, ..., t6)
- Hex and decimal values
- x0 highlighted in amber
- Modified register highlighting (amber ring)

### MemoryViewer (`components/inspector/MemoryViewer.jsx`)

Data memory viewer with:
- Configurable start address and word count (1–256)
- Hex and decimal display
- Copy-to-clipboard button
- Refresh button

### PipelineView / PipelineStage (`components/pipeline/`)

Five-stage pipeline visualization (IF, ID, EX, MEM, WB) with:
- Per-stage signal readouts (PC, instruction, register data, ALU result, etc.)
- Opcode decoding (R-type, I-type, LOAD, STORE, BRANCH, JAL, JALR, LUI, AUIPC)
- PC select decoding (PC+4, Branch, JAL, JALR)
- Stall/Bubble/Active status badges
- Cycle counter

### WaveformViewer (`components/waveform/WaveformViewer.jsx`)

SVG-based waveform renderer with:
- Signal checkboxes (select/deselect individual signals)
- Select All / None buttons
- Time axis with quarter-point tick labels
- Horizontal scrolling for long traces
- Per-signal polylines (cyan for 1-bit, violet for multi-bit)
- Empty state: "No waveform data. Start tracing, run the simulator, then stop trace."

### VcdParser (`components/waveform/VcdParser.js`)

Client-side VCD parser that handles:
- `$timescale`, `$scope`/`$upscope`, `$var`, `$dumpvars`, `$end`
- `#<time>` time markers
- Scalar (`0`/`1`/`x`/`z`) and vector (`b<value> <id>`) changes
- Returns `{timescale, signals[], timeline[]}` where each signal has
  `{id, name, scope, width, type, value, changes[]}`

## Service Layer

### `backendApi.js`

Raw Fetch API wrappers with:
- Configurable base URL (`VITE_BACKEND_URL` env var, default `http://127.0.0.1:8000`)
- 10-second request timeout via `AbortSignal.timeout`
- JSON parsing with error handling
- HTTP error detail extraction (`data.detail`, `data.message`, `data.error`)

Functions: `fetchHealth`, `fetchStatus`, `fetchArchitecture`, `fetchSimulatorStatus`,
`startSimulator`, `stopSimulator`, `restartSimulator`, `loadProgram`, `resetSimulator`,
`stepSimulator`, `runCycles`, `runSimulator`, `fetchRegisters`, `fetchMemory`,
`fetchPipelineState`, `assembleCode`, `assembleAndLoad`, `startTrace`, `stopTrace`,
`fetchTraceStatus`, `fetchTraceFile`

### `simulationService.js`

Higher-level facade that delegates to `backendApi.js`. Provides:
- `checkBackend()` — concurrent health + status + architecture check
- All simulator control, register/memory/pipeline access
- All assembler operations
- All trace operations

### `useBackendStatus.js`

React hook that polls backend health every 4 seconds (configurable). Returns:
`{backendAlive, verilatorConnected, health, status, architecture, error, isChecking, refresh}`

## Error Handling

- Backend connection failures produce: "Cannot connect to backend at http://127.0.0.1:8000. Check that your FastAPI server is running."
- Timeout errors produce: "Backend request timed out: <endpoint>"
- Invalid JSON responses produce: "Backend returned invalid JSON for <endpoint>."
- HTTP errors extract detail from `data.detail`, `data.message`, or `data.error`
- All service methods throw on error; `App.jsx` catches and stores in `simError` /
  `assembleError` / `traceError` state for UI display
