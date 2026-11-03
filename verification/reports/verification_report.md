# Cloud RISC-V Visual Simulator — Hardware Verification Report

**Generated:** 2026-11-03 12:10:39
**Verification Engine:** Verilator SystemVerilog C++ RTL Simulation (`Vriscv_sim_top`)
**Architecture:** RV32I 32-bit RISC-V (5-Stage Pipelined: IF, ID, EX, MEM, WB)
**Overall Status:** `PASS` (100% Verified)

## Executive Summary

| Metric | Result |
|---|---|
| **Benchmark Suites** | 7 / 7 Passed (100.0%) |
| **Total Assertions** | 130 / 130 Passed (100.0%) |
| **Register Validations** | 122 / 122 Passed |
| **Data Memory Validations** | 8 / 8 Passed |
| **Total Wall-Clock Time** | 1.97 seconds |

## Verification Suite Results Table

| # | Benchmark Name | Description | Instructions | Cycles | Assertions | Status |
|---|---|---|---|---|---|---|
| 01 | `01_branches` | Comprehensive branch verification covering BEQ, BNE, BLT, BGE, BLTU, BGEU across... | 43 | 93 | 17 | **PASS** |
| 02 | `02_jumps` | Comprehensive jump verification covering JAL, JALR, link register (PC+4) writing... | 23 | 83 | 11 | **PASS** |
| 03 | `03_arithmetic_logic` | Comprehensive integer arithmetic and logical instruction verification covering A... | 27 | 43 | 27 | **PASS** |
| 04 | `04_shifts` | Comprehensive shift instruction verification covering SLL, SRL, SRA, SLLI, SRLI,... | 19 | 38 | 19 | **PASS** |
| 05 | `05_memory` | Comprehensive memory operation verification covering SW and LW with sequential w... | 23 | 38 | 22 | **PASS** |
| 06 | `06_data_hazards` | Comprehensive hazard detection and forwarding verification covering EX/MEM->EX, ... | 22 | 43 | 20 | **PASS** |
| 07 | `07_edge_cases` | Comprehensive edge-case verification covering hardwired x0 zero semantics, immed... | 16 | 38 | 14 | **PASS** |

## Detailed Benchmark Breakdown

### Benchmark: `01_branches`

- **Description:** Comprehensive branch verification covering BEQ, BNE, BLT, BGE, BLTU, BGEU across taken and not-taken conditions, signed vs unsigned comparisons, and pipeline flushing.
- **Instructions Executed:** 43
- **Simulation Cycles:** 93
- **Result:** PASS

#### Architectural Register File State

| Register | Expected Hex | Actual Hex | Expected Dec | Actual Dec | Status |
|---|---|---|---|---|---|
| `x1` | `0x00000005` | `0x00000005` | 5 | 5 | PASS |
| `x2` | `0x00000005` | `0x00000005` | 5 | 5 | PASS |
| `x3` | `0x00000007` | `0x00000007` | 7 | 7 | PASS |
| `x4` | `0xFFFFFFFB` | `0xFFFFFFFB` | 4294967291 | 4294967291 | PASS |
| `x10` | `0x00000001` | `0x00000001` | 1 | 1 | PASS |
| `x11` | `0x00000003` | `0x00000003` | 3 | 3 | PASS |
| `x12` | `0x00000003` | `0x00000003` | 3 | 3 | PASS |
| `x13` | `0x00000005` | `0x00000005` | 5 | 5 | PASS |
| `x14` | `0x00000005` | `0x00000005` | 5 | 5 | PASS |
| `x15` | `0x00000007` | `0x00000007` | 7 | 7 | PASS |
| `x16` | `0x00000007` | `0x00000007` | 7 | 7 | PASS |
| `x17` | `0x00000009` | `0x00000009` | 9 | 9 | PASS |
| `x18` | `0x0000000B` | `0x0000000B` | 11 | 11 | PASS |
| `x19` | `0x0000000D` | `0x0000000D` | 13 | 13 | PASS |
| `x20` | `0x0000000F` | `0x0000000F` | 15 | 15 | PASS |
| `x21` | `0x00000011` | `0x00000011` | 17 | 17 | PASS |
| `x22` | `0x00000013` | `0x00000013` | 19 | 19 | PASS |

- **VCD Waveform File:** `verification/reports/waveforms/01_branches.vcd`

### Benchmark: `02_jumps`

- **Description:** Comprehensive jump verification covering JAL, JALR, link register (PC+4) writing, indirect target calculation (rs1 + imm), function call/return sequences, and backward jump loops.
- **Instructions Executed:** 23
- **Simulation Cycles:** 83
- **Result:** PASS

#### Architectural Register File State

| Register | Expected Hex | Actual Hex | Expected Dec | Actual Dec | Status |
|---|---|---|---|---|---|
| `x1` | `0x00000008` | `0x00000008` | 8 | 8 | PASS |
| `x2` | `0x00000001` | `0x00000001` | 1 | 1 | PASS |
| `x3` | `0x00000000` | `0x00000000` | 0 | 0 | PASS |
| `x4` | `0x00000040` | `0x00000040` | 64 | 64 | PASS |
| `x5` | `0x00000034` | `0x00000034` | 52 | 52 | PASS |
| `x10` | `0x0000002A` | `0x0000002A` | 42 | 42 | PASS |
| `x11` | `0x0000002B` | `0x0000002B` | 43 | 43 | PASS |
| `x12` | `0x00000014` | `0x00000014` | 20 | 20 | PASS |
| `x13` | `0x0000001E` | `0x0000001E` | 30 | 30 | PASS |
| `x14` | `0x0000004D` | `0x0000004D` | 77 | 77 | PASS |
| `x15` | `0x00000058` | `0x00000058` | 88 | 88 | PASS |

### Benchmark: `03_arithmetic_logic`

- **Description:** Comprehensive integer arithmetic and logical instruction verification covering ADD, SUB, SLT, SLTU, AND, OR, XOR, ADDI, SLTI, SLTIU, ANDI, ORI, XORI with positive, negative, zero operands and two's complement behavior.
- **Instructions Executed:** 27
- **Simulation Cycles:** 43
- **Result:** PASS

#### Architectural Register File State

| Register | Expected Hex | Actual Hex | Expected Dec | Actual Dec | Status |
|---|---|---|---|---|---|
| `x1` | `0x0000000F` | `0x0000000F` | 15 | 15 | PASS |
| `x2` | `0x00000019` | `0x00000019` | 25 | 25 | PASS |
| `x3` | `0xFFFFFFF6` | `0xFFFFFFF6` | 4294967286 | 4294967286 | PASS |
| `x4` | `0x00000028` | `0x00000028` | 40 | 40 | PASS |
| `x5` | `0x00000014` | `0x00000014` | 20 | 20 | PASS |
| `x6` | `0x0000000A` | `0x0000000A` | 10 | 10 | PASS |
| `x7` | `0xFFFFFFFB` | `0xFFFFFFFB` | 4294967291 | 4294967291 | PASS |
| `x8` | `0x0000000A` | `0x0000000A` | 10 | 10 | PASS |
| `x9` | `0xFFFFFFF6` | `0xFFFFFFF6` | 4294967286 | 4294967286 | PASS |
| `x10` | `0x00000000` | `0x00000000` | 0 | 0 | PASS |
| `x11` | `0x00000055` | `0x00000055` | 85 | 85 | PASS |
| `x12` | `0x000000AA` | `0x000000AA` | 170 | 170 | PASS |
| `x13` | `0x00000000` | `0x00000000` | 0 | 0 | PASS |
| `x14` | `0x000000FF` | `0x000000FF` | 255 | 255 | PASS |
| `x15` | `0x000000FF` | `0x000000FF` | 255 | 255 | PASS |
| `x16` | `0x00000005` | `0x00000005` | 5 | 5 | PASS |
| `x17` | `0x00000075` | `0x00000075` | 117 | 117 | PASS |
| `x18` | `0x00000000` | `0x00000000` | 0 | 0 | PASS |
| `x19` | `0x00000001` | `0x00000001` | 1 | 1 | PASS |
| `x20` | `0x00000000` | `0x00000000` | 0 | 0 | PASS |
| `x21` | `0x00000001` | `0x00000001` | 1 | 1 | PASS |
| `x22` | `0x00000000` | `0x00000000` | 0 | 0 | PASS |
| `x23` | `0x00000001` | `0x00000001` | 1 | 1 | PASS |
| `x24` | `0x00000001` | `0x00000001` | 1 | 1 | PASS |
| `x25` | `0x00000000` | `0x00000000` | 0 | 0 | PASS |
| `x26` | `0x00000001` | `0x00000001` | 1 | 1 | PASS |
| `x27` | `0x00000000` | `0x00000000` | 0 | 0 | PASS |

### Benchmark: `04_shifts`

- **Description:** Comprehensive shift instruction verification covering SLL, SRL, SRA, SLLI, SRLI, SRAI across boundary shift amounts (0, 1, 31), sign-bit preservation vs zero-fill, and 5-bit register shift amount masking.
- **Instructions Executed:** 19
- **Simulation Cycles:** 38
- **Result:** PASS

#### Architectural Register File State

| Register | Expected Hex | Actual Hex | Expected Dec | Actual Dec | Status |
|---|---|---|---|---|---|
| `x1` | `0x00000001` | `0x00000001` | 1 | 1 | PASS |
| `x2` | `0xFFFFFFFF` | `0xFFFFFFFF` | 4294967295 | 4294967295 | PASS |
| `x3` | `0x00000010` | `0x00000010` | 16 | 16 | PASS |
| `x4` | `0x80000000` | `0x80000000` | 2147483648 | 2147483648 | PASS |
| `x5` | `0x00000001` | `0x00000001` | 1 | 1 | PASS |
| `x6` | `0xFFFFFFFF` | `0xFFFFFFFF` | 4294967295 | 4294967295 | PASS |
| `x7` | `0x40000000` | `0x40000000` | 1073741824 | 1073741824 | PASS |
| `x8` | `0xC0000000` | `0xC0000000` | 3221225472 | 3221225472 | PASS |
| `x9` | `0x80000000` | `0x80000000` | 2147483648 | 2147483648 | PASS |
| `x10` | `0x80000000` | `0x80000000` | 2147483648 | 2147483648 | PASS |
| `x11` | `0x80000000` | `0x80000000` | 2147483648 | 2147483648 | PASS |
| `x12` | `0x00000005` | `0x00000005` | 5 | 5 | PASS |
| `x13` | `0x00000020` | `0x00000020` | 32 | 32 | PASS |
| `x14` | `0x02000000` | `0x02000000` | 33554432 | 33554432 | PASS |
| `x15` | `0xFE000000` | `0xFE000000` | 4261412864 | 4261412864 | PASS |
| `x16` | `0x00000024` | `0x00000024` | 36 | 36 | PASS |
| `x17` | `0x00000010` | `0x00000010` | 16 | 16 | PASS |
| `x18` | `0x08000000` | `0x08000000` | 134217728 | 134217728 | PASS |
| `x19` | `0xF8000000` | `0xF8000000` | 4160749568 | 4160749568 | PASS |

### Benchmark: `05_memory`

- **Description:** Comprehensive memory operation verification covering SW and LW with sequential word addresses, data retrieval into registers, memory overwriting, and negative immediate offsets.
- **Instructions Executed:** 23
- **Simulation Cycles:** 38
- **Result:** PASS

#### Architectural Register File State

| Register | Expected Hex | Actual Hex | Expected Dec | Actual Dec | Status |
|---|---|---|---|---|---|
| `x1` | `0x00000000` | `0x00000000` | 0 | 0 | PASS |
| `x2` | `0x00000064` | `0x00000064` | 100 | 100 | PASS |
| `x3` | `0x000000C8` | `0x000000C8` | 200 | 200 | PASS |
| `x4` | `0x0000012C` | `0x0000012C` | 300 | 300 | PASS |
| `x5` | `0x00000190` | `0x00000190` | 400 | 400 | PASS |
| `x6` | `0x000001F4` | `0x000001F4` | 500 | 500 | PASS |
| `x7` | `0x000003E7` | `0x000003E7` | 999 | 999 | PASS |
| `x8` | `0x00000020` | `0x00000020` | 32 | 32 | PASS |
| `x9` | `0x00000309` | `0x00000309` | 777 | 777 | PASS |
| `x10` | `0x00000064` | `0x00000064` | 100 | 100 | PASS |
| `x11` | `0x000000C8` | `0x000000C8` | 200 | 200 | PASS |
| `x12` | `0x0000012C` | `0x0000012C` | 300 | 300 | PASS |
| `x13` | `0x00000190` | `0x00000190` | 400 | 400 | PASS |
| `x14` | `0x000001F4` | `0x000001F4` | 500 | 500 | PASS |
| `x15` | `0x000003E7` | `0x000003E7` | 999 | 999 | PASS |
| `x16` | `0x00000309` | `0x00000309` | 777 | 777 | PASS |

#### Data Memory State

| Address | Expected Hex | Actual Hex | Expected Dec | Actual Dec | Status |
|---|---|---|---|---|---|
| `memory[0]` | `0x00000064` | `0x00000064` | 100 | 100 | PASS |
| `memory[4]` | `0x000000C8` | `0x000000C8` | 200 | 200 | PASS |
| `memory[8]` | `0x000003E7` | `0x000003E7` | 999 | 999 | PASS |
| `memory[12]` | `0x00000190` | `0x00000190` | 400 | 400 | PASS |
| `memory[16]` | `0x000001F4` | `0x000001F4` | 500 | 500 | PASS |
| `memory[24]` | `0x00000309` | `0x00000309` | 777 | 777 | PASS |

### Benchmark: `06_data_hazards`

- **Description:** Comprehensive hazard detection and forwarding verification covering EX/MEM->EX, MEM/WB->EX, double-operand forwarding, hazard unit priority, chained dependencies, and load-use pipeline stalls with bubble insertion.
- **Instructions Executed:** 22
- **Simulation Cycles:** 43
- **Result:** PASS

#### Architectural Register File State

| Register | Expected Hex | Actual Hex | Expected Dec | Actual Dec | Status |
|---|---|---|---|---|---|
| `x1` | `0x0000000A` | `0x0000000A` | 10 | 10 | PASS |
| `x2` | `0x0000000F` | `0x0000000F` | 15 | 15 | PASS |
| `x3` | `0x00000014` | `0x00000014` | 20 | 20 | PASS |
| `x4` | `0x00000019` | `0x00000019` | 25 | 25 | PASS |
| `x5` | `0x0000001E` | `0x0000001E` | 30 | 30 | PASS |
| `x6` | `0x00000028` | `0x00000028` | 40 | 40 | PASS |
| `x7` | `0x00000046` | `0x00000046` | 70 | 70 | PASS |
| `x8` | `0x000000C8` | `0x000000C8` | 200 | 200 | PASS |
| `x9` | `0x000000C8` | `0x000000C8` | 200 | 200 | PASS |
| `x10` | `0x00000001` | `0x00000001` | 1 | 1 | PASS |
| `x11` | `0x00000002` | `0x00000002` | 2 | 2 | PASS |
| `x12` | `0x00000004` | `0x00000004` | 4 | 4 | PASS |
| `x13` | `0x00000008` | `0x00000008` | 8 | 8 | PASS |
| `x14` | `0x00000010` | `0x00000010` | 16 | 16 | PASS |
| `x15` | `0x00000000` | `0x00000000` | 0 | 0 | PASS |
| `x16` | `0x00000378` | `0x00000378` | 888 | 888 | PASS |
| `x17` | `0x00000378` | `0x00000378` | 888 | 888 | PASS |
| `x18` | `0x00000379` | `0x00000379` | 889 | 889 | PASS |
| `x19` | `0x000006F1` | `0x000006F1` | 1777 | 1777 | PASS |

#### Data Memory State

| Address | Expected Hex | Actual Hex | Expected Dec | Actual Dec | Status |
|---|---|---|---|---|---|
| `memory[0]` | `0x00000378` | `0x00000378` | 888 | 888 | PASS |

- **VCD Waveform File:** `verification/reports/waveforms/06_data_hazards.vcd`

### Benchmark: `07_edge_cases`

- **Description:** Comprehensive edge-case verification covering hardwired x0 zero semantics, immediate range boundaries (+2047, -2048), two's complement overflow and underflow wrapping, unaligned memory access safety, and AUIPC PC-relative addressing.
- **Instructions Executed:** 16
- **Simulation Cycles:** 38
- **Result:** PASS

#### Architectural Register File State

| Register | Expected Hex | Actual Hex | Expected Dec | Actual Dec | Status |
|---|---|---|---|---|---|
| `x1` | `0x00000000` | `0x00000000` | 0 | 0 | PASS |
| `x2` | `0x000007FF` | `0x000007FF` | 2047 | 2047 | PASS |
| `x3` | `0xFFFFF800` | `0xFFFFF800` | 4294965248 | 4294965248 | PASS |
| `x4` | `0x80000000` | `0x80000000` | 2147483648 | 2147483648 | PASS |
| `x5` | `0x7FFFFFFF` | `0x7FFFFFFF` | 2147483647 | 2147483647 | PASS |
| `x6` | `0x80000000` | `0x80000000` | 2147483648 | 2147483648 | PASS |
| `x7` | `0x00000000` | `0x00000000` | 0 | 0 | PASS |
| `x8` | `0xFFFFFFFF` | `0xFFFFFFFF` | 4294967295 | 4294967295 | PASS |
| `x9` | `0x00000123` | `0x00000123` | 291 | 291 | PASS |
| `x10` | `0x000003E7` | `0x000003E7` | 999 | 999 | PASS |
| `x11` | `0x00000000` | `0x00000000` | 0 | 0 | PASS |
| `x12` | `0x00000123` | `0x00000123` | 291 | 291 | PASS |
| `x13` | `0x0000103C` | `0x0000103C` | 4156 | 4156 | PASS |

#### Data Memory State

| Address | Expected Hex | Actual Hex | Expected Dec | Actual Dec | Status |
|---|---|---|---|---|---|
| `memory[0]` | `0x00000123` | `0x00000123` | 291 | 291 | PASS |

## Microarchitectural Analysis & Findings


1. **Control Hazard Handling (Branches & Jumps):**
   - Branch outcomes are accurately evaluated in the `EX` stage by `branch_comparator.sv` using signed comparisons for `BLT`/`BGE` and unsigned comparisons for `BLTU`/`BGEU`.
   - On taken branches and jumps, the pipeline control redirects the PC and asserts flush signals to `if_id_reg` and `id_ex_reg`, squashing wrong-path instructions without allowing state modification.
   - JAL and JALR properly write the link return address (`PC + 4`) to destination registers (`x1` / `ra` or arbitrary general-purpose registers).

2. **Data Forwarding Unit:**
   - EX/MEM to EX forwarding (distance 1) and MEM/WB to EX forwarding (distance 2) operate seamlessly across all ALU operations without inserting bubbles.
   - Forwarding priority is strictly honored: when both EX/MEM and MEM/WB stages target the same destination register, the more recent value from EX/MEM correctly overrides the older MEM/WB value.
   - Forwarding to `x0` is suppressed, guaranteeing that register zero remains immutable.

3. **Hazard Detection & Load-Use Stalls:**
   - When an instruction in `ID` depends on a preceding load instruction in `EX`, `hazard_detection_unit.sv` asserts `control_stall = 1`.
   - The PC and `IF/ID` registers freeze for 1 cycle while a bubble (NOP) is injected into `ID/EX`. The dependent instruction executes in the subsequent cycle with the freshly loaded data forwarded from `MEM/WB`.

4. **Memory Subsystem & Edge Cases:**
   - Word-aligned memory stores (`SW`) and loads (`LW`) persist and retrieve 32-bit words without corruption.
   - Unaligned accesses (`address[1:0] != 2'b00`) are safely ignored by `data_memory.sv`, preventing memory corruption.
   - Hardwired `x0` zero semantics are fully respected across writes, reads, and arithmetic wrapping.
