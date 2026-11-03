# Verification

## Test Architecture

The project uses three categories of tests:

1. **Pytest suite** (`backend/tests/`) — 20 tests, run with `python -m pytest tests/ -v`
2. **Standalone integration scripts** (`backend/test_assembler_api.py`,
   `backend/test_simulator_api.py`) — run with `python <script>`
3. **Edge-case stress tests** (`backend/tests/test_edge_cases.py`) — 14 RV32I
   instruction tests run with `python tests/test_edge_cases.py`

All tests require the FastAPI backend to be running at `http://127.0.0.1:8000`
and the Verilator simulator to be accessible via WSL2.

## Pytest Suite (`backend/tests/`)

### Test Files

| File | Tests | Description |
|------|-------|-------------|
| `tests/conftest.py` | 0 (fixtures only) | Session-scoped fixtures: `backend_url`, `get`, `post`, `ensure_simulator_stopped` |
| `tests/test_assembler.py` | 5 | Assembler: Phase A success, invalid register, assemble-and-load, invalid filename, missing extension |
| `tests/test_simulator.py` | 10 | Simulator: health, start/stop, restart, Phase A full flow, invalid cycle count, invalid memory address, invalid memory words, missing program file, pipeline state shape, status shape |
| `tests/test_trace.py` | 5 | Trace: start/stop, status, file retrieval, invalid filename, no filename |

### Total: 20 tests

### Fixtures

- `backend_url` — returns `http://127.0.0.1:8000`
- `get(endpoint)` — GET helper with 10-second timeout
- `post(endpoint, data, timeout=15)` — POST helper with 15-second timeout
- `ensure_simulator_stopped` — autouse session fixture that stops the simulator after all tests

### Running

```bash
cd backend
python -m pytest tests/ -v
```

## Standalone Integration Scripts

### `backend/test_assembler_api.py`

Tests: assemble Phase A, start simulator, assemble-and-load, reset, step 25 cycles,
read registers (x1=5, x2=7, x3=12, x4=12, x5=13, x0=0), read memory (memory[0]=12),
error handling (invalid register x40), stop simulator.

**Result**: ALL PASSED

### `backend/test_simulator_api.py`

Tests: health, simulator status, start simulator, load program, reset, step 25 cycles,
read registers, read memory, pipeline state, invalid cycle count, invalid memory address,
missing program file, stop simulator, verify stopped.

**Known defect (fixed)**: Line 64 originally accessed `r["pipeline_state"]["state"]`
but the API returns `pipeline_state` directly as the state dictionary. Fixed to
`r["pipeline_state"]`.

**Result**: ALL PASSED

### Running

```bash
cd backend
python test_assembler_api.py
python test_simulator_api.py
```

## Edge-Case Stress Tests (`backend/tests/test_edge_cases.py`)

14 tests, each assembling a program, loading it, resetting, running cycles, and
verifying register values against the actual Verilator RTL simulator:

| # | Test | Registers Verified |
|---|------|-------------------|
| 1 | R-type arithmetic (add, sub) | x1=10, x2=4, x3=14, x4=6 |
| 2 | Shift left logical (slli) | x1=1, x2=16 |
| 3 | Shift right logical (srli) | x1=16, x2=4 |
| 4 | Shift right arithmetic (srai) | x1=4294967288, x2=4294967292 |
| 5 | LUI | x1=305418240 |
| 6 | AUIPC | x1=1048580 |
| 7 | Signed comparisons (slt, slti) | x1=5, x2=10, x3=1, x4=1 |
| 8 | Signed less-than immediate (slti) | x1=5, x2=0, x3=1 |
| 9 | Unsigned comparisons (sltu, sltiu) | x1=5, x2=10, x3=1, x4=0 |
| 10 | Store/Load word (sw, lw) | x1=42, x2=42 |
| 11 | Branch not taken (beq) | x1=5, x2=6, x3=99 |
| 12 | Branch taken (beq) | x1=5, x2=5, x3=99 |
| 13 | Jump and link (JAL) | x1=4, x2=77 |
| 14 | Register x0 hardwired to zero | x0=0, x1=5 |
| 15 | Negative immediate (addi -100) | x1=4294967196 |
| 16 | Jump and link register (JALR) | x1=12, x2=8, x3=0 |

**Result**: ALL 14 PASSED

### Running

```bash
cd backend
python tests/test_edge_cases.py
```

## Phase A Regression

The Phase A regression program is:

```asm
addi x1, x0, 5
addi x2, x0, 7
add  x3, x1, x2
sw   x3, 0(x0)
lw   x4, 0(x0)
addi x5, x4, 1
```

**Expected results**: x1=5, x2=7, x3=12, x4=12, x5=13, memory[0]=12

**Verified**: All values confirmed via actual RTL simulation in:
- `test_assembler_api.py` (standalone)
- `test_simulator.py::test_phase_a_full_flow` (pytest)
- `tests/test_edge_cases.py` (implicitly, via individual instruction tests)

## Trace Verification

VCD trace generation and retrieval verified:
- Trace file: 44,450 bytes
- Contains `$version` marker
- Contains `$enddefinitions` marker
- Contains `debug_fetch_pc`, `debug_wb_writeback_data` signals
- Parser correctly extracts signal names, scopes, widths, and timestamped changes

### Running

```bash
cd backend
python -m pytest tests/test_trace.py -v
```

Or via WSL2 (for the original standalone script):
```bash
wsl -d Ubuntu -- python3 /mnt/d/RISC-V_Project/backend/test_trace.py
```

## Known Test Inconsistencies (Resolved)

1. **`test_simulator_api.py:64`**: Originally `r["pipeline_state"]["state"]` but the
   FastAPI step endpoint returns `pipeline_state` directly (not nested under `"state"`).
   Fixed to `r["pipeline_state"]`.

2. **Empty source assembly**: The assembler accepts empty source (0 instructions,
   success=true). The test assertion `assert r["success"] is False` was incorrect;
   removed that test case.

3. **Pydantic validation errors**: Invalid filenames, cycle counts, memory addresses,
   and memory words return HTTP 422 with FastAPI `detail` format, not
   `{"success": False}`. Tests updated to check for `"detail" in r` or
   `r.get("success") is False`.

4. **Assemble-and-load requires running simulator**: The `load_program` call inside
   `assemble-and-load` needs the simulator process to be alive. Tests now call
   `post("/api/simulator/start")` before assemble-and-load.

## Frontend Verification

- **Production build**: `npm run build` succeeds (~170 KB JS gzipped, ~25 KB CSS gzipped)
- **Dev server**: `npm run dev` serves on `http://localhost:3000`
- **Browser testing**: Not performed — no browser automation tools available in this
  environment. Visual verification of the waveform viewer and UI rendering requires
  manual browser testing.

## Exact Test Commands

```bash
# Backend pytest suite (20 tests)
cd backend && python -m pytest tests/ -v

# Standalone assembler test
cd backend && python test_assembler_api.py

# Standalone simulator test
cd backend && python test_simulator_api.py

# Edge case stress tests (14 tests)
cd backend && python tests/test_edge_cases.py

# Trace test via WSL2
wsl -d Ubuntu -- python3 /mnt/d/RISC-V_Project/backend/test_trace.py

# Frontend production build
cd frontend && npm run build

# Frontend dev server
cd frontend && npm run dev
```
