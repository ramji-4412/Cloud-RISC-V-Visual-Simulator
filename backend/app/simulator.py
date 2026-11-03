
"""
Simulator Manager for the Cloud RISC-V Visual Simulator.

Manages the lifecycle of the persistent Verilator C++ simulation engine
running inside WSL2 Ubuntu. Communicates via JSON-lines over stdin/stdout.

Architecture:

    FastAPI (Windows)
        |
        v
    SimulatorManager (this module)
        |
        v
    subprocess.Popen(["wsl.exe", "-d", "Ubuntu", "--", <exe>])
        |
        v
    Persistent Verilator C++ Engine (Linux)
        |
        v
    SystemVerilog RV32I CPU (RTL)
"""

import json
import os
import platform
import subprocess
import threading
from typing import Any, Dict, Optional


class SimulatorManager:
    """
    Manages a single persistent Verilator simulation process.

    The manager starts one C++ process via wsl.exe and keeps it alive
    across HTTP requests. All commands are sent as JSON lines on stdin;
    responses are read as JSON lines on stdout.

    A threading lock ensures that concurrent FastAPI requests cannot
    interleave commands on the same stdin/stdout stream.
    """

    WSL_DISTRO = os.getenv("WSL_DISTRO", "Ubuntu")

    # Determine execution mode:
    # Explicit USE_WSL env var overrides OS detection; otherwise auto-detect Windows host.
    _env_wsl = os.getenv("USE_WSL")
    if _env_wsl is not None:
        USE_WSL = _env_wsl.lower() in ("1", "true", "yes")
    else:
        USE_WSL = (platform.system() == "Windows")

    if USE_WSL:
        SIM_EXE = os.getenv("SIM_EXE", "/home/pc/riscv-verilator-build/Vriscv_sim_top")
        SIM_DIR = os.getenv("SIM_DIR", "/mnt/d/RISC-V_Project/hardware/sim")
        TRACE_DIR = os.getenv("TRACE_DIR", "/home/pc/riscv-verilator-build")
    else:
        # Native Linux / Docker environment
        _base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
        _sim_dir = os.path.join(_base_dir, "hardware", "sim")
        _candidate_exes = [
            os.getenv("SIM_EXE", ""),
            "/app/build/Vriscv_sim_top",
            os.path.join(_base_dir, "build", "Vriscv_sim_top"),
            os.path.join(_sim_dir, "build", "Vriscv_sim_top"),
            "/home/pc/riscv-verilator-build/Vriscv_sim_top",
        ]
        _resolved_exe = next((p for p in _candidate_exes if p and os.path.isfile(p)), "/app/build/Vriscv_sim_top")
        SIM_EXE = os.getenv("SIM_EXE", _resolved_exe)
        SIM_DIR = os.getenv("SIM_DIR", _sim_dir if os.path.isdir(_sim_dir) else "/app/hardware/sim")
        TRACE_DIR = os.getenv("TRACE_DIR", os.path.dirname(SIM_EXE) if os.path.dirname(SIM_EXE) else "/app/build")

    def __init__(self):
        self._proc: Optional[subprocess.Popen] = None
        self._lock = threading.Lock()
        self._stderr_reader: Optional[threading.Thread] = None
        self._stderr_lines: list = []
        self._stderr_stop = False

    # ------------------------------------------------------------------
    # Process lifecycle
    # ------------------------------------------------------------------

    def start(self) -> Dict[str, Any]:
        """Start the persistent C++ simulation engine via wsl.exe."""
        with self._lock:
            if self._proc is not None and self._proc.poll() is None:
                return {
                    "connected": True,
                    "engine": "Verilator",
                    "message": "Simulator already running.",
                }

            try:
                cmd = (
                    ["wsl.exe", "-d", self.WSL_DISTRO, "--", self.SIM_EXE]
                    if self.USE_WSL
                    else [self.SIM_EXE]
                )
                self._proc = subprocess.Popen(
                    cmd,
                    stdin=subprocess.PIPE,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                    bufsize=1,
                )

                # Start a background thread to drain stderr so the pipe
                # never fills up and blocks the simulator process.
                self._stderr_stop = False
                self._stderr_reader = threading.Thread(
                    target=self._drain_stderr, daemon=True
                )
                self._stderr_reader.start()

                # Verify the process is alive and responding.
                status = self._send_raw({"command": "status"})
                if status.get("status") != "ok":
                    self.stop()
                    return {
                        "connected": False,
                        "engine": "Verilator",
                        "message": f"Simulator did not respond: {status}",
                    }

                return {
                    "connected": True,
                    "engine": "Verilator",
                    "message": "Simulator started and responding.",
                }

            except Exception as exc:
                self._proc = None
                return {
                    "connected": False,
                    "engine": "Verilator",
                    "message": f"Failed to start simulator: {exc}",
                }

    def stop(self) -> Dict[str, Any]:
        """Stop the simulation process cleanly."""
        with self._lock:
            self._stderr_stop = True

            if self._proc is not None:
                try:
                    # Send quit command first for clean shutdown.
                    self._proc.stdin.write("{\"command\":\"quit\"}\n")
                    self._proc.stdin.flush()
                    self._proc.wait(timeout=5)
                except Exception:
                    try:
                        self._proc.terminate()
                        self._proc.wait(timeout=5)
                    except Exception:
                        self._proc.kill()

                self._proc = None

            return {
                "connected": False,
                "engine": "Verilator",
                "message": "Simulator stopped.",
            }

    def restart(self) -> Dict[str, Any]:
        """Restart the simulation process."""
        self.stop()
        return self.start()

    def is_running(self) -> bool:
        """Return True if the C++ process is alive."""
        return self._proc is not None and self._proc.poll() is None

    # ------------------------------------------------------------------
    # Command protocol
    # ------------------------------------------------------------------

    def _drain_stderr(self):
        """Background reader for the simulator's stderr pipe."""
        while not self._stderr_stop and self._proc is not None:
            try:
                line = self._proc.stderr.readline()
                if line:
                    self._stderr_lines.append(line.rstrip("\n"))
                    # Keep only the last 100 lines.
                    if len(self._stderr_lines) > 100:
                        self._stderr_lines = self._stderr_lines[-100:]
                else:
                    break
            except Exception:
                break

    def _send_raw(self, command: Dict[str, Any]) -> Dict[str, Any]:
        """Send one JSON command and return the parsed JSON response.

        Raises RuntimeError if the process is not running or the
        response is invalid.
        """
        if self._proc is None or self._proc.poll() is not None:
            raise RuntimeError("Simulator process is not running")

        stdin = self._proc.stdin
        stdout = self._proc.stdout

        if stdin is None or stdout is None:
            raise RuntimeError("Simulator process pipes are not open")

        line = json.dumps(command)
        stdin.write(line + "\n")
        stdin.flush()

        response_line = stdout.readline()
        if not response_line:
            raise RuntimeError("Simulator process closed stdout")

        try:
            return json.loads(response_line)
        except json.JSONDecodeError:
            # Skip non-JSON diagnostic lines and try again.
            for _ in range(10):
                response_line = stdout.readline()
                if not response_line:
                    raise RuntimeError("Simulator process closed stdout")
                try:
                    return json.loads(response_line)
                except json.JSONDecodeError:
                    continue
            raise RuntimeError(f"Invalid JSON response: {response_line!r}")

    def get_status(self) -> Dict[str, Any]:
        """Return simulator status."""
        try:
            resp = self._send_raw({"command": "status"})
            if resp.get("status") != "ok":
                return {
                    "connected": self.is_running(),
                    "engine": "Verilator",
                    "message": resp.get("error", "Unknown error"),
                    "model_initialized": False,
                    "program_loaded": False,
                    "program_file": None,
                    "reset_applied": False,
                    "cycle_count": 0,
                    "trace_enabled": False,
                    "error": True,
                    "error_message": resp.get("error", "Unknown error"),
                }

            data = resp.get("data", {})
            return {
                "connected": True,
                "engine": "Verilator",
                "message": "Simulator running.",
                "model_initialized": data.get("model_initialized", False),
                "program_loaded": data.get("program_loaded", False),
                "program_file": data.get("program_file"),
                "reset_applied": data.get("reset_applied", False),
                "cycle_count": data.get("cycle_count", 0),
                "trace_enabled": data.get("trace_enabled", False),
                "error": data.get("error", False),
                "error_message": data.get("error_message"),
            }
        except Exception as exc:
            return {
                "connected": self.is_running(),
                "engine": "Verilator",
                "message": f"Simulator error: {exc}",
                "model_initialized": False,
                "program_loaded": False,
                "program_file": None,
                "reset_applied": False,
                "cycle_count": 0,
                "trace_enabled": False,
                "error": True,
                "error_message": str(exc),
            }

    def load_program(self, program_file: str) -> Dict[str, Any]:
        """Load a program into instruction memory."""
        # Resolve the filename against the simulation directory.
        if "/" not in program_file:
            program_file = f"{self.SIM_DIR}/{program_file}"

        # Verify the file exists before attempting to load.
        try:
            if self.USE_WSL:
                check = subprocess.run(
                    ["wsl.exe", "-d", self.WSL_DISTRO, "--", "test", "-f", program_file],
                    capture_output=True,
                    text=True,
                    timeout=5,
                )
                file_exists = (check.returncode == 0)
            else:
                file_exists = os.path.isfile(program_file)

            if not file_exists:
                return {
                    "status": "error",
                    "command": "load_program",
                    "program_file": program_file,
                    "cycles": 0,
                    "program_loaded": False,
                    "error": f"Program file not found: {program_file}",
                }
        except Exception as exc:
            return {
                "status": "error",
                "command": "load_program",
                "program_file": program_file,
                "cycles": 0,
                "program_loaded": False,
                "error": f"Failed to verify program file: {exc}",
            }

        try:
            resp = self._send_raw(
                {"command": "load_program", "program_file": program_file}
            )
            if resp.get("status") != "ok":
                raise RuntimeError(resp.get("error", "load_program failed"))

            data = resp.get("data", {})
            return {
                "status": "ok",
                "command": "load_program",
                "program_file": data.get("program_file", program_file),
                "cycles": data.get("cycles", 0),
                "program_loaded": data.get("program_loaded", False),
            }
        except Exception as exc:
            return {
                "status": "error",
                "command": "load_program",
                "program_file": program_file,
                "cycles": 0,
                "program_loaded": False,
                "error": str(exc),
            }

    def _attach_state(self, out: Dict[str, Any]) -> Dict[str, Any]:
        """Attach live register and data memory snapshots from hardware to response."""
        try:
            reg_resp = self.read_registers()
            if reg_resp.get("status") == "ok":
                out["registers"] = reg_resp.get("registers", [])
        except Exception:
            pass
        try:
            mem_resp = self.read_memory(0, 32)
            if mem_resp.get("status") == "ok":
                out["memory"] = mem_resp.get("memory", [])
        except Exception:
            pass
        return out

    def reset(self) -> Dict[str, Any]:
        """Reset the processor pipeline."""
        try:
            resp = self._send_raw({"command": "reset"})
            if resp.get("status") != "ok":
                raise RuntimeError(resp.get("error", "reset failed"))

            data = resp.get("data", {})
            out = {
                "status": "ok",
                "command": "reset",
                "cycles": data.get("cycles", 0),
                "reset_applied": data.get("reset_applied", False),
                "pipeline_state": data.get("pipeline_state", {}),
            }
            return self._attach_state(out)
        except Exception as exc:
            return {
                "status": "error",
                "command": "reset",
                "cycles": 0,
                "reset_applied": False,
                "pipeline_state": {},
                "error": str(exc),
            }

    def step(self) -> Dict[str, Any]:
        """Execute exactly one clock cycle."""
        try:
            resp = self._send_raw({"command": "step"})
            if resp.get("status") != "ok":
                raise RuntimeError(resp.get("error", "step failed"))

            data = resp.get("data", {})
            out = {
                "status": "ok",
                "command": "step",
                "cycles": data.get("cycles", 0),
                "pipeline_state": data.get("pipeline_state", {}),
            }
            return self._attach_state(out)
        except Exception as exc:
            return {
                "status": "error",
                "command": "step",
                "cycles": 0,
                "pipeline_state": {},
                "error": str(exc),
            }

    def run_cycles(self, cycles: int) -> Dict[str, Any]:
        """Execute exactly N clock cycles."""
        try:
            resp = self._send_raw({"command": "run_cycles", "cycles": cycles})
            if resp.get("status") != "ok":
                raise RuntimeError(resp.get("error", "run_cycles failed"))

            data = resp.get("data", {})
            out = {
                "status": "ok",
                "command": "run_cycles",
                "cycles": data.get("cycles", 0),
                "cycles_executed": data.get("cycles_executed", 0),
                "pipeline_state": data.get("pipeline_state", {}),
            }
            return self._attach_state(out)
        except Exception as exc:
            return {
                "status": "error",
                "command": "run_cycles",
                "cycles": 0,
                "cycles_executed": 0,
                "pipeline_state": {},
                "error": str(exc),
            }

    def run(self, max_cycles: int) -> Dict[str, Any]:
        """Run up to max_cycles cycles."""
        try:
            resp = self._send_raw({"command": "run", "max_cycles": max_cycles})
            if resp.get("status") != "ok":
                raise RuntimeError(resp.get("error", "run failed"))

            data = resp.get("data", {})
            out = {
                "status": "ok",
                "command": "run",
                "cycles": data.get("cycles", 0),
                "termination_reason": data.get("termination_reason", "unknown"),
                "max_cycles": data.get("max_cycles", max_cycles),
                "pipeline_state": data.get("pipeline_state", {}),
            }
            return self._attach_state(out)
        except Exception as exc:
            return {
                "status": "error",
                "command": "run",
                "cycles": 0,
                "termination_reason": "error",
                "max_cycles": max_cycles,
                "pipeline_state": {},
                "error": str(exc),
            }

    def read_registers(self) -> Dict[str, Any]:
        """Read all 32 general-purpose registers."""
        try:
            resp = self._send_raw({"command": "read_registers"})
            if resp.get("status") != "ok":
                raise RuntimeError(resp.get("error", "read_registers failed"))

            data = resp.get("data", {})
            return {
                "status": "ok",
                "command": "read_registers",
                "registers": data.get("registers", []),
                "cycles": data.get("cycles", 0),
            }
        except Exception as exc:
            return {
                "status": "error",
                "command": "read_registers",
                "registers": [],
                "cycles": 0,
                "error": str(exc),
            }

    def read_memory(self, address: int, words: int) -> Dict[str, Any]:
        """Read `words` data-memory words starting at byte `address`."""
        try:
            resp = self._send_raw(
                {"command": "read_memory", "address": address, "words": words}
            )
            if resp.get("status") != "ok":
                raise RuntimeError(resp.get("error", "read_memory failed"))

            data = resp.get("data", {})
            return {
                "status": "ok",
                "command": "read_memory",
                "memory": data.get("memory", []),
                "cycles": data.get("cycles", 0),
            }
        except Exception as exc:
            return {
                "status": "error",
                "command": "read_memory",
                "memory": [],
                "cycles": 0,
                "error": str(exc),
            }

    def get_pipeline_state(self) -> Dict[str, Any]:
        """Read the full pipeline state from all debug outputs."""
        try:
            resp = self._send_raw({"command": "get_pipeline_state"})
            if resp.get("status") != "ok":
                raise RuntimeError(resp.get("error", "get_pipeline_state failed"))

            data = resp.get("data", {})
            return {
                "status": "ok",
                "command": "get_pipeline_state",
                "state": data.get("state", {}),
            }
        except Exception as exc:
            return {
                "status": "error",
                "command": "get_pipeline_state",
                "state": {},
                "error": str(exc),
            }

    # ------------------------------------------------------------------
    # Waveform / VCD tracing
    # ------------------------------------------------------------------

    def start_trace(self, filename: str = "pipeline.vcd") -> Dict[str, Any]:
        """Enable Verilator VCD waveform tracing into `filename`.

        The file is written inside the WSL simulation directory so it
        can be retrieved through the trace-file endpoint.
        """
        if not filename or "/" in filename or "\\" in filename or ".." in filename:
            return {
                "status": "error",
                "command": "start_trace",
                "error": "Invalid trace filename",
            }
        try:
            # Use absolute WSL path so the C++ simulator writes to the same
            # location that the trace-file endpoint reads from. Without this,
            # trace_->open(filename) uses a relative path and writes to the
            # C++ process's CWD (the Windows project dir when launched via
            # wsl.exe), while the backend reads from /home/pc/riscv-verilator-build/.
            if self.USE_WSL:
                wsl_filename = f"{self.TRACE_DIR}/{filename}"
            else:
                wsl_filename = os.path.join(self.TRACE_DIR, filename)
                os.makedirs(os.path.dirname(wsl_filename), exist_ok=True)
            resp = self._send_raw(
                {"command": "start_trace", "filename": wsl_filename}
            )
            if resp.get("status") != "ok":
                raise RuntimeError(resp.get("error", "start_trace failed"))
            data = resp.get("data", {})
            return {
                "status": "ok",
                "command": "start_trace",
                "trace_file": data.get("trace_file", filename),
                "trace_enabled": data.get("trace_enabled", True),
            }
        except Exception as exc:
            return {
                "status": "error",
                "command": "start_trace",
                "error": str(exc),
            }

    def stop_trace(self) -> Dict[str, Any]:
        """Close the active VCD trace file."""
        try:
            resp = self._send_raw({"command": "stop_trace"})
            if resp.get("status") != "ok":
                raise RuntimeError(resp.get("error", "stop_trace failed"))
            data = resp.get("data", {})
            return {
                "status": "ok",
                "command": "stop_trace",
                "trace_file": data.get("trace_file"),
                "trace_enabled": data.get("trace_enabled", False),
            }
        except Exception as exc:
            return {
                "status": "error",
                "command": "stop_trace",
                "error": str(exc),
            }

    def get_trace_status(self) -> Dict[str, Any]:
        """Return whether tracing is currently active."""
        try:
            resp = self._send_raw({"command": "get_trace_status"})
            if resp.get("status") != "ok":
                raise RuntimeError(resp.get("error", "get_trace_status failed"))
            data = resp.get("data", {})
            return {
                "status": "ok",
                "command": "get_trace_status",
                "trace_enabled": data.get("trace_enabled", False),
                "trace_file": data.get("trace_file"),
            }
        except Exception as exc:
            return {
                "status": "error",
                "command": "get_trace_status",
                "error": str(exc),
            }


# Global simulator manager instance.
simulator_manager = SimulatorManager()
