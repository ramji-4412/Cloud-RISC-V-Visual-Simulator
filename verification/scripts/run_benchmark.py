#!/usr/bin/env python3
"""
Single Benchmark Runner for Cloud RISC-V Visual Simulator & Waveform Studio.

Assembles assembly source, writes simulator hex, executes the program
on the Verilator C++ simulation model, reads architectural state,
and verifies actual register and memory contents against expected_results.json.
"""

import argparse
import json
import os
import subprocess
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

# Add repo root to sys.path so we can import backend assembler
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(REPO_ROOT))

from backend.app.assembler import assemble


def to_wsl_path(path: Path) -> str:
    """Convert a Windows Path to a WSL path (/mnt/d/...)."""
    p_str = str(path.resolve()).replace("\\", "/")
    if len(p_str) > 1 and p_str[1] == ":":
        drive = p_str[0].lower()
        return f"/mnt/{drive}{p_str[2:]}"
    return p_str


class VerilatorSimRunner:
    """Controls the Verilator simulator process using JSON-line protocol."""

    def __init__(self, sim_exe: str, wsl_distro: str = "Ubuntu"):
        self.sim_exe = sim_exe
        self.wsl_distro = wsl_distro
        self.proc: Optional[subprocess.Popen] = None
        self._start_process()

    def _start_process(self):
        if sys.platform == "win32":
            cmd = ["wsl.exe", "-d", self.wsl_distro, "--", self.sim_exe]
        else:
            cmd = [self.sim_exe]

        self.proc = subprocess.Popen(
            cmd,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
        )

    def send_cmd(self, command: Dict[str, Any]) -> Dict[str, Any]:
        if not self.proc or self.proc.poll() is not None:
            raise RuntimeError("Simulator process is not running")

        line = json.dumps(command)
        self.proc.stdin.write(line + "\n")
        self.proc.stdin.flush()

        while True:
            resp_line = self.proc.stdout.readline()
            if not resp_line:
                raise RuntimeError("Simulator closed stdout unexpectedly")
            resp_line = resp_line.strip()
            if not resp_line:
                continue
            try:
                return json.loads(resp_line)
            except json.JSONDecodeError:
                # Skip non-JSON debug outputs from Verilator
                continue

    def close(self):
        if self.proc and self.proc.poll() is None:
            try:
                self.send_cmd({"command": "quit"})
            except Exception:
                pass
            try:
                self.proc.wait(timeout=3)
            except Exception:
                self.proc.kill()


def run_benchmark(
    benchmark_dir: Path,
    sim_exe: str = "/home/pc/riscv-verilator-build/Vriscv_sim_top",
    wsl_distro: str = "Ubuntu",
    enable_trace: bool = False,
    trace_output: Optional[Path] = None,
) -> Dict[str, Any]:
    """Run a single verification benchmark directory and check results."""
    # Locate .s and expected_results.json
    s_files = list(benchmark_dir.glob("*.s"))
    if not s_files:
        raise FileNotFoundError(f"No .s file found in {benchmark_dir}")
    s_path = s_files[0]

    expected_path = benchmark_dir / "expected_results.json"
    if not expected_path.exists():
        raise FileNotFoundError(f"expected_results.json not found in {benchmark_dir}")

    with open(expected_path, "r", encoding="utf-8") as f:
        expected_meta = json.load(f)

    with open(s_path, "r", encoding="utf-8") as f:
        source_code = f.read()

    # 1. Assemble source
    asm_res = assemble(source_code)
    if not asm_res["success"]:
        return {
            "benchmark": benchmark_dir.name,
            "passed": False,
            "error": "Assembler error",
            "details": asm_res["errors"],
        }

    # 2. Write hex file
    sim_hex_dir = REPO_ROOT / "hardware" / "sim"
    sim_hex_dir.mkdir(parents=True, exist_ok=True)
    hex_path = sim_hex_dir / f"bench_{benchmark_dir.name}.hex"

    with open(hex_path, "w", encoding="utf-8") as f:
        for mc in asm_res["machine_code"]:
            f.write(f"{mc}\n")

    wsl_hex_path = to_wsl_path(hex_path)

    # 3. Launch simulator
    sim = VerilatorSimRunner(sim_exe, wsl_distro)
    try:
        # Check initial status
        st = sim.send_cmd({"command": "status"})
        if st.get("status") != "ok":
            return {
                "benchmark": benchmark_dir.name,
                "passed": False,
                "error": f"Status check failed: {st}",
            }

        # Load program
        load_res = sim.send_cmd({"command": "load_program", "program_file": wsl_hex_path})
        if load_res.get("status") != "ok":
            return {
                "benchmark": benchmark_dir.name,
                "passed": False,
                "error": f"load_program failed: {load_res}",
            }

        # Optional trace (must start after load_program to attach to newly created model)
        wsl_trace_path = None
        if enable_trace:
            if trace_output is None:
                trace_output = REPO_ROOT / "verification" / "reports" / "waveforms" / f"{benchmark_dir.name}.vcd"
            trace_output.parent.mkdir(parents=True, exist_ok=True)
            wsl_trace_path = to_wsl_path(trace_output)
            sim.send_cmd({
                "command": "start_trace",
                "filename": wsl_trace_path,
                "trace_file": wsl_trace_path,
            })

        # Reset pipeline
        reset_res = sim.send_cmd({"command": "reset"})
        if reset_res.get("status") != "ok":
            return {
                "benchmark": benchmark_dir.name,
                "passed": False,
                "error": f"reset failed: {reset_res}",
            }

        # Step through required cycles
        min_cycles = expected_meta.get("min_cycles", 50)
        cycles_executed = 0
        for _ in range(min_cycles):
            step_res = sim.send_cmd({"command": "step"})
            if step_res.get("status") != "ok":
                return {
                    "benchmark": benchmark_dir.name,
                    "passed": False,
                    "error": f"step failed: {step_res}",
                }
            cycles_executed = step_res.get("data", {}).get("cycles", cycles_executed + 1)

        # Stop trace if active
        if enable_trace:
            sim.send_cmd({"command": "stop_trace"})

        # Read architectural registers
        reg_res = sim.send_cmd({"command": "read_registers"})
        if reg_res.get("status") != "ok":
            return {
                "benchmark": benchmark_dir.name,
                "passed": False,
                "error": f"read_registers failed: {reg_res}",
            }
        regs_list = reg_res["data"]["registers"]
        actual_regs = {r["register"]: r["value"] for r in regs_list}

        # Read architectural data memory
        expected_memory = expected_meta.get("expected_memory", {})
        actual_memory = {}
        if expected_memory:
            # Read first 16 words (64 bytes)
            mem_res = sim.send_cmd({"command": "read_memory", "address": 0, "words": 16})
            if mem_res.get("status") == "ok":
                for item in mem_res["data"]["memory"]:
                    actual_memory[str(item["address"])] = item["value"]

        # Read final pipeline state
        pipe_res = sim.send_cmd({"command": "get_pipeline_state"})
        pipeline_state = pipe_res.get("data", {}).get("state", {})

        # 4. Verification comparison
        reg_checks = []
        all_passed = True

        for reg_name, exp_val in expected_meta.get("expected_registers", {}).items():
            act_val = actual_regs.get(reg_name, 0)
            # Normalize to 32-bit unsigned
            exp_u32 = exp_val & 0xFFFFFFFF
            act_u32 = act_val & 0xFFFFFFFF
            passed = act_u32 == exp_u32
            if not passed:
                all_passed = False
            reg_checks.append({
                "target": reg_name,
                "expected": exp_u32,
                "actual": act_u32,
                "passed": passed,
            })

        mem_checks = []
        for addr_str, exp_val in expected_memory.items():
            act_val = actual_memory.get(str(addr_str), 0)
            exp_u32 = exp_val & 0xFFFFFFFF
            act_u32 = act_val & 0xFFFFFFFF
            passed = act_u32 == exp_u32
            if not passed:
                all_passed = False
            mem_checks.append({
                "target": f"memory[{addr_str}]",
                "expected": exp_u32,
                "actual": act_u32,
                "passed": passed,
            })

        return {
            "benchmark": benchmark_dir.name,
            "description": expected_meta.get("description", ""),
            "instruction_count": asm_res["instruction_count"],
            "cycles_executed": cycles_executed,
            "passed": all_passed,
            "reg_checks": reg_checks,
            "mem_checks": mem_checks,
            "pipeline_state": pipeline_state,
            "trace_file": str(trace_output) if enable_trace else None,
        }

    finally:
        sim.close()


def print_benchmark_report(res: Dict[str, Any]):
    print(f"\n=======================================================")
    print(f"BENCHMARK: {res['benchmark']}")
    print(f"STATUS   : {'[PASS]' if res.get('passed') else '[FAIL]'}")
    print(f"CYCLES   : {res.get('cycles_executed', 'N/A')}")
    print(f"INSTRS   : {res.get('instruction_count', 'N/A')}")
    if res.get("description"):
        print(f"DESC     : {res['description']}")
    print(f"-------------------------------------------------------")

    if not res.get("passed") and "error" in res:
        print(f"ERROR: {res['error']}")
        if "details" in res:
            print(f"DETAILS: {res['details']}")
        return

    print("Register Verifications:")
    for chk in res.get("reg_checks", []):
        tag = "OK" if chk["passed"] else "FAIL"
        print(f"  [{tag:4s}] {chk['target']:4s}: Expected=0x{chk['expected']:08X} ({chk['expected']}), Actual=0x{chk['actual']:08X} ({chk['actual']})")

    if res.get("mem_checks"):
        print("\nMemory Verifications:")
        for chk in res.get("mem_checks", []):
            tag = "OK" if chk["passed"] else "FAIL"
            print(f"  [{tag:4s}] {chk['target']:12s}: Expected=0x{chk['expected']:08X} ({chk['expected']}), Actual=0x{chk['actual']:08X} ({chk['actual']})")

    if res.get("trace_file"):
        print(f"\nVCD Trace Generated: {res['trace_file']}")
    print(f"=======================================================\n")


def main():
    parser = argparse.ArgumentParser(description="Run RISC-V Verification Benchmark")
    parser.add_argument("benchmark", help="Benchmark directory name or path (e.g. 01_branches)")
    parser.add_argument("--trace", action="store_true", help="Enable VCD waveform tracing")
    parser.add_argument("--sim-exe", default="/home/pc/riscv-verilator-build/Vriscv_sim_top", help="Simulator executable path in WSL")
    parser.add_argument("--wsl-distro", default="Ubuntu", help="WSL distribution name")
    args = parser.parse_args()

    bench_path = Path(args.benchmark)
    if not bench_path.exists():
        # Check relative to verification/benchmarks
        bench_path = REPO_ROOT / "verification" / "benchmarks" / args.benchmark
    if not bench_path.exists():
        print(f"ERROR: Benchmark directory not found: {args.benchmark}")
        sys.exit(1)

    result = run_benchmark(
        benchmark_dir=bench_path,
        sim_exe=args.sim_exe,
        wsl_distro=args.wsl_distro,
        enable_trace=args.trace,
    )
    print_benchmark_report(result)
    sys.exit(0 if result.get("passed") else 1)


if __name__ == "__main__":
    main()
