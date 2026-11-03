# System Architecture

## Overview

The Cloud RISC-V Visual Simulator follows a layered architecture where each layer has
a well-defined responsibility. Communication between layers uses explicit interfaces:
HTTP/JSON between frontend and backend, JSON-lines between backend and simulator, and
internal function calls within the simulator and RTL.

```
┌──────────────────────────────────────────────────────────────────┐
│                    Browser (React + Vite)                        │
│  ┌───────────────┐  ┌─────────────┐  ┌───────────────────────┐   │
│  │  App.jsx      │  │ Waveform    │  │ Register / Memory /   │   │
│  │ (orchestrator)│  │ Viewer      │  │ Pipeline Inspector    │   │
│  └──────┬────────┘  └──────┬──────┘  └───────────┬───────────┘   │
│         │                  │                     │               │
│         └──────────────────┴─────────────────────┘               │
│                     simulationService.js                         │
│                     (Fetch API → HTTP/JSON)                      │
└──────────────────────────────────────────────────────────────────┘
                                      │
                                      │ HTTP/JSON (REST)
                                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                  FastAPI Backend (Windows)                      │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────────┐   │
│  │   main.py   │  │  assembler.py│  │   schemas.py          │   │
│  │ (endpoints) │  │ (Python ASM) │  │ (Pydantic models)     │   │
│  └──────┬──────┘  └──────┬───────┘  └───────────┬───────────┘   │
│         │                │                      │               │
│         └────────────────┴──────────────────────┘               │
│                   simulator_manager.py                          │
│              (SimulatorManager class)                           │
│         │  JSON-lines over subprocess stdin/stdout              │
└─────────────────────────────────────────────────────────────────┘
                                      │
                                      │ wsl.exe → stdin/stdout
                                      ▼
┌─────────────────────────────────────────────────────────────────┐
│              Persistent C++ Simulator (WSL2 Ubuntu)             │
│  ┌─────────────┐  ┌─────────────┐  ┌───────────────────────┐    │
│  │ main.cpp    │  │ protocol.hpp│  │ simulation_engine.*   │    │
│  │ (command    │  │ (JSON-lines │  │ (Verilator wrapper)   │    │
│  │  dispatch)  │  │  cpp/hpp)   │  │                       │    │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬───────────┘    │
│         │                │                     │                │
│         └────────────────┴─────────────────────┘                │
│                 │  Verilator C++ API                            │
│                 ▼                                               │
┌─────────────────────────────────────────────────────────────────┐
│              SystemVerilog RTL (Verilated)                      │
│  riscv_sim_top.sv → pipeline_cpu.sv (IF→ID→EX→MEM→WB)           │
│  Debug outputs: fetch_pc, if_id_*, id_*, ex_*, mem_*, wb_*      │
│  Control: clk, rst_n, +program=plusarg                          │
└─────────────────────────────────────────────────────────────────┘
```

## Layer Responsibilities

### 1. Assembly Editor (Frontend)

- **File**: `frontend/src/App.jsx`, `frontend/src/components/editor/*`
- **Responsibility**: Accept RV32I assembly source from the user, provide line numbers,
  example loading, clearing, and error line highlighting.
- **Communication**: Local state only; sends assembled source to backend via
  `simulationService.assemble()` / `simulationService.assembleAndLoad()`.

### 2. React Frontend

- **Files**: `frontend/src/*`
- **Responsibility**: Orchestrate the user interface. Maintains source, assembly results,
  simulator status, pipeline state, registers, memory, trace state, and parsed VCD data.
  Polls backend health every 4 seconds via `useBackendStatus`.
- **Communication**: Fetch API calls to `http://127.0.0.1:8000/api/*`.

### 3. FastAPI Backend

- **Files**: `backend/app/main.py`, `backend/app/schemas.py`, `backend/app/simulator.py`,
  `backend/app/assembler.py`
- **Responsibility**: Expose REST endpoints for simulator control, assembler, and trace
  operations. Validate request bodies with Pydantic. Manage the `SimulatorManager`
  singleton that owns the persistent C++ process.
- **Communication**: HTTP/JSON to frontend; JSON-lines to simulator via `wsl.exe`.

### 4. C++ JSON-lines Interface

- **Files**: `hardware/sim/protocol.hpp`, `hardware/sim/protocol.cpp`,
  `hardware/sim/main.cpp`
- **Responsibility**: The `main()` function creates a `SimulationEngine`, then enters a
  command loop: read one JSON line from stdin, dispatch to the appropriate engine method,
  write one JSON response line to stdout. Diagnostics go to stderr.
- **Protocol**: `{"command": "...", ...}` → `{"status": "ok|error", "command": "...", "data": {...}}`

### 5. Simulation Manager (Backend)

- **File**: `backend/app/simulator.py`
- **Responsibility**: Start/stop/restart the Verilator subprocess via `wsl.exe`. Maintain
  a `threading.Lock` so concurrent FastAPI requests cannot interleave on stdin/stdout.
  Drain stderr in a background thread to prevent pipe deadlock. Send JSON commands and
  parse JSON responses.
- **Process command**: `wsl.exe -d Ubuntu -- /home/pc/riscv-verilator-build/Vriscv_sim_top`

### 6. Simulation Engine (C++)

- **Files**: `hardware/sim/simulation_engine.hpp`, `hardware/sim/simulation_engine.cpp`
- **Responsibility**: Wrap the Verilator-generated `Vriscv_sim_top` model. Manage clock,
  reset, program loading (model reconstruction), tracing (VCD), and all state inspection
  (registers, memory, pipeline state).
- **Key methods**: `loadProgram()`, `reset()`, `step()`, `runCycles()`, `run()`,
  `readRegisters()`, `readMemory()`, `getPipelineState()`, `startTrace()`, `stopTrace()`.

### 7. Verilator / SystemVerilog RTL

- **Files**: `hardware/sim/riscv_sim_top.sv`, `pipeline_cpu.sv` (and other stage modules
  in the Verilator build directory)
- **Responsibility**: The actual RV32I five-stage pipeline CPU. Exposes debug outputs for
  every pipeline stage plus hazard/control signals. Reads program from `+program=` plusarg.
- **Communication**: Verilator C++ API (`eval()`, `clk`, `rst_n`, `trace()`).

## Communication Protocols

### Frontend ↔ Backend: HTTP/JSON

| Endpoint | Method | Request Body | Response |
|----------|--------|--------------|----------|
| `/api/health` | GET | none | `{"status": "healthy", "service": "RISC-V Backend"}` |
| `/api/status` | GET | none | `SimulatorStatusResponse` |
| `/api/architecture` | GET | none | `ArchitectureResponse` |
| `/api/simulator/start` | POST | none | `{"connected": bool, "engine": str, "message": str}` |
| `/api/simulator/stop` | POST | none | `{"connected": false, ...}` |
| `/api/simulator/restart` | POST | none | `{"connected": bool, ...}` |
| `/api/simulator/load` | POST | `{"program_file": str}` | `LoadProgramResponse` |
| `/api/simulator/reset` | POST | none | `ResetResponse` |
| `/api/simulator/step` | POST | none | `StepResponse` |
| `/api/simulator/run-cycles` | POST | `{"cycles": int}` | `RunCyclesResponse` |
| `/api/simulator/run` | POST | `{"max_cycles": int}` | `RunResponse` |
| `/api/simulator/registers` | GET | none | `ReadRegistersResponse` |
| `/api/simulator/memory` | POST | `{"address": int, "words": int}` | `ReadMemoryResponse` |
| `/api/simulator/pipeline` | GET | none | `PipelineStateResponse` |
| `/api/assembler/assemble` | POST | `{"source": str}` | `AssembleResponse` |
| `/api/assembler/assemble-and-load` | POST | `{"source": str, "program_file": str}` | `AssembleAndLoadResponse` |
| `/api/trace/start` | POST | `{"filename": str}` | `TraceResponse` |
| `/api/trace/stop` | POST | none | `TraceResponse` |
| `/api/trace/status` | GET | none | `TraceStatusResponse` |
| `/api/trace/file?filename=...` | GET | query param | `VcdResponse` |

### Backend ↔ Simulator: JSON-lines

One JSON object per line on stdin/stdout:

**Request**: `{"command": "step"}`
**Response**: `{"status": "ok", "command": "step", "data": {"cycles": 5, "pipeline_state": {...}}}`

**Request**: `{"command": "load_program", "program_file": "/mnt/d/.../program.hex"}`
**Response**: `{"status": "ok", "command": "load_program", "data": {"program_file": "...", "cycles": 0, "program_loaded": true}}`

### Simulator ↔ RTL: Verilator C++ API

- Clock: `top_->clk = 0/1` then `top_->eval()`
- Reset: `top_->rst_n = 0/1`
- Program: `+program=<path>` plusarg at construction
- Debug reads: `top_->debug_fetch_pc`, `top_->debug_id_rs1_data`, etc.
- Trace: `top_->trace(trace_.get(), 99)`, `trace_->dump(time)`, `trace_->open(filename)`

## Data Flow: Simulation Results Return to Frontend

1. **User action** (e.g. click "Step") → `App.jsx` calls `simulationService.step()`
2. `simulationService.step()` → `stepSimulator()` → `fetch()` POST to `/api/simulator/step`
3. FastAPI endpoint `sim_step()` → `simulator_manager.step()`
4. `SimulatorManager.step()` → `self._send_raw({"command": "step"})` → write JSON line to
   `wsl.exe` subprocess stdin, read JSON line from stdout
5. C++ `main.cpp` reads `"step"` → calls `engine->step()` → `SimulationEngine::step()`
6. `SimulationEngine::step()` → `clockCycle()` (drive clk, eval, dump) → reads
   `top_->debug_*` outputs → builds JSON response
7. Response travels back: C++ stdout → `simulator_manager` → FastAPI → HTTP response →
   frontend `simulationService.step()` → `App.jsx` state update → React re-render

## Process Management

- **Single persistent process**: One `SimulationEngine` instance owns one Verilator
  subprocess. It stays alive across HTTP requests.
- **Thread safety**: `threading.Lock` in `SimulatorManager` serializes all
  stdin/stdout operations.
- **Stderr draining**: Background thread reads stderr to prevent pipe buffer fill.
- **Clean shutdown**: Sends `{"command": "quit"}` then waits; falls back to
  `terminate()` / `kill()`.
- **Orphan prevention**: `simulator_manager` is a module-level singleton; backend
  shutdown does not explicitly kill the subprocess, but `stop()` sends quit first.

## Hardware/Software Boundaries

| Boundary | What crosses | Mechanism |
|----------|-------------|-----------|
| Browser → Backend | HTTP requests/responses | Fetch API, JSON |
| Backend → Simulator | JSON-lines commands | `wsl.exe` subprocess pipes |
| Simulator → RTL | Clock edges, reset, plusarg | Verilator C++ API |
| RTL → Simulator | Debug signal values | Verilator public member access |
| Simulator → Backend | JSON-lines responses | stdout pipe |
