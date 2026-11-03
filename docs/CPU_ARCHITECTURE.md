# CPU Architecture — Five-Stage RV32I Pipeline

## Overview

The processor is a classic five-stage, in-order RV32I pipeline implemented in SystemVerilog
and simulated with Verilator. The top-level module is `riscv_sim_top.sv`, which instantiates
`pipeline_cpu` and exposes all internal pipeline registers as debug outputs for frontend
inspection.

```
                    ┌─────────────────────────────────────────┐
                    │              IF: Fetch                  │
                    │  PC → Instruction Memory → Instruction  │
                    └──────────┬──────────────────────────────┘
                               │ IF/ID Register
                               ▼
                    ┌─────────────────────────────────────────┐
                    │              ID: Decode                 │
                    │  Instruction → Register Read → Imm Gen  │
                    │  Control → Hazard Detection             │
                    └──────────┬──────────────────────────────┘
                               │ ID/EX Register
                               ▼
                    ┌─────────────────────────────────────────┐
                    │              EX: Execute                │
                    │  ALU → Branch Compare → Forward Muxes   │
                    └──────────┬──────────────────────────────┘
                               │ EX/MEM Register
                               ▼
                    ┌─────────────────────────────────────────┐
                    │             MEM: Memory                 │
                    │  Data Memory Read/Write                 │
                    └──────────┬──────────────────────────────┘
                               │ MEM/WB Register
                               ▼
                    ┌─────────────────────────────────────────┐
                    │              WB: Writeback              │
                    │  Register File Write                    │
                    └─────────────────────────────────────────┘
```

## Pipeline Registers

Each pipeline stage is separated by a pipeline register that holds state between
clock cycles. All are exposed as debug outputs from `riscv_sim_top`:

| Pipeline Register | Debug Signals | Contents |
|-------------------|--------------|----------|
| IF/ID | `debug_if_id_pc`, `debug_if_id_instruction` | PC+4, fetched instruction |
| ID/EX | `debug_ex_pc`, `debug_ex_rd`, `debug_ex_opcode` | PC, destination reg, opcode |
| EX/MEM | `debug_mem_alu_result`, `debug_mem_store_data`, `debug_mem_rd` | ALU result, store data, dest reg |
| MEM/WB | `debug_wb_writeback_data`, `debug_wb_writeback_rd`, `debug_wb_writeback_enable` | Writeback data, dest reg, regwrite enable |

## Stage-by-Stage Description

### IF: Instruction Fetch

- **PC**: Program counter, initialized to 0.
- **Instruction Memory**: Read-only memory initialized from the `.hex` file via
  `$readmemh` with the `+program=` plusarg.
- **PC Selection** (`debug_pc_sel`):
  - `0`: PC+4 (sequential)
  - `1`: Branch target
  - `2`: JAL target
  - `3`: JALR target
- **Branch Prediction**: Predict not taken. Branches are resolved in the EX stage.
  If a branch is taken, `debug_redirect` asserts and the IF/ID register is flushed.

### ID: Instruction Decode

- **Register File**: 32×32-bit register file (x0–x31). x0 is hardwired to 0.
- **Immediate Generator**: Extracts and sign-extends immediates for I, S, B, U, J types.
- **Control Unit**: Decodes opcode to generate ALU control, register read/write enables,
  memory read/write enables, and branch type.
- **Hazard Detection**: Detects load-use hazards (load in EX/MEM, destination register
  matches a source register in ID/EX). Asserts `debug_control_stall` to hold IF/ID
  and insert a bubble into ID/EX.
- **Debug outputs**: `debug_id_rs1_data`, `debug_id_rs2_data`, `debug_id_imm`

### EX: Execute

- **ALU**: Performs arithmetic and logical operations based on opcode and funct3/funct7.
- **Branch Comparator**: Compares rs1 and rs2 for branch decisions (eq, ne, lt, ge, etc.).
- **Forwarding**: Forwards results from EX/MEM and MEM/WB pipeline registers to ALU
  inputs to avoid stalls on back-to-back dependent instructions.
- **Debug outputs**: `debug_ex_pc`, `debug_ex_rd`, `debug_ex_opcode`

### MEM: Memory Access

- **Data Memory**: 1 KiB (1024 words) data memory. Supports word loads (`lw`) and
  stores (`sw`). Addresses must be word-aligned.
- **Debug outputs**: `debug_mem_alu_result`, `debug_mem_store_data`, `debug_mem_rd`

### WB: Write Back

- **Register Write**: Writes ALU result, load data, or PC+4 (for JAL/JALR) back to
  the register file if `debug_wb_writeback_enable` is asserted.
- **x0 Protection**: Writes to x0 are silently dropped (x0 always reads 0).
- **Debug outputs**: `debug_wb_writeback_data`, `debug_wb_writeback_rd`,
  `debug_wb_writeback_enable`

## Control Unit

The control unit decodes the 7-bit opcode and generates:

| Signal | Meaning |
|--------|---------|
| `RegWrite` | Enable register file write (WB stage) |
| `MemRead` | Enable data memory read (MEM stage) |
| `MemWrite` | Enable data memory write (MEM stage) |
| `ALUSrc` | ALU second operand is immediate (vs register) |
| `Branch` | Branch instruction (PC update if condition met) |
| `Jump` | Jump instruction (JAL/JALR, unconditional PC update) |
| `ALUOp` | ALU operation type (R-type, I-type, branch, etc.) |

## Forwarding Unit

The forwarding unit resolves data hazards by forwarding results from later pipeline
stages back to earlier ALU inputs, avoiding stalls for ALU-to-ALU dependencies.

**Forwarding Priority** (when both EX/MEM and MEM/WB have valid results for the same
source register):

1. **EX/MEM forwarding** (highest priority): Forward from `debug_mem_alu_result`
   when the EX/MEM destination register matches a source register and
   `debug_wb_writeback_enable` is set for that register in the MEM stage.

2. **MEM/WB forwarding** (secondary): Forward from `debug_wb_writeback_data`
   when the MEM/WB destination register matches a source register.

If neither forwarding source matches, the ALU reads from the register file values
captured in the ID stage.

**Forwarding does not apply** to load-use hazards: a load's data is not available
until after the MEM stage, so a dependent instruction in ID must stall.

## Hazard Detection

The hazard detection unit detects load-use hazards:

```
Condition:  EX/MEM stage is a load (MemRead=1)
            AND (EX/MEM.rd == ID/EX.rs1 OR EX/MEM.rd == ID/EX.rs2)
            AND EX/MEM.rd != 0
```

When detected:
- `debug_control_stall` asserts
- IF/ID register is held (PC does not increment, instruction not overwritten)
- ID/EX pipeline register is zeroed (inserts a bubble/NOP into EX stage)
- The dependent instruction re-enters ID in the next cycle

This creates a **one-cycle load-use stall**. After the stall, the load data is
available from the MEM/WB pipeline register and can be forwarded.

## Branch Prediction and Flushing

- **Prediction**: Predict not taken. The PC always increments by 4 unless a
  taken branch or jump is detected in EX.
- **Resolution**: Branches are resolved in the EX stage (branch comparator output).
- **Misprediction (taken branch)**: `debug_redirect` asserts, PC is updated to the
  branch target, and the IF/ID register is flushed (the incorrectly fetched
  instruction is discarded). This creates a bubble.
- **Correct prediction (not taken)**: No redirect, PC+4 continues normally.

## Timing Example: Phase A Program

```
addi x1, x0, 5    ; Cycle 1: IF, Cycle 2: ID, Cycle 3: EX, Cycle 4: MEM, Cycle 5: WB
addi x2, x0, 7    ; Cycle 2: IF, Cycle 3: ID, Cycle 4: EX, Cycle 5: MEM, Cycle 6: WB
add  x3, x1, x2   ; Cycle 3: IF, Cycle 4: ID, Cycle 5: EX (forwards x1,x2 from WB),
                   Cycle 6: MEM, Cycle 7: WB
sw   x3, 0(x0)    ; Cycle 4: IF, Cycle 5: ID, Cycle 6: EX, Cycle 7: MEM (store),
                   Cycle 8: WB (no write)
lw   x4, 0(x0)    ; Cycle 5: IF, Cycle 6: ID, Cycle 7: EX, Cycle 8: MEM (load),
                   Cycle 9: WB (write x4=12), load-use stall if next instr depends
addi x5, x4, 1    ; Cycle 6: IF, Cycle 7: ID (stall if x4 not ready), Cycle 8: ID,
                   Cycle 9: EX (forwards x4 from WB), Cycle 10: MEM, Cycle 11: WB
```

**Expected final state**: x1=5, x2=7, x3=12, x4=12, x5=13, memory[0]=12.

## RTL Debug Interface

`riscv_sim_top.sv` exposes the following debug outputs (all driven from
`pipeline_cpu` internals):

| Signal | Width | Description |
|--------|-------|-------------|
| `debug_fetch_pc` | 32 | IF stage PC |
| `debug_fetch_instruction` | 32 | IF stage instruction |
| `debug_if_id_pc` | 32 | IF/ID PC |
| `debug_if_id_instruction` | 32 | IF/ID instruction |
| `debug_id_rs1_data` | 32 | ID stage rs1 data |
| `debug_id_rs2_data` | 32 | ID stage rs2 data |
| `debug_id_imm` | 32 | ID stage immediate |
| `debug_ex_pc` | 32 | EX stage PC |
| `debug_ex_rd` | 5 | EX destination register |
| `debug_ex_opcode` | 7 | EX stage opcode |
| `debug_mem_alu_result` | 32 | MEM ALU result |
| `debug_mem_store_data` | 32 | MEM store data |
| `debug_mem_rd` | 5 | MEM destination register |
| `debug_wb_writeback_data` | 32 | WB writeback data |
| `debug_wb_writeback_rd` | 5 | WB destination register |
| `debug_wb_writeback_enable` | 1 | WB register write enable |
| `debug_control_stall` | 1 | Hazard stall active |
| `debug_redirect` | 1 | Branch redirect active |
| `debug_pc_sel` | 2 | PC select signal |
| `debug_reg_addr` | 5 | Register file debug read address (input) |
| `debug_reg_data` | 32 | Register file debug read data (output) |
| `debug_dmem_addr` | 32 | Data memory debug read address (input) |
| `debug_dmem_data` | 32 | Data memory debug read data (output) |
