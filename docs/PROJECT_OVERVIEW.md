# Cloud RISC-V Visual Simulator & Waveform Studio

## Project Purpose

The Cloud RISC-V Visual Simulator & Waveform Studio is a full-stack engineering tool for
visualizing a five-stage RV32I RISC-V processor pipeline in real time. It combines a
React-based frontend with a FastAPI backend that drives a persistent Verilator-simulated
SystemVerilog RTL model through a JSON-lines command protocol. The goal is to provide an
educational and debugging environment where assembly programs can be assembled, loaded,
executed cycle-by-cycle, and inspected through register views, memory views, pipeline stage
visualizations, and actual VCD waveforms.

## Main Features

- **RV32I Assembler**: Two-pass assembler with label resolution, ABI register aliases,
  immediate encoding, range validation, and line-specific error reporting.
- **Verilator-Backed Simulation**: Persistent C++ simulation engine wrapping a real
  SystemVerilog five-stage pipeline CPU, driven through JSON-lines stdin/stdout.
- **Five-Stage Pipeline Visualization**: IF, ID, EX, MEM, WB stage cards showing live
  RTL debug outputs (PC, instructions, register data, ALU results, writeback enables).
- **Register & Memory Inspectors**: All 32 GPRs (x0–x31) with ABI aliases, hex and decimal
  values, x0 hardwired to zero; data memory viewer with configurable address/word count.
- **VCD Waveform Viewer**: Client-side VCD parser and SVG-based waveform renderer with
  signal selection, time navigation, horizontal scrolling, and empty/loading states.
- **Simulation Controls**: Start, stop, restart, reset, step, run-N-cycles, run-max-cycles
  with enabled/disabled state management and error feedback.
- **Status Monitoring**: Backend health polling, Verilator connection status, cycle count,
  stall/redirect indicators.

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

**Not supported**: No pseudo-instructions (li, mv, not, etc.), no CSR instructions,
no M-extension (mul/div), no A-extension (atomics), no F/D-extensions (floating point),
no compressed (C) extension.

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, lucide-react (icons), Tailwind CSS (via PostCSS) |
| Backend | FastAPI, Pydantic v2, Uvicorn |
| Simulation | Verilator (SystemVerilog RTL), C++17, nlohmann/json |
| IPC | JSON-lines over subprocess stdin/stdout via wsl.exe (Windows ↔ WSL2 Ubuntu) |
| Waveform | Verilator VCD output, client-side VCD parser, SVG renderer |

## Major Design Decisions

1. **Persistent simulator process**: The Verilator engine runs as one long-lived C++
   subprocess. Program loading reconstructs the Verilator model (because `$readmemh`
   initial blocks only execute at construction time). This avoids process startup
   overhead on every command.

2. **JSON-lines protocol**: One JSON object per line on stdin (request) and stdout
   (response). Diagnostics go to stderr. A threading lock in the backend prevents
   concurrent FastAPI requests from interleaving commands on the same stream.

3. **WSL2 bridge**: The backend runs on Windows and launches the Linux Verilator
   executable via `wsl.exe -d Ubuntu -- <exe>`. Program .hex files are written to
   the WSL filesystem; VCD files are read back from WSL.

4. **No browser-side simulation**: All processor execution happens in the RTL model.
   The frontend only displays data returned by the backend.

5. **Contenteditable assembly editor**: A lightweight, dependency-free editor using
   `contenteditable` with manual line numbers. Avoids Monaco/CodeMirror to keep
   the frontend bundle small (~170 KB gzipped).

## Current Limitations

- No browser automation available for visual verification (E6.5/E7.5 note).
- Branch prediction is "predict not taken"; branches are resolved in the EX stage,
  causing a flush on taken branches.
- No halt instruction; `run` executes `max_cycles` and returns "max_cycles_reached".
- Data memory is bounded (1024 words = 4 KiB).
- WSL2 dependency: the backend requires WSL2 Ubuntu to launch the Verilator binary.
- No pseudo-instruction support (assembler expects real mnemonics only).
- Verilator binary path is hardcoded (`/home/pc/riscv-verilator-build/Vriscv_sim_top`).

## Complete Execution Workflow

```
1. User enters RV32I assembly in the frontend editor.
2. Frontend POSTs source to /api/assembler/assemble (or assemble-and-load).
3. Backend assembles using the Python assembler (two-pass, label resolution).
4. If assemble-and-load, backend writes .hex to hardware/sim/ via WSL, then
   sends load_program command to the persistent simulator.
5. Frontend sends start/stop/reset/step/run-cycles commands to the simulator.
6. Simulator executes cycles in the Verilator RTL model, returns pipeline state
   (fetch PC, IF/ID regs, ID regs, EX regs, MEM regs, WB regs, stall, redirect).
7. Frontend renders register values, memory contents, pipeline stage cards.
8. For waveforms: frontend sends start_trace, runs cycles, stop_trace, then
   GET /api/trace/file to retrieve VCD content, parses it client-side, renders SVG.
```
