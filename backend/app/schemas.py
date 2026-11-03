
from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any


class HealthResponse(BaseModel):
    status: str
    service: str


class SimulatorStatus(BaseModel):
    connected: bool
    engine: str
    message: str


class ArchitectureResponse(BaseModel):
    name: str
    isa: str
    xlen: int
    pipeline_stages: List[str]
    branch_prediction: str
    branch_resolution: str


# ------------------------------------------------------------------
# Simulation command / response models
# ------------------------------------------------------------------


class SimulatorStatusResponse(BaseModel):
    connected: bool
    engine: str
    message: str
    model_initialized: bool
    program_loaded: bool
    program_file: Optional[str]
    reset_applied: bool
    cycle_count: int
    trace_enabled: bool
    error: bool
    error_message: Optional[str] = None


class LoadProgramRequest(BaseModel):
    program_file: str = Field(
        default="program.hex",
        description="Name of the .hex program file in hardware/sim/",
    )

    @validator("program_file")
    def validate_program_file(cls, v):
        # Restrict to safe filenames within the sim directory.
        # No path separators, no absolute paths, no .. components.
        if not v or "/" in v or "\\" in v or ".." in v:
            raise ValueError(
                "program_file must be a simple filename without path separators"
            )
        if not v.endswith(".hex"):
            raise ValueError("program_file must have a .hex extension")
        return v


class LoadProgramResponse(BaseModel):
    status: str
    command: str
    program_file: str
    cycles: int
    program_loaded: bool


class ResetResponse(BaseModel):
    status: str
    command: str
    cycles: int
    reset_applied: bool
    pipeline_state: Dict[str, Any]
    registers: Optional[List[Dict[str, Any]]] = None
    memory: Optional[List[Dict[str, Any]]] = None


class StepRequest(BaseModel):
    pass


class StepResponse(BaseModel):
    status: str
    command: str
    cycles: int
    pipeline_state: Dict[str, Any]
    registers: Optional[List[Dict[str, Any]]] = None
    memory: Optional[List[Dict[str, Any]]] = None


class RunCyclesRequest(BaseModel):
    cycles: int = Field(ge=1, le=10000, description="Number of clock cycles to run")

    @validator("cycles")
    def validate_cycles(cls, v):
        if v < 1 or v > 10000:
            raise ValueError("cycles must be between 1 and 10000")
        return v


class RunCyclesResponse(BaseModel):
    status: str
    command: str
    cycles: int
    cycles_executed: int
    pipeline_state: Dict[str, Any]
    registers: Optional[List[Dict[str, Any]]] = None
    memory: Optional[List[Dict[str, Any]]] = None


class RunRequest(BaseModel):
    max_cycles: int = Field(
        default=100, ge=1, le=100000, description="Maximum clock cycles to run"
    )


class RunResponse(BaseModel):
    status: str
    command: str
    cycles: int
    termination_reason: str
    max_cycles: int
    pipeline_state: Dict[str, Any]
    registers: Optional[List[Dict[str, Any]]] = None
    memory: Optional[List[Dict[str, Any]]] = None


class RegisterInfo(BaseModel):
    name: str = Field(alias="register")
    index: int
    val: int = Field(alias="value")

    class Config:
        populate_by_name = True

# ------------------------------------------------------------------
# Assembler models
# ------------------------------------------------------------------

class AssembleRequest(BaseModel):
    source: str = Field(..., description="RISC-V assembly source code")

class AssembleResponse(BaseModel):
    success: bool
    instruction_count: int = 0
    instructions: List[Dict[str, Any]] = []
    machine_code: List[str] = []
    errors: List[Dict[str, Any]] = []

class AssembleAndLoadRequest(BaseModel):
    source: str = Field(..., description="RISC-V assembly source code")
    program_file: str = Field(
        default="assembled.hex",
        description="Filename for the generated .hex file",
    )

    @validator("program_file")
    def validate_program_file(cls, v):
        if not v or "/" in v or "\\" in v or ".." in v:
            raise ValueError("program_file must be a simple filename")
        if not v.endswith(".hex"):
            raise ValueError("program_file must have a .hex extension")
        return v

class AssembleAndLoadResponse(BaseModel):
    success: bool
    instruction_count: int = 0
    instructions: List[Dict[str, Any]] = []
    machine_code: List[str] = []
    errors: List[Dict[str, Any]] = []
    load_result: Optional[Dict[str, Any]] = None
    value: int

    class Config:
        populate_by_name = True


class ReadRegistersResponse(BaseModel):
    status: str
    command: str
    registers: List[RegisterInfo]
    cycles: int


class ReadMemoryRequest(BaseModel):
    address: int = Field(ge=0, description="Byte address (must be word-aligned)")
    words: int = Field(ge=1, le=256, description="Number of 32-bit words to read")

    @validator("address")
    def validate_address(cls, v):
        if v % 4 != 0:
            raise ValueError("address must be word-aligned (multiple of 4)")
        return v


class MemoryEntry(BaseModel):
    address: int
    word_index: int
    value: int


class ReadMemoryResponse(BaseModel):
    status: str
    command: str
    memory: List[MemoryEntry]
    cycles: int


class PipelineStateResponse(BaseModel):
    status: str
    command: str
    state: Dict[str, Any]


class ErrorResponse(BaseModel):
    status: str
    command: str
    error: str


# ------------------------------------------------------------------
# Waveform / VCD models
# ------------------------------------------------------------------


class TraceRequest(BaseModel):
    filename: str = Field(
        default="pipeline.vcd",
        description="Trace file name (saved inside hardware/sim/)",
    )

    @validator("filename")
    def validate_filename(cls, v):
        if not v or "/" in v or "\\" in v or ".." in v:
            raise ValueError("filename must be a simple name without path separators")
        if not v.endswith(".vcd"):
            raise ValueError("filename must have a .vcd extension")
        return v


class TraceResponse(BaseModel):
    status: str
    command: str
    trace_file: Optional[str] = None
    trace_enabled: bool = False


class TraceStatusResponse(BaseModel):
    status: str
    command: str
    trace_enabled: bool = False
    trace_file: Optional[str] = None


class VcdResponse(BaseModel):
    status: str
    filename: str
    size_bytes: int
    content: str
