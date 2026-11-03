# Cloud RISC-V Visual Simulator & Waveform Studio

A full-stack RV32I five-stage pipeline processor simulator with React frontend,
FastAPI backend, Verilator-backed SystemVerilog RTL, and client-side VCD
waveform viewing.

```
Assembly Editor → React Frontend → FastAPI Backend → JSON-lines → C++ Simulator → Verilator RTL
```

---

## 🚀 Live Deployments

The complete application is publicly deployed and available for interactive simulation:

| Component | Platform | URL | Description |
|-----------|----------|-----|-------------|
| **Live Frontend** | Vercel | [https://cloud-risc-v-visual-simulator.vercel.app/](https://cloud-risc-v-visual-simulator.vercel.app/) | Interactive React UI, 3D pipeline view, assembly editor, and waveform studio |
| **Backend API** | Render | [https://cloud-riscv-backend.onrender.com/](https://cloud-riscv-backend.onrender.com/) | FastAPI service managing persistent native Verilator RTL simulation |
| **API Documentation** | Render | [https://cloud-riscv-backend.onrender.com/docs](https://cloud-riscv-backend.onrender.com/docs) | Interactive Swagger UI for all simulation, assembler, and tracing endpoints |

> **Architecture Note:** The frontend is hosted as a single-page application on Vercel. The backend is deployed on Render as a Docker container running native Linux, where it automatically compiles the SystemVerilog RTL with Verilator and launches a persistent C++ simulation engine managed via FastAPI's lifespan events.

---

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

---

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

*No pseudo-instructions (`li`, `mv`, `not`, etc.) — use real RV32I mnemonics.*

---

## Screenshots

Genuine screenshots are not included in this release. Add them to
`docs/screenshots/` when available.

---

## Prerequisites

| Component | Requirement | Purpose |
|-----------|-------------|---------|
| **OS** | Windows 10/11 (with WSL2) or Linux (Ubuntu 22.04+) | Host environment |
| **WSL2** | Ubuntu distribution (on Windows) | Required for Verilator C++ simulation on Windows |
| **Verilator** | 4.200+ (5.0+ recommended) | SystemVerilog compiler and simulator generator |
| **C++ Toolchain** | g++ / clang++, make, cmake | Compiling Verilator C++ harness |
| **Python** | 3.10+ (with pip) | FastAPI backend service and verification suite |
| **Node.js** | 18+ (with npm) | React + Vite frontend development |

---

## 🛠️ Local Setup and Startup Guide

> ⚠️ **CRITICAL STARTUP SEQUENCE:**
> **Always start the backend FIRST, followed by the frontend.**  
> The React frontend attempts to establish a connection to the FastAPI simulator engine immediately upon mounting. The backend must be live and the Verilator process initialized before starting the frontend.

```
┌──────────────────────────────────────────────────────────┐
│  Step 1: Start Backend (FastAPI + Verilator Engine)      │
│          → Waits for Verilator initialization on :8000   │
└────────────────────────────┬─────────────────────────────┘
                             │ (Backend Healthy & Connected)
                             ▼
┌──────────────────────────────────────────────────────────┐
│  Step 2: Start Frontend (Vite Dev Server)                │
│          → Connects to Backend Proxy on :3000            │
└──────────────────────────────────────────────────────────┘
```

---

### Step A — Start the Backend (Terminal 1)

The backend runs as a FastAPI service that communicates with the compiled Verilator simulation executable over stdin/stdout using a JSON-lines protocol.

#### 1. Open a terminal in the project root
```powershell
# Windows PowerShell
cd D:\RISC-V_Project
```
*(On Linux/macOS: `cd /path/to/RISC-V_Project`)*

#### 2. Set up the Python virtual environment and install dependencies
```powershell
# Create virtual environment inside backend directory
python -m venv backend\.venv

# Activate the virtual environment
# Windows PowerShell:
.\backend\.venv\Scripts\Activate.ps1
# Linux / macOS / WSL:
# source backend/.venv/bin/activate

# Install backend dependencies
pip install -r backend\requirements.txt
```

#### 3. Build the Verilator RTL simulation executable
The backend requires the compiled binary `Vriscv_sim_top`.

* **On Windows (using WSL2 Ubuntu):**
  ```powershell
  # Launch WSL2 Ubuntu and build the executable
  wsl -d Ubuntu
  ```
  Inside the WSL shell:
  ```bash
  sudo apt update && sudo apt install -y verilator make g++ git cmake
  cd /mnt/d/RISC-V_Project/hardware/sim
  make
  # This builds: /mnt/d/RISC-V_Project/build/Vriscv_sim_top
  # (or verify your default build at /home/pc/riscv-verilator-build/Vriscv_sim_top)
  exit
  ```

* **On Native Linux:**
  ```bash
  cd hardware/sim
  make
  ```

#### 4. Configure Environment Variables (Optional)
The backend auto-detects Windows vs. Linux. You can customize paths if needed:
```powershell
# Default Windows + WSL configuration:
$env:USE_WSL = "1"
$env:WSL_DISTRO = "Ubuntu"
$env:SIM_EXE = "/home/pc/riscv-verilator-build/Vriscv_sim_top"   # Path inside WSL
$env:PORT = "8000"

# For Native Linux (Docker / local Linux host):
# export USE_WSL=0
# export SIM_EXE=/path/to/build/Vriscv_sim_top
# export PORT=8000
```

#### 5. Start the FastAPI backend
Run Uvicorn from the project root:
```powershell
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
*(Alternatively, from inside the `backend` directory: `cd backend; python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload`)*

#### 6. Verify Backend & Simulator Health
Before starting the frontend, verify the backend endpoints in your browser or curl:

- **Health check:** [`http://localhost:8000/api/health`](http://localhost:8000/api/health)  
  Expected response: `{"status":"healthy","service":"RISC-V Backend"}`
- **Simulator status:** [`http://localhost:8000/api/simulator/status`](http://localhost:8000/api/simulator/status)  
  Expected response: `{"connected": true, "engine": "Verilator", "model_initialized": true, "error": false}`
- **Interactive Swagger Docs:** [`http://localhost:8000/docs`](http://localhost:8000/docs)

> **Important:** Ensure `connected: true` and `model_initialized: true` in `/api/simulator/status`. FastAPI automatically launches the persistent Verilator engine on startup via lifespan events.

---

### Step B — Start the Frontend (Terminal 2)

Once the backend is confirmed running and reporting `connected: true`:

#### 1. Open a second terminal window
```powershell
cd D:\RISC-V_Project\frontend
```

#### 2. Install frontend dependencies
```powershell
npm install
```

#### 3. Configure the Backend URL
By default, the Vite dev server (`vite.config.js`) proxies all `/api/*` requests directly to `http://127.0.0.1:8000`.

To point directly to your local backend (or test against the cloud backend), you can create a `.env.local` file inside `frontend/`:
```env
# frontend/.env.local
VITE_BACKEND_URL=http://localhost:8000
```

#### 4. Start the Vite development server
```powershell
npm run dev
```

#### 5. Access the Frontend
Open your browser and navigate to:
```
http://localhost:3000
```
The UI will connect to the local FastAPI backend, query simulator status, and display the active RV32I 5-stage pipeline interface.

---

### Step C — Running the Complete Application (End-to-End Workflow)

Follow this end-to-end sequence for a complete local simulation run:

1. **Start Backend:** In Terminal 1, run `python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000`.
2. **Check Status:** Ensure `http://localhost:8000/api/simulator/status` reports `connected: true`.
3. **Start Frontend:** In Terminal 2, run `cd frontend && npm run dev`.
4. **Open Application:** Open [`http://localhost:3000`](http://localhost:3000) in your web browser.
5. **Write or Load Assembly:** In the **Assembly Source** editor, enter RV32I instructions or click **Example** to load the reference benchmark.
6. **Assemble & Load:** Click **Assemble & Load**. The two-pass assembler validates syntax, resolves labels, generates machine code, and loads the program into the hardware simulation memory.
7. **Control Execution:**
   - **Step:** Execute exactly 1 clock cycle on the real SystemVerilog RTL processor.
   - **Run:** Continuously advance the simulation at the selected frequency (0.5 Hz – 10 Hz).
   - **Reset:** Flush the pipeline and reset PC and register state back to cycle 0.
8. **Inspect Hardware State:**
   - **5-Stage Pipeline Cards:** Live status for **IF** (Fetch), **ID** (Decode), **EX** (Execute), **MEM** (Memory), and **WB** (Writeback) stages with bubble, stall, and flush indicators.
   - **Register File:** All 32 physical registers (x0–x31) with live hex and decimal values.
   - **Data Memory:** 4 KiB memory viewer showing store and load interactions.
   - **Waveform Studio:** VCD tracing tab showing hardware signal transitions over time.

---

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
- `x1` = 5
- `x2` = 7
- `x3` = 12
- `x4` = 12
- `x5` = 13
- `memory[0]` = 12

*Additional example programs are located in the `examples/` directory.*

---

## Running Tests & Comprehensive Verification

```powershell
# 1. Master Hardware Verification Suite (All 7 Benchmarks & 130 Assertions)
python verification/scripts/run_all.py

# 2. FastAPI Lifespan, Process Lifecycle & Concurrency Suite (20 Tests)
python verification/scripts/test_lifespan_integration.py

# 3. Backend Deployment Regression Suite (Native Linux Mode, 20 Tests)
python verification/scripts/test_deployment_backend.py

# 4. Native Verilator JSON-Lines Protocol Smoke Test
python verification/scripts/smoke_test_verilator.py

# 5. Run Single Benchmark with VCD Waveform Tracing
python verification/scripts/run_benchmark.py 01_branches --trace

# 6. Backend pytest suite
cd backend
python -m pytest tests/ -v

# 7. Frontend production build
cd frontend
npm run build
```

---

## Troubleshooting

| Problem | Likely Cause | Fix |
|---------|-------------|-----|
| **"Cannot connect to backend"** | FastAPI server not running on port 8000 | Ensure Terminal 1 is running `uvicorn backend.app.main:app --port 8000` |
| **"Simulator process is not running"** | Binary missing or WSL2 unavailable | Verify `wsl -d Ubuntu -- ls -la /home/pc/riscv-verilator-build/Vriscv_sim_top` |
| **"CORS error in browser console"** | Backend rejecting frontend origin | Backend allows `http://localhost:3000` by default; set `CORS_ORIGINS` if using custom host |
| **"Program file not found"** | `.hex` file not in simulation directory | Use the **Assemble & Load** button to write and load the hex file |
| **"Address must be word-aligned"** | Memory address not multiple of 4 | Ensure load/store addresses are multiples of 4 (0x0, 0x4, 0x8, ...) |
| **Frontend build fails** | Missing or out-of-date `node_modules` | Run `npm install` inside the `frontend/` directory |

---

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

---

## Known Limitations

- WSL2 required for Verilator backend when running locally on Windows
- No pseudo-instruction support (`li`, `mv`, `la` must be written with primitive RV32I mnemonics)
- Base RV32I only (no M/A/F/D/C extensions in current release)
- Data memory limited to 4 KiB (1024 words)
- No halt instruction (`run` executes up to max cycles)
- Hardcoded default WSL paths assume `D:\RISC-V_Project` on Windows host

See `docs/PROJECT_LIMITATIONS.md` for complete architectural details.
