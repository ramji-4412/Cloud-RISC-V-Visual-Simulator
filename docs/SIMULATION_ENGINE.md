# Simulation Engine Reference

## Overview

The simulation engine is a persistent C++ process that wraps a Verilator-generated
SystemVerilog RV32I CPU model. It runs inside WSL2 Ubuntu and communicates with the
FastAPI backend via JSON-lines on stdin/stdout. The engine remains alive across
multiple commands; program loading reconstructs the Verilator model (because
`$readmemh` initial blocks only execute at construction time).

## Files

| File | Purpose |
|------|---------|
| `hardware/sim/main.cpp` | Command loop entry point; reads JSON from stdin, dispatches, writes JSON to stdout |
| `hardware/sim/simulation_engine.hpp` | `SimulationEngine` class declaration |
| `hardware/sim/simulation_engine.cpp` | `SimulationEngine` implementation |
| `hardware/sim/protocol.hpp` | JSON `Request`/`Response` structs and serialization |
| `hardware/sim/protocol.cpp` | `read_request()`, `write_response()`, `send_ok()`, `send_error()` |
| `hardware/sim/riscv_sim_top.sv` | SystemVerilog top module with debug outputs |
| `backend/app/simulator.py` | Python `SimulatorManager` that launches and controls the C++ process |

## Build Process

The Verilator simulation executable is built externally (not in this repository):

```bash
# In WSL2 Ubuntu, from the hardware/sim directory or Verilator project:
verilator --cc --exe --build -j$(nproc) \
  --top-module riscv_sim_top \
  riscv_sim_top.sv \
  main.cpp simulation_engine.cpp protocol.cpp \
  -o Vriscv_sim_top
```

The resulting binary is expected at:
```
/home/pc/riscv-verilator-build/Vriscv_sim_top
```

This path is hardcoded in `simulation_engine.py` as `SIM_EXE`.

## Process Lifecycle

### Start

The FastAPI backend launches the simulator via `wsl.exe`:

```bash
wsl.exe -d Ubuntu -- /home/pc/riscv-verilator-build/Vriscv_sim_top
```

The C++ `main()` function:
1. Creates a `SimulationEngine` instance
2. Prints "RISC-V simulation engine ready." to stderr
3. Enters the command loop (read JSON line → dispatch → write JSON line)

The backend verifies the process is responding by sending a `status` command
before reporting success to the frontend.

### Program Loading

`load_program(program_file)`:
1. Reconstructs the Verilator model (destroys and recreates `Vriscv_sim_top`)
2. Passes `+program=<path>` as a Verilator plusarg so `$readmemh` initializes
   instruction memory from the `.hex` file
3. Applies initial clock edges (clk=0 eval, clk=1 eval)
4. Resets cycle count to 0, sets `program_loaded_ = true`

### Reset

`reset()`:
1. Asserts `rst_n = 0` for 2 clock cycles
2. Releases `rst_n = 1` for 1 clock cycle
3. Sets `reset_applied_ = true`
4. Returns post-reset pipeline state

### Execution

| Command | RTL Action | Returns |
|---------|-----------|---------|
| `step` | One clock cycle (clk=0 eval/dump, clk=1 eval/dump) | Pipeline state after cycle |
| `run_cycles N` | N clock cycles | Final pipeline state, cycles_executed |
| `run N` | Up to N cycles | Termination reason: "max_cycles_reached" |

Each `clockCycle()`:
1. `top_->clk = 0; top_->eval();` (falling edge)
2. `top_->clk = 1; top_->eval();` (rising edge)
3. `cycle_count_++`
4. VCD dump if tracing is enabled (`trace_->dump(context_->time())`)
5. `context_->timeInc(5)` (5 time units per half-cycle, 10 per full cycle)

### State Inspection

- **`readRegisters()`**: Iterates x0–x31, sets `debug_reg_addr`, calls `eval()`,
  reads `debug_reg_data`. Returns `[{register, index, value}]`.
- **`readMemory(address, words)`**: Reads N words starting at byte address.
  Bounded to 1024 words total (4 KiB data memory). Address must be word-aligned.
- **`getPipelineState()`**: Reads all `debug_*` outputs from `riscv_sim_top`
  into a flat state dictionary.

### VCD Tracing

- **`startTrace(filename)`**: Calls `context_->traceEverOn(true)`, creates
  `VerilatedVcdC`, calls `top_->trace(trace_.get(), 99)` (depth 99),
  `trace_->open(filename)`. File is written inside the WSL filesystem.
- **`stopTrace()`**: `trace_->close()`, resets trace pointer.
- **`getTraceStatus()`**: Returns `trace_enabled` and `trace_file`.

VCD files are written to `/home/pc/riscv-verilator-build/<filename>` inside WSL.

### Error Handling

All engine methods wrap their logic in try/catch. On exception:
- `error_state_` is set to `true`
- `error_message_` is set to the exception text
- Returns `{"status": "error", "command": "<cmd>", "error": "<message>"}`

Specific preconditions:
- `step()`, `run_cycles()`, `run()`, `readRegisters()`, `readMemory()` require
  `program_loaded_ == true`, otherwise return `"no program loaded"` error.
- `run_cycles()` requires `cycles > 0`, otherwise returns `"cycle count must be positive"`.
- Memory start address must be < 1024 words, otherwise `"start address out of range"`.

## Backend Integration

### SimulatorManager (`backend/app/simulator.py`)

**Process launch**:
```python
subprocess.Popen(
    ["wsl.exe", "-d", "Ubuntu", "--", self.SIM_EXE],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    bufsize=1,
)
```

**Thread safety**: A `threading.Lock` serializes all stdin/stdout operations,
preventing concurrent FastAPI requests from interleaving commands.

**Stderr draining**: A background daemon thread reads stderr line-by-line to
prevent pipe buffer fill from blocking the simulator process.

**Command sending** (`_send_raw`):
1. Serialize command to JSON, write to stdin with newline, flush
2. Read one response line from stdout
3. Parse JSON; if parse fails, skip up to 10 non-JSON lines and retry
4. Return parsed response dict

### Mapped Endpoints

| SimulatorManager method | FastAPI endpoint |
|------------------------|------------------|
| `get_status()` | `GET /api/simulator/status` |
| `start()` | `POST /api/simulator/start` |
| `stop()` | `POST /api/simulator/stop` |
| `restart()` | `POST /api/simulator/restart` |
| `load_program(file)` | `POST /api/simulator/load` |
| `reset()` | `POST /api/simulator/reset` |
| `step()` | `POST /api/simulator/step` |
| `run_cycles(cycles)` | `POST /api/simulator/run-cycles` |
| `run(max_cycles)` | `POST /api/simulator/run` |
| `read_registers()` | `GET /api/simulator/registers` |
| `read_memory(addr, words)` | `POST /api/simulator/memory` |
| `get_pipeline_state()` | `GET /api/simulator/pipeline` |
| `start_trace(filename)` | `POST /api/trace/start` |
| `stop_trace()` | `POST /api/trace/stop` |
| `get_trace_status()` | `GET /api/trace/status` |

### Trace File Retrieval

`GET /api/trace/file?filename=...` reads the VCD file from WSL:
```bash
wsl.exe -d Ubuntu -- cat /home/pc/riscv-verilator-build/<filename>
```
Returns the raw VCD text content to the frontend for client-side parsing.

### Shutdown

`stop()`:
1. Sends `{"command":"quit"}` to stdin
2. Waits up to 5 seconds for process exit
3. Falls back to `terminate()` then `kill()` if needed
4. Sets `_proc = None`

## Verilator Debug Interface

The engine reads these signals from `Vriscv_sim_top` (Verilator-generated
header exposes them as public members):

| Signal | Type | Used by |
|--------|------|---------|
| `debug_fetch_pc` | uint32 | `getPipelineState()` |
| `debug_fetch_instruction` | uint32 | `getPipelineState()` |
| `debug_if_id_pc` | uint32 | `getPipelineState()` |
| `debug_if_id_instruction` | uint32 | `getPipelineState()` |
| `debug_id_rs1_data` | uint32 | `getPipelineState()` |
| `debug_id_rs2_data` | uint32 | `getPipelineState()` |
| `debug_id_imm` | uint32 | `getPipelineState()` |
| `debug_ex_pc` | uint32 | `getPipelineState()` |
| `debug_ex_rd` | uint32 | `getPipelineState()` |
| `debug_ex_opcode` | uint32 | `getPipelineState()` |
| `debug_mem_alu_result` | uint32 | `getPipelineState()` |
| `debug_mem_store_data` | uint32 | `getPipelineState()` |
| `debug_mem_rd` | uint32 | `getPipelineState()` |
| `debug_wb_writeback_data` | uint32 | `getPipelineState()` |
| `debug_wb_writeback_rd` | uint32 | `getPipelineState()` |
| `debug_wb_writeback_enable` | bool | `getPipelineState()` |
| `debug_control_stall` | bool | `getPipelineState()` |
| `debug_redirect` | bool | `getPipelineState()` |
| `debug_pc_sel` | uint32 | `getPipelineState()` |
| `debug_reg_addr` | input uint32 | `readRegisters()` |
| `debug_reg_data` | output uint32 | `readRegisters()` |
| `debug_dmem_addr` | input uint32 | `readMemory()` |
| `debug_dmem_data` | output uint32 | `readMemory()` |
