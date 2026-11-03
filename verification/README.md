# RISC-V RV32I Hardware Verification Suite

Comprehensive microarchitectural and functional verification suite for the 5-stage pipelined RV32I processor implemented in SystemVerilog, simulated via Verilator, and visualized in the Cloud RISC-V Visual Simulator & Waveform Studio.

---

## Overview

This verification suite rigorously tests the core 32-bit integer base instruction set (RV32I), pipeline stage latching, data hazard forwarding, control hazard flushing, load-use stall insertion, memory alignment semantics, and VCD waveform signal fidelity directly against the compiled Verilator C++ simulation model (`Vriscv_sim_top`).

### Key Highlights
- **100% Verification Pass Rate**: All 7 benchmark categories and 130 microarchitectural assertions pass.
- **RTL-Accurate Hardware Simulation**: Drives the cycle-accurate SystemVerilog RTL model compiled with Verilator.
- **Automated Waveform Generation**: Produces industry-standard `.vcd` traces capturing every internal signal and latch across simulation cycles.
- **Cross-Platform Test Runners**: Supports execution both from Windows (via WSL2 bridge) and natively on Linux.

---

## Directory Structure

```text
verification/
├── README.md                               # This document
├── benchmarks/
│   ├── 01_branches/                        # BEQ, BNE, BLT, BGE, BLTU, BGEU (taken & not-taken)
│   │   ├── branch_benchmark.s
│   │   └── expected_results.json
│   ├── 02_jumps/                           # JAL, JALR, link registers, loops, subroutine returns
│   │   ├── jump_benchmark.s
│   │   └── expected_results.json
│   ├── 03_arithmetic_logic/                # ADD, SUB, SLT, SLTU, AND, OR, XOR, ADDI, SLTI, etc.
│   │   ├── arithmetic_logic_benchmark.s
│   │   └── expected_results.json
│   ├── 04_shifts/                          # SLL, SRL, SRA, SLLI, SRLI, SRAI (0, 1, 31, 5-bit mask)
│   │   ├── shift_benchmark.s
│   │   └── expected_results.json
│   ├── 05_memory/                          # SW, LW, multi-word storage, overwrite, negative offsets
│   │   ├── memory_benchmark.s
│   │   └── expected_results.json
│   ├── 06_data_hazards/                    # EX/MEM->EX, MEM/WB->EX, double forwarding, load-use stall
│   │   ├── data_hazard_benchmark.s
│   │   └── expected_results.json
│   └── 07_edge_cases/                      # x0 hardwiring, +/- 12-bit boundaries, wrapping, unaligned access
│       ├── edge_case_benchmark.s
│       └── expected_results.json
├── reports/
│   ├── verification_report.md             # Auto-generated formal verification report with full diffs
│   └── waveforms/                          # Verified benchmark VCD waveform traces
│       ├── 01_branches.vcd
│       └── 06_data_hazards.vcd
└── scripts/
    ├── run_all.py                          # Master test runner and report generator
    └── run_benchmark.py                    # Single benchmark execution and debug inspection tool
```

---

## Verified Benchmarks Summary

| # | Benchmark Suite | Instructions Tested | Tested Behaviors & Microarchitecture | Status |
|---|---|---|---|---|
| **01** | `01_branches` | `BEQ`, `BNE`, `BLT`, `BGE`, `BLTU`, `BGEU` | Taken & not-taken branches, signed vs unsigned comparisons, pipeline flush on redirect. | **PASS** |
| **02** | `02_jumps` | `JAL`, `JALR` | Link register writes (`PC + 4`), target computation `(rs1 + imm)`, function returns, backward loops. | **PASS** |
| **03** | `03_arithmetic_logic` | `ADD`, `SUB`, `SLT`, `SLTU`, `AND`, `OR`, `XOR`, `ADDI`, `SLTI`, `SLTIU`, `ANDI`, `ORI`, `XORI` | Full ALU arithmetic, bitwise masking, signed/unsigned set-less-than comparisons, two's complement. | **PASS** |
| **04** | `04_shifts` | `SLL`, `SRL`, `SRA`, `SLLI`, `SRLI`, `SRAI` | Boundary shifts (0, 1, 31), sign bit replication (SRA) vs zero-extension (SRL), 5-bit register shift mask. | **PASS** |
| **05** | `05_memory` | `SW`, `LW` | Word-aligned reads & writes, multi-word data persistence, overwriting existing words, negative immediate offsets. | **PASS** |
| **06** | `06_data_hazards` | Full RV32I Hazard Unit | EX/MEM->EX forwarding (dist 1), MEM/WB->EX forwarding (dist 2), double forwarding, load-use bubble insertion. | **PASS** |
| **07** | `07_edge_cases` | Architecture Edge Cases | Hardwired `x0` immutability, 12-bit immediate limits (-2048 to +2047), two's complement wrapping, unaligned memory safety. | **PASS** |

---

## Running the Verification Suite

### Prerequisites
1. Python 3.8+
2. Verilator C++ simulation model compiled (default: `/home/pc/riscv-verilator-build/Vriscv_sim_top` inside WSL2 Ubuntu or native Linux).

### Running All Benchmarks

To execute the entire verification suite and generate a fresh markdown report and waveform files:

```bash
# From Windows PowerShell or terminal:
python verification/scripts/run_all.py

# Or with waveforms generated for all benchmarks:
python verification/scripts/run_all.py --trace
```

### Running an Individual Benchmark

To execute and inspect a specific benchmark in detail:

```bash
# Run 01_branches
python verification/scripts/run_benchmark.py 01_branches

# Run 06_data_hazards with VCD waveform tracing
python verification/scripts/run_benchmark.py 06_data_hazards --trace
```

### Inspecting Waveforms (VCD)

The generated `.vcd` files in `verification/reports/waveforms/` can be opened in:
- The integrated **Waveform Studio** in the web frontend (`localhost:3000`)
- **GTKWave** or **Surfer**:
  ```bash
  gtkwave verification/reports/waveforms/06_data_hazards.vcd
  ```

---

## Architectural Observations & Verification Findings

1. **Hazard Detection & Stalls**:
   - The hardware hazard detection unit accurately identifies load-use hazards (`memread_ex && (rd_ex == rs1_id || rd_ex == rs2_id)`), asserting `control_stall` and freezing the Program Counter (`pc_write = 0`) and Fetch register (`if_id_write = 0`) for exactly 1 cycle while inserting a bubble into `ID/EX`.
2. **Forwarding Unit Prioritization**:
   - When consecutive instructions update the same register (e.g. `addi x8, x0, 100` followed immediately by `addi x8, x0, 200`), the forwarding unit gives higher priority to `EX/MEM` over `MEM/WB`, ensuring the newest computed value is always propagated.
3. **Memory Safety**:
   - `data_memory.sv` enforces 32-bit word alignment (`address[1:0] == 2'b00`). Unaligned writes do not commit, and unaligned reads safely return `0x00000000`, preventing simulation crashes.
