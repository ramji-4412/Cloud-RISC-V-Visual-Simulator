# Project Limitations

This document clearly documents the actual limitations of the Cloud RISC-V
Visual Simulator & Waveform Studio. Nothing here describes functionality that
is planned but not implemented.

## Instruction Set Limitations

### Not Implemented

The following RV32I base instructions are **not** supported by the assembler:

- None — all 47 RV32I base integer instructions are supported (add, sub, sll,
  slt, sltu, xor, srl, sra, or, and, addi, slti, sltiu, xori, ori, andi,
  slli, srli, srai, lw, sw, beq, bne, blt, bge, bltu, bgeu, jal, jalr, lui,
  auipc).

### Pseudo-Instructions

**Not supported**. The assembler expects real RV32I mnemonics only. The
following common pseudo-instructions will produce "Unknown instruction" errors:

- `li` (load immediate) — use `addi rd, x0, imm` instead
- `mv` (move) — use `add rd, rs, x0` instead
- `not` — use `xori rd, rs, -1` instead
- `neg` — use `sub rd, x0, rs` instead
- `bgt`, `ble`, `bgtu`, `bleu` — use the appropriate branch with swapped operands

### Extensions Not Supported

- **M-extension**: No multiply/divide instructions (`mul`, `mulh`, `div`, `divu`,
  `rem`, `remu`, etc.)
- **A-extension**: No atomic instructions (`lr.w`, `sc.w`, `amoswap.w`, etc.)
- **F/D-extensions**: No floating-point instructions
- **C-extension**: No compressed instructions (all instructions are 32-bit)

## Memory Model Limitations

### Data Memory Size

Data memory is bounded to **1024 words (4 KiB)**. The C++ `readMemory()` method
rejects start addresses >= 1024 words and clamps reads that would exceed the
boundary. Addresses must be word-aligned (multiple of 4).

### Instruction Memory Size

Instruction memory is parameterized with `IMEM_ADDR_WIDTH = 10`, giving
1024 instruction words (4 KiB). Programs larger than this will overflow.

### No Memory Protection

There is no memory protection, MMU, or privilege modes. All memory is
accessible from any instruction.

## Branch Prediction Behavior

- **Policy**: Predict not taken
- **Resolution**: Branches are resolved in the EX stage
- **Taken branch penalty**: When a branch is taken, `debug_redirect` asserts,
  the IF/ID register is flushed, and the PC is redirected to the target.
  This creates a bubble in the pipeline (effectively a 1-cycle penalty).
- **Not-taken branch**: No penalty; PC+4 continues normally.

There is no branch history table, branch target buffer, or dynamic prediction.

## Pipeline Limitations

### No Halt Instruction

There is no `ebreak`, `ecall`, or halt instruction in the supported subset.
The `run` command executes `max_cycles` cycles and returns
`"max_cycles_reached"` as the termination reason. Programs that loop forever
will run until `max_cycles` is reached.

### Load-Use Hazard

A load-use hazard (dependent instruction immediately after a load) causes a
one-cycle pipeline stall. The hazard detection unit stalls IF/ID and inserts
a bubble into ID/EX. This is correct behavior but limits throughput for
load-dependent code.

### Single Issue

The pipeline issues one instruction per cycle (when not stalled). No
superscalar or out-of-order execution.

## Platform Dependencies

### WSL2 Required

The FastAPI backend runs on Windows but launches the Verilator executable
via `wsl.exe -d Ubuntu -- <exe>`. The following are required:

- Windows 10/11 with WSL2 installed
- Ubuntu distribution available in WSL (`wsl --list --verbose` should show Ubuntu)
- Verilator built and installed at `/home/pc/riscv-verilator-build/Vriscv_sim_top`
  inside the WSL Ubuntu filesystem

The backend will fail to start the simulator if WSL2 is not available or the
binary path is incorrect.

### Hardcoded Paths

The following paths are hardcoded in the source:

| File | Path | Purpose |
|------|------|---------|
| `backend/app/simulator.py` | `/home/pc/riscv-verilator-build/Vriscv_sim_top` | Verilator executable (WSL) |
| `backend/app/simulator.py` | `/mnt/d/RISC-V_Project/hardware/sim` | Sim working directory (WSL mount) |
| `backend/app/main.py` | `/mnt/d/RISC-V_Project/hardware/sim` | Assembler output directory |

These paths assume the project is at `D:\RISC-V_Project` on Windows and
mounted at `/mnt/d/RISC-V_Project` in WSL2.

## Frontend Limitations

### No Browser Automation Verification

Visual behavior of the frontend (waveform rendering, UI layout, button states)
has **not** been verified with browser automation. No Playwright, Puppeteer,
or Selenium tests exist. Manual browser testing at `http://localhost:3000`
is recommended before release.

### No Persistence

Assembly source, register values, and trace data are not persisted across
page reloads. All state is in-memory only.

### No Dark/Light Theme Toggle

The application uses a fixed dark theme (slate-950 background). No theme
switcher is implemented.

### Contenteditable Editor

The assembly editor uses a `contenteditable` div rather than a full-featured
code editor (Monaco, CodeMirror). It lacks syntax highlighting, autocomplete,
goto-definition, and other IDE features. This was a deliberate choice to keep
the bundle size small (~170 KB gzipped).

## Verilator/RTL Limitations

### No Source-Level Debugging

There is no source-level mapping from assembly lines to RTL signals. The
frontend can only show pipeline stage registers, not map them back to source
lines.

### VCD Trace Depth

Verilator tracing uses depth 99 (full hierarchy). Very long traces produce
large VCD files. There is no trace compression or filtering.

### No Waveform Save/Export

VCD files can be retrieved via the API but cannot be saved or exported from
the frontend. They are ephemeral (stored in the WSL filesystem).

## Security Limitations

- No authentication or authorization
- No HTTPS (HTTP only, localhost)
- No CORS restrictions beyond allowing `localhost:3000` and `127.0.0.1:3000`
- Filename validation prevents path traversal, but no other input sanitization
  beyond what Pydantic and the assembler provide

## No Build Artifacts in Repository

The Verilator-generated binary (`Vriscv_sim_top`), object files (`.o`), and
VCD files are **not** part of the repository and must be built separately.
The repository contains only source code, configuration, and documentation.
