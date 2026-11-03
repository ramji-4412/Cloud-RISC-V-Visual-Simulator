#!/usr/bin/env python3
"""Direct test of the trace commands against the Verilator engine."""
import json
import subprocess
import sys

SIM = "/home/pc/riscv-verilator-build/Vriscv_sim_top"
PROG = "/mnt/d/RISC-V_Project/hardware/sim/program.hex"


def run():
    proc = subprocess.Popen(
        [SIM], stdin=subprocess.PIPE, stdout=subprocess.PIPE,
        stderr=subprocess.PIPE, text=True, bufsize=1,
    )

    def send(cmd):
        proc.stdin.write(json.dumps(cmd) + "\n")
        proc.stdin.flush()
        while True:
            line = proc.stdout.readline()
            if not line:
                raise RuntimeError("EOF")
            line = line.strip()
            if not line:
                continue
            try:
                return json.loads(line)
            except json.JSONDecodeError:
                continue

    print("status:", send({"command": "status"}))
    print("load:", send({"command": "load_program", "program_file": PROG}))
    print("start_trace:", send({"command": "start_trace", "filename": "test.vcd"}))
    print("status:", send({"command": "status"}))
    print("step:", send({"command": "step"}))
    print("step:", send({"command": "step"}))
    print("stop_trace:", send({"command": "stop_trace"}))
    print("quit:", send({"command": "quit"}))
    proc.wait(timeout=5)
    err = proc.stderr.read()
    if err:
        print("STDERR:", err[:500])


if __name__ == "__main__":
    run()
