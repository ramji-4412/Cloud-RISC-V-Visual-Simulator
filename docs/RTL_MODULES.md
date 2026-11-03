# RTL Module Reference

This document provides a module-by-module reference for the RTL and C++ files
actually present in the repository. Only files that exist in `hardware/sim/`
are documented. Individual pipeline stage SystemVerilog source files
(`pipeline_cpu.sv`, `fetch_stage.sv`, etc.) are part of the Verilator build
environment and are not tracked in this repository; their interfaces are
visible through the debug ports of `riscv_sim_top`.

## 1. riscv_sim_top.sv — Top-Level Wrapper

**File**: `hardware/sim/riscv_sim_top.sv`
**Position**: Top of the hierarchy; instantiates `pipeline_cpu` and exposes all
internal pipeline registers as debug outputs.

### Purpose
Top-level SystemVerilog module that wraps the five-stage `pipeline_cpu` core and
provides a debug observation interface. All pipeline stage registers are
re-exported as top-level outputs so the C++ simulation engine can read them
through Verilator's public member access.

### Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `IMEM_ADDR_WIDTH` | 10 | Instruction memory address width |
| `DMEM_ADDR_WIDTH` | 10 | Data memory address width |

### Inputs

| Signal | Width | Description |
|--------|-------|-------------|
| `clk` | 1 | Clock |
| `rst_n` | 1 | Active-low reset |
| `debug_reg_addr` | 5 | Register file debug read address |
| `debug_dmem_addr` | 32 | Data memory debug read address |

### Outputs

| Signal | Width | Description |
|--------|-------|-------------|
| `debug_fetch_pc` | 32 | IF stage program counter |
| `debug_fetch_instruction` | 32 | IF stage instruction word |
| `debug_if_id_pc` | 32 | IF/ID pipeline register PC |
| `debug_if_id_instruction` | 32 | IF/ID pipeline register instruction |
| `debug_id_rs1_data` | 32 | ID stage source register 1 data |
| `debug_id_rs2_data` | 32 | ID stage source register 2 data |
| `debug_id_imm` | 32 | ID stage sign-extended immediate |
| `debug_ex_pc` | 32 | EX stage program counter |
| `debug_ex_rd` | 5 | EX stage destination register index |
| `debug_ex_opcode` | 7 | EX stage opcode |
| `debug_mem_alu_result` | 32 | MEM stage ALU result |
| `debug_mem_store_data` | 32 | MEM stage store data |
| `debug_mem_rd` | 5 | MEM stage destination register index |
| `debug_wb_writeback_data` | 32 | WB stage writeback data |
| `debug_wb_writeback_rd` | 5 | WB stage destination register index |
| `debug_wb_writeback_enable` | 1 | WB stage register write enable |
| `debug_control_stall` | 1 | Hazard detection stall signal |
| `debug_redirect` | 1 | Branch/jump redirect signal |
| `debug_pc_sel` | 2 | PC select (0=PC+4, 1=branch, 2=JAL, 3=JALR) |
| `debug_reg_data` | 32 | Register file debug read data |
| `debug_dmem_data` | 32 | Data memory debug read data |

### Internal Operation

1. Instantiates `pipeline_cpu` with the same parameter values.
2. Re-exports every internal pipeline register as a top-level `assign` output.
3. `debug_reg_data` reads directly from `cpu.decode_unit.register_file.registers[debug_reg_addr]`.
4. `debug_dmem_data` reads directly from `cpu.memory_unit.data_mem.memory[debug_dmem_addr[11:2]]`.

### Related Modules
- `pipeline_cpu` — the actual five-stage processor core (instantiated here)
- `simulation_engine.cpp` — C++ wrapper that reads these debug outputs

---

## 2. main.cpp — C++ Command Loop Entry Point

**File**: `hardware/sim/main.cpp`
**Position**: Entry point of the persistent simulator executable.

### Purpose
Creates a single `SimulationEngine` instance and enters a command loop: read
JSON-lines from stdin, dispatch to engine methods, write JSON responses to
stdout. Diagnostics ("RISC-V simulation engine ready.", "shutting down.") go
to stderr.

### Commands Dispatched

| Command | Handler | Parameters |
|---------|---------|------------|
| `status` | `engine->getStatus()` | none |
| `load_program` | `engine->loadProgram()` | `program_file` (string) |
| `reset` | `engine->reset()` | none |
| `step` | `engine->step()` | none |
| `run_cycles` | `engine->runCycles()` | `cycles` (int) |
| `run` | `engine->run()` | `max_cycles` (int, optional, default 100) |
| `read_registers` | `engine->readRegisters()` | none |
| `read_memory` | `engine->readMemory()` | `address`, `words` (unsigned int) |
| `get_pipeline_state` | `engine->getPipelineState()` | none |
| `start_trace` | `engine->startTrace()` | `filename` (string, optional) |
| `stop_trace` | `engine->stopTrace()` | none |
| `get_trace_status` | `engine->getTraceStatus()` | none |
| `quit` | `break` loop | none |

### Unknown Command Handling
Returns `{"status": "error", "command": "<cmd>", "error": "unknown command"}`.

### Related Files
- `simulation_engine.hpp/cpp` — engine implementation
- `protocol.hpp/cpp` — JSON request/response serialization

---

## 3. protocol.hpp / protocol.cpp — JSON-Lines Protocol

**Files**: `hardware/sim/protocol.hpp`, `hardware/sim/protocol.cpp`
**Position**: Serialization layer between `main.cpp` and `simulation_engine.cpp`.

### Purpose
Defines `Request` and `Response` C++ structs with nlohmann/json serialization
(`to_json`/`from_json`), plus I/O helpers for reading one JSON object per line
from stdin and writing one JSON object per line to stdout.

### Request Struct

| Field | Type | Optional | Description |
|-------|------|----------|-------------|
| `command` | `std::string` | No | Command name |
| `program_file` | `std::string` | Yes | Program file path (load_program) |
| `filename` | `std::string` | Yes | Trace file name (start_trace) |
| `cycles` | `int` | Yes | Cycle count (run_cycles) |
| `max_cycles` | `int` | Yes | Max cycles (run) |
| `address` | `unsigned int` | Yes | Memory byte address (read_memory) |
| `words` | `unsigned int` | Yes | Word count (read_memory) |

### Response Struct

| Field | Type | Optional | Description |
|-------|------|----------|-------------|
| `status` | `std::string` | No | "ok" or "error" |
| `command` | `std::string` | No | Echo of request command |
| `data` | `json` | Yes | Command-specific payload |
| `error` | `std::string` | Yes | Error message (when status=error) |

### Functions
- `read_request()` → `std::optional<Request>` — reads one line from stdin, parses JSON. Returns `nullopt` on EOF or parse error (parse errors logged to stderr).
- `write_response(const Response&)` — serializes to JSON, writes to stdout, flushes.
- `send_error(command, message)` — convenience for error responses.
- `send_ok(command, data)` — convenience for ok responses with optional data.

### Protocol Flow
```
Frontend (FastAPI) ──JSON line──► wsl.exe ──stdin──► main.cpp ──► read_request()
                                          │
                                          │ JSON line
                                          ▼
                                    SimulationEngine methods
                                          │
                                          │ JSON line
                                          ▼
                                    write_response() ──stdout──► wsl.exe ──► FastAPI
```

---

## 4. simulation_engine.hpp / simulation_engine.cpp — C++ Simulation Engine

**Files**: `hardware/sim/simulation_engine.hpp`, `hardware/sim/simulation_engine.cpp`
**Position**: Wraps the Verilator-generated `Vriscv_sim_top` model.

### Purpose
Persistent C++ class that manages the Verilator simulation lifecycle: clock
driving, reset sequencing, program loading (model reconstruction), VCD tracing,
and all state inspection methods called by `main.cpp`.

### Class Members

| Member | Type | Description |
|--------|------|-------------|
| `context_` | `unique_ptr<VerilatedContext>` | Verilator context |
| `top_` | `unique_ptr<Vriscv_sim_top>` | Verilated top module |
| `trace_` | `unique_ptr<VerilatedVcdC>` | VCD trace writer |
| `context_args_` | `vector<string>` | Command-line args for `commandArgs` |
| `program_file_` | `string` | Currently loaded program path |
| `trace_file_` | `string` | Currently active trace file name |
| `trace_enabled_` | `bool` | Whether VCD tracing is active |
| `program_loaded_` | `bool` | Whether a program is loaded |
| `reset_applied_` | `bool` | Whether reset has been applied |
| `error_state_` | `bool` | Whether an error has occurred |
| `error_message_` | `string` | Last error message |
| `cycle_count_` | `int` | Total cycles executed |

### Public Methods

| Method | Description |
|--------|-------------|
| `loadProgram(program_file)` | Reconstructs model with `+program=` plusarg, applies initial clock edges |
| `reset()` | Applies reset sequence (2 cycles rst_n=0, 1 cycle rst_n=1) |
| `step()` | Advances exactly 1 clock cycle, returns pipeline state |
| `runCycles(cycles)` | Advances exactly N clock cycles |
| `run(max_cycles)` | Runs up to max_cycles (returns "max_cycles_reached") |
| `readRegisters()` | Reads all 32 GPRs via debug port |
| `readMemory(address, words)` | Reads N data-memory words (bounded to 1024 words) |
| `getPipelineState()` | Reads all debug outputs into a state dict |
| `getStatus()` | Returns engine status (connected, cycle count, etc.) |
| `startTrace(filename)` | Opens VCD trace file |
| `stopTrace()` | Closes VCD trace file |
| `getTraceStatus()` | Returns trace enabled state and filename |

### Private Methods

| Method | Description |
|--------|-------------|
| `clockCycle()` | Drive clk=0, eval, dump; clk=1, eval, dump; increment cycle count |
| `applyResetSequence()` | Assert rst_n for 2 cycles, release, 1 more cycle |
| `evalAndDump()` | `top_->eval()`, VCD dump if tracing, `timeInc(5)` |
| `reconstructModel(program_file)` | Destroy and recreate Verilator model with new program plusarg |

### Key Design Notes
- **Model reconstruction on load**: `$readmemh` initial blocks only run at Verilator model construction, so `loadProgram` destroys and recreates the `Vriscv_sim_top` instance.
- **Time increment**: `context_->timeInc(5)` after each eval, giving 10 time units per full clock cycle.
- **Trace depth**: Verilator tracing uses depth 99 (all hierarchy levels).

### Related Files
- `main.cpp` — command dispatcher
- `protocol.hpp/cpp` — JSON serialization
- `Vriscv_sim_top.h` — Verilator-generated header (in build directory)

---

## 5. Files NOT in Repository

The following pipeline stage modules are part of the Verilator build environment
and their SystemVerilog source is not tracked in this repository:

- `pipeline_cpu.sv` — five-stage processor core
- Individual stage modules: IF, ID, EX, MEM, WB
- Hazard detection unit, forwarding unit, control unit, ALU, register file,
  instruction memory, data memory, PC, immediates generator, muxes

These modules' interfaces are observable through `riscv_sim_top`'s debug outputs
and are exercised by the test executables and waveforms organized in
`artifacts/simulation/executables/` and `artifacts/waveforms/` (e.g., `fetch_sim`, `decode_sim`, `execute_sim`,
`memory_sim`, `writeback_sim`, `forwarding_sim`, `hazard_sim`,
`control_sim`, `regfile_sim`, etc.).
