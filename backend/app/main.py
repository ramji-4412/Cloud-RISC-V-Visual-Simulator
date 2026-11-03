
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .schemas import (
    HealthResponse,
    SimulatorStatus,
    ArchitectureResponse,
    SimulatorStatusResponse,
    LoadProgramRequest,
    LoadProgramResponse,
    ResetResponse,
    StepResponse,
    RunCyclesRequest,
    RunCyclesResponse,
    RunRequest,
    RunResponse,
    ReadRegistersResponse,
    ReadMemoryRequest,
    ReadMemoryResponse,
    PipelineStateResponse,
    AssembleRequest,
    AssembleResponse,
    AssembleAndLoadRequest,
    AssembleAndLoadResponse,
    TraceRequest,
    TraceResponse,
    TraceStatusResponse,
    VcdResponse,
)

from .simulator import simulator_manager


app = FastAPI(
    title="Cloud RISC-V Visual Simulator API",
    description="Backend API for the RV32I pipeline simulator.",
    version="1.0.0"
)


# Allow the React development server to communicate with FastAPI.
app.add_middleware(
    CORSMiddleware,

allow_origins=[
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "message": "Cloud RISC-V Visual Simulator API",
        "documentation": "/docs"
    }


@app.get("/api/health", response_model=HealthResponse)
def health():
    return {
        "status": "healthy",
        "service": "RISC-V Backend"
    }


@app.get("/api/status", response_model=SimulatorStatus)
def simulator_status():
    return simulator_manager.get_status()


@app.get(
    "/api/architecture",
    response_model=ArchitectureResponse
)
def architecture():
    return {
        "name": "Five-Stage RISC-V Pipeline",
        "isa": "RV32I",
        "xlen": 32,
        "pipeline_stages": [
            "IF",
            "ID",
            "EX",
            "MEM",
            "WB"
        ],
        "branch_prediction": "Predict Not Taken",
        "branch_resolution": "EX Stage"
    }


# ------------------------------------------------------------------
# Simulator control endpoints
# ------------------------------------------------------------------


@app.get(
    "/api/simulator/status",
    response_model=SimulatorStatusResponse,
)
def sim_status():
    return simulator_manager.get_status()


@app.post("/api/simulator/start")
def sim_start():
    return simulator_manager.start()


@app.post("/api/simulator/stop")
def sim_stop():
    return simulator_manager.stop()


@app.post("/api/simulator/restart")
def sim_restart():
    return simulator_manager.restart()


@app.post(
    "/api/simulator/load",
    response_model=LoadProgramResponse,
)
def sim_load(request: LoadProgramRequest):
    return simulator_manager.load_program(request.program_file)


@app.post(
    "/api/simulator/reset",
    response_model=ResetResponse,
)
def sim_reset():
    return simulator_manager.reset()


@app.post(
    "/api/simulator/step",
    response_model=StepResponse,
)
def sim_step():
    return simulator_manager.step()


@app.post(
    "/api/simulator/run-cycles",
    response_model=RunCyclesResponse,
)
def sim_run_cycles(request: RunCyclesRequest):
    return simulator_manager.run_cycles(request.cycles)



# ------------------------------------------------------------------
# Assembler endpoints
# ------------------------------------------------------------------

from .assembler import assemble
import os

ASSEMBLER_OUTPUT_DIR = "/mnt/d/RISC-V_Project/hardware/sim"


@app.post("/api/assembler/assemble", response_model=AssembleResponse)
def assemble_endpoint(request: AssembleRequest):
    result = assemble(request.source)
    return result


@app.post("/api/assembler/assemble-and-load")
def assemble_and_load_endpoint(request: AssembleAndLoadRequest):
    result = assemble(request.source)

    if not result["success"]:
        return {**result, "load_result": None}

    # Write machine code to a controlled file in the sim directory.
    program_file = request.program_file
    # Validate filename (already validated by Pydantic, but double-check).
    if "/" in program_file or "\\" in program_file or ".." in program_file:
        return {
            "success": False,
            "instruction_count": 0,
            "instructions": [],
            "machine_code": [],
            "errors": [{"line": 0, "category": "SECURITY", "message": "Invalid filename", "source": ""}],
            "load_result": None,
        }

    wsl_path = f"{ASSEMBLER_OUTPUT_DIR}/{program_file}"
    win_path = f"D:\\\\RISC-V_Project\\\\hardware\\\\sim\\\\{program_file}"

    # Write the hex file via WSL to ensure correct line endings.
    hex_content = "\n".join(result["machine_code"]) + "\n"
    try:
        import subprocess
        proc = subprocess.run(
            ["wsl.exe", "-d", "Ubuntu", "--", "tee", wsl_path],
            input=hex_content,
            capture_output=True,
            text=True,
            timeout=10,
        )
        if proc.returncode != 0:
            raise RuntimeError(f"Failed to write file: {proc.stderr}")
    except Exception as exc:
        return {
            "success": False,
            "instruction_count": result["instruction_count"],
            "instructions": result["instructions"],
            "machine_code": result["machine_code"],
            "errors": [{"line": 0, "category": "IO_ERROR", "message": str(exc), "source": ""}],
            "load_result": None,
        }

    # Load through existing SimulatorManager.
    load_result = simulator_manager.load_program(program_file)

    return {
        **result,
        "load_result": load_result,
    }
@app.post(
    "/api/simulator/run",
    response_model=RunResponse,
)
def sim_run(request: RunRequest):
    return simulator_manager.run(request.max_cycles)


@app.get(
    "/api/simulator/registers",
    response_model=ReadRegistersResponse,
)
def sim_registers():
    return simulator_manager.read_registers()


@app.post(
    "/api/simulator/memory",
    response_model=ReadMemoryResponse,
)
def sim_memory(request: ReadMemoryRequest):
    return simulator_manager.read_memory(request.address, request.words)


@app.get(
    "/api/simulator/pipeline",
    response_model=PipelineStateResponse,
)
def sim_pipeline():
    return simulator_manager.get_pipeline_state()


# ------------------------------------------------------------------
# Waveform / VCD tracing endpoints
# ------------------------------------------------------------------


@app.post(
    "/api/trace/start",
    response_model=TraceResponse,
)
def trace_start(request: TraceRequest):
    return simulator_manager.start_trace(request.filename)


@app.post(
    "/api/trace/stop",
    response_model=TraceResponse,
)
def trace_stop():
    return simulator_manager.stop_trace()


@app.get(
    "/api/trace/status",
    response_model=TraceStatusResponse,
)
def trace_status():
    return simulator_manager.get_trace_status()


@app.get(
    "/api/trace/file",
    response_model=VcdResponse,
)
def trace_file(filename: str = "pipeline.vcd"):
    """Return the raw VCD file contents for the named trace file.

    The file is read from the WSL simulation directory and streamed
    back as plain text so the frontend can parse it client-side.
    """
    if not filename or "/" in filename or "\\" in filename or ".." in filename:
        return {
            "status": "error",
            "filename": filename,
            "size_bytes": 0,
            "content": "",
            "error": "Invalid filename",
        }

    wsl_path = f"/home/pc/riscv-verilator-build/{filename}"
    try:
        import subprocess
        proc = subprocess.run(
            ["wsl.exe", "-d", simulator_manager.WSL_DISTRO, "--", "cat", wsl_path],
            capture_output=True,
            text=True,
            timeout=10,
        )
        if proc.returncode != 0:
            return {
                "status": "error",
                "filename": filename,
                "size_bytes": 0,
                "content": "",
                "error": f"Trace file not found: {filename}",
            }
        content = proc.stdout
        return {
            "status": "ok",
            "filename": filename,
            "size_bytes": len(content.encode("utf-8")),
            "content": content,
        }
    except Exception as exc:
        return {
            "status": "error",
            "filename": filename,
            "size_bytes": 0,
            "content": "",
            "error": str(exc),
        }
