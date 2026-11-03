# Demo Guide

This guide explains how to demonstrate the Cloud RISC-V Visual Simulator &
Waveform Studio from startup through waveform inspection.

## Prerequisites

Before starting, ensure:
- WSL2 with Ubuntu is installed and available (`wsl --list --verbose`)
- Verilator is built at `/home/pc/riscv-verilator-build/Vriscv_sim_top` (WSL)
- Python dependencies installed (`fastapi`, `uvicorn`, `pydantic`)
- Node.js dependencies installed (`npm install` in `frontend/`)

## Step 1 — Start the Backend

```powershell
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Verify: Open `http://127.0.0.1:8000/api/health` in a browser or curl it.
Expected: `{"status":"healthy","service":"RISC-V Backend"}`

## Step 2 — Start the Frontend

```powershell
cd frontend
npm run dev
```

Verify: Open `http://localhost:3000` in a browser. The application should render
with the Assembly Editor, Pipeline, Processor Inspector, and Waveform Viewer panels.

## Step 3 — Start the Simulator

In the frontend UI:
1. Click **"Start Sim"** in the Pipeline panel.
2. The TopBar should show "Verilator: running" with an emerald dot.
3. The StatusBar should show "Simulator running".

## Step 4 — Load the Phase A Program

The editor is pre-loaded with the Phase A program:

```asm
addi x1, x0, 5
addi x2, x0, 7
add  x3, x1, x2
sw   x3, 0(x0)
lw   x4, 0(x0)
addi x5, x4, 1
```

Click **"Assemble and Load"**.
- The Machine Code panel should show 6 instructions with hex values.
- The StatusBar should show "Program: assembled.hex".

## Step 5 — Reset the Processor

Click **"Reset"** in the Pipeline panel.
- All registers should read 0.
- The cycle count should be 0.

## Step 6 — Execute the Program

Click **"Step"** 6 times (or set "Run Cycles" to 20 and click "Run").
After execution:

| Register | Expected | Verify in Register inspector |
|----------|----------|------------------------------|
| x1 | 5 | x1 should show 0x00000005 / 5 |
| x2 | 7 | x2 should show 0x00000007 / 7 |
| x3 | 12 | x3 should show 0x0000000C / 12 |
| x4 | 12 | x4 should show 0x0000000C / 12 |
| x5 | 13 | x5 should show 0x0000000D / 13 |
| x0 | 0 | x0 should always show 0 (highlighted in amber) |

Verify memory: Set Memory Address to 0, Words to 4, click "Load".
- memory[0] should show 12.

## Step 7 — Generate and View Waveforms

1. Click **"Start Trace"** in the Waveform panel.
2. Click **"Run"** (10 cycles).
3. Click **"Stop Trace"**.
4. The Waveform Viewer should populate with signal traces.

**Suggested signals to inspect** (select via checkboxes):
- `debug_fetch_pc` — Program counter over time
- `debug_wb_writeback_data` — Writeback data values
- `debug_wb_writeback_rd` — Which register is being written
- `debug_wb_writeback_enable` — When writes occur
- `debug_control_stall` — When pipeline stalls (load-use hazard)
- `debug_redirect` — When branches redirect
- `debug_pc_sel` — PC source selection

You should see transitions corresponding to the execution of each instruction.
The load-use hazard between `lw x4, 0(x0)` and `addi x5, x4, 1` should produce
a visible stall cycle.

## Step 8 — Try Additional Examples

Load any program from `examples/` into the editor and repeat Steps 4–7:

| File | What it demonstrates |
|------|---------------------|
| `examples/aritmetic.asm` | R-type ALU operations (add, sub, xor, or, and) |
| `examples/branching.asm` | Taken and not-taken branches |
| `examples/hazard_demo.asm` | Load-use hazard (one-cycle stall) |
| `examples/load_store.asm` | sw/lw to memory |

## Manual Browser Acceptance Checklist

If performing manual browser verification, confirm:

- [ ] Application renders at `http://localhost:3000` (HTTP 200)
- [ ] TopBar shows backend online, Verilator status correct
- [ ] Assembly editor accepts text input
- [ ] "Assemble" produces machine code table
- [ ] "Assemble and Load" loads program into simulator
- [ ] "Start Sim" connects to Verilator
- [ ] "Reset" zeroes all registers
- [ ] "Step" advances one cycle and updates pipeline/registers
- [ ] "Run N cycles" advances N cycles
- [ ] Register inspector shows x1=5, x2=7, x3=12, x4=12, x5=13 after Phase A
- [ ] Memory inspector shows memory[0]=12
- [ ] Pipeline stage cards show correct stage data
- [ ] "Start Trace" enables tracing
- [ ] "Stop Trace" retrieves and displays VCD waveforms
- [ ] Waveform signals show transitions
- [ ] No JavaScript errors in browser console
- [ ] Backend API returns valid JSON for all endpoints

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Backend not responding | Ensure uvicorn is running on port 8000 |
| Simulator won't start | Verify WSL2 Ubuntu and Verilator binary path |
| No waveform data | Start trace BEFORE running cycles, then stop trace |
| Registers all zero | Reset the simulator after loading program |
| Branch not working | Verify branch target offset is even and in range |
| Build artifacts in repo | Add to .gitignore (see E7.4) |
