# Cloud RISC-V Visual Simulator & Waveform Studio

A full-stack RV32I five-stage pipeline processor simulator with React frontend,
FastAPI backend, Verilator-backed SystemVerilog RTL, and client-side VCD
waveform viewing.

```
Assembly Editor → React Frontend → FastAPI Backend → JSON-lines → C++ Simulator → Verilator RTL
```

## Features

- **RV32I Assembler** — Two-pass assembler with label resolution, ABI aliases,
  immediate encoding, range validation, line-specific errors
- **Verilator Simulation** — Persistent C++ engine wrapping a real SystemVerilog
  five-stage pipeline CPU (IF, ID, EX, MEM, WB)
- **Pipeline Visualization** — Live stage cards showing PC, instructions,
  register data, ALU results, writeback enables, stalls, redirects
- **Register & Memory Inspectors** — All 32 GPRs with hex/decimal, data memory
  viewer with copy-to-clipboard
- **VCD Waveform Viewer** — Client-side VCD parser and SVG renderer with signal
  selection, time navigation, horizontal scrolling
- **Simulation Controls** — Start, stop, restart, reset, step, run-N-cycles,
  run-max-cycles with state-aware enabled/disabled buttons

## Supported RV32I Instructions

| Category | Instructions |
|----------|-------------|
| R-type | add, sub, sll, slt, sltu, xor, srl, sra, or, and |
| I-type ALU | addi, slti, sltiu, xori, ori, andi, slli, srli, srai |
| Load | lw |
| Store | sw |
| Branch | beq, bne, blt, bge, bltu, bgeu |
| Jumps | jal, jalr |
| Upper-immediate | lui, auipc |

No pseudo-instructions (`li`, `mv`, `not`, etc.) — use real RV32I mnemonics.

## Screenshots

Genuine screenshots are not included in this release. Add them to
`docs/screenshots/` when available.

## Prerequisites

| Component | Requirement |
|-----------|-------------|
| OS | Windows 10/11 |
| WSL2 | Installed with Ubuntu distribution |
| Verilator | Built at `/home/pc/riscv-verilator-build/Vriscv_sim_top` (WSL) |
| Python | 3.10+ (with fastapi, uvicorn, pydantic) |
| Node.js | 18+ (with npm) |

## Windows + WSL2 Setup

1. **Install WSL2** (if not already installed):
   ```powershell
   wsl --install
   # Restart when prompted
   ```

2. **Verify Ubuntu is available**:
   ```powershell
   wsl --list --verbose
   ```

3. **Install Verilator in WSL2** (build the simulation executable):
   ```bash
   wsl -d Ubuntu
   # Inside Ubuntu:
   sudo apt update
   sudo apt install -y verilator make g++ git cmake
   # Build the simulator (from the hardware/sim directory or your Verilator project):
   verilator --cc --exe --build -j$(nproc) \
     --top-module riscv_sim_top \
     riscv_sim_top.sv \
     main.cpp simulation_engine.cpp protocol.cpp \
     -o Vriscv_sim_top
   # The binary should be at: /home/pc/riscv-verilator-build/Vriscv_sim_top
   exit
   ```

4. **Verify the Verilator binary**:
   ```powershell
   wsl -d Ubuntu -- ls -la /home/pc/riscv-verilator-build/Vriscv_sim_top
   ```

## Python Environment Setup

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install fastapi uvicorn[standard] pydantic
```

## Node.js Setup

```powershell
cd frontend
npm install
```

## Backend Startup

```powershell
cd backend
# Activate venv if using one
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Verify: `http://127.0.0.1:8000/api/health` should return `{"status":"healthy","service":"RISC-V Backend"}`.

## Frontend Startup

```powershell
cd frontend
npm run dev
```

Verify: `http://localhost:3000` should load the application.

## Simulator Build and Startup

The Verilator simulator is built separately (see WSL2 Setup above). It is launched
automatically by the backend when you click "Start Sim" or call
`POST /api/simulator/start`.

The backend launches it via:
```bash
wsl.exe -d Ubuntu -- /home/pc/riscv-verilator-build/Vriscv_sim_top
```

## Example Assembly Program

### Phase A Regression Program

```asm
addi x1, x0, 5
addi x2, x0, 7
add  x3, x1, x2
sw   x3, 0(x0)
lw   x4, 0(x0)
addi x5, x4, 1
```

**Expected results**:
- x1 = 5
- x2 = 7
- x3 = 12
- x4 = 12
- x5 = 13
- memory[0] = 12

Additional example programs are in the `examples/` directory.

## Running Tests & Comprehensive Verification

```powershell
# 1. Master Hardware Verification Suite (All 7 Benchmarks & 130 Assertions)
python verification/scripts/run_all.py

# 2. Run Single Benchmark with VCD Waveform Tracing
python verification/scripts/run_benchmark.py 01_branches --trace

# 3. Backend pytest suite (20 tests)
cd backend
python -m pytest tests/ -v

# 4. Standalone assembler test
cd backend
python test_assembler_api.py

# 5. Standalone simulator test
cd backend
python test_simulator_api.py

# 6. Edge case stress tests (14 tests)
cd backend
python tests/test_edge_cases.py

# 7. Trace test via WSL2
wsl -d Ubuntu -- python3 /mnt/d/RISC-V_Project/backend/test_trace.py

# 8. Frontend production build
cd frontend
npm run build
```

## Troubleshooting

| Problem | Likely Cause | Fix |
|---------|-------------|-----|
| "Cannot connect to backend" | FastAPI not running | Start uvicorn on port 8000 |
| "Simulator did not respond" | WSL2/Verilator not available | Verify `wsl --list --verbose` shows Ubuntu; check binary path |
| "Program file not found" | .hex file not in hardware/sim/ | Assemble-and-load first, or check file exists |
| "cycle count must be positive" | cycles=0 in run-cycles | Use cycles >= 1 |
| "address must be word-aligned" | memory address not multiple of 4 | Use addresses 0, 4, 8, ... |
| Frontend build fails | Missing node_modules | Run `npm install` in frontend/ |

## Documentation

| Document | Path |
|----------|------|
| Project Overview | `docs/PROJECT_OVERVIEW.md` |
| System Architecture | `docs/ARCHITECTURE.md` |
| CPU Architecture | `docs/CPU_ARCHITECTURE.md` |
| RTL Module Reference | `docs/RTL_MODULES.md` |
| Assembler Reference | `docs/ASSEMBLER.md` |
| Simulation Engine | `docs/SIMULATION_ENGINE.md` |
| Frontend Reference | `docs/FRONTEND.md` |
| Verification | `docs/VERIFICATION.md` |
| Project Limitations | `docs/PROJECT_LIMITATIONS.md` |
| Demo Guide | `docs/DEMO_GUIDE.md` |

## Known Limitations

- WSL2 required for Verilator backend
- No pseudo-instruction support
- No M/A/F/D/C extensions
- Data memory limited to 4 KiB (1024 words)
- No halt instruction (`run` executes max_cycles)
- No browser automation tests (visual verification manual)
- Hardcoded paths assume `D:\RISC-V_Project` on Windows

See `docs/PROJECT_LIMITATIONS.md` for complete details.
