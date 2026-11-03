#!/usr/bin/env python3
"""
Standalone Python test client for the persistent C++ simulation engine.

Communicates via JSON over stdin/stdout. Demonstrates the full command
protocol: load_program, reset, step, run_cycles, read_registers,
read_memory, get_pipeline_state, status, and quit.
"""

import json
import subprocess
import sys
import os

SIM_EXE = "/home/pc/riscv-verilator-build/Vriscv_sim_top"
PROGRAM_FILE = "/mnt/d/RISC-V_Project/hardware/sim/program.hex"

EXPECTED = {
    "x1": 5,
    "x2": 7,
    "x3": 12,
    "memory[0]": 12,
    "x4": 12,
    "x5": 13,
}


class SimClient:
    def __init__(self, exe_path: str):
        self.proc = subprocess.Popen(
            [exe_path],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
        )
        self.pass_count = 0
        self.fail_count = 0

    def send(self, command: dict) -> dict:
        line = json.dumps(command)
        self.proc.stdin.write(line + "\n")
        self.proc.stdin.flush()

        while True:
            response_line = self.proc.stdout.readline()
            if not response_line:
                raise RuntimeError("Simulation process closed stdout")
            response_line = response_line.strip()
            if not response_line:
                continue
            try:
                return json.loads(response_line)
            except json.JSONDecodeError:
                # Non-JSON line (e.g. Verilator $display output), skip it.
                continue

    def close(self):
        try:
            self.send({"command": "quit"})
        except Exception:
            pass
        self.proc.wait(timeout=5)

    def check(self, actual, expected, name: str):
        if actual == expected:
            print(f"  PASS: {name} = {actual}")
            self.pass_count += 1
        else:
            print(f"  FAIL: {name} = {actual} (expected {expected})")
            self.fail_count += 1


def main():
    if not os.path.exists(SIM_EXE):
        print(f"ERROR: Simulation executable not found: {SIM_EXE}")
        sys.exit(1)

    client = SimClient(SIM_EXE)

    try:
        # 1. Status
        print("== 1. Status ==")
        resp = client.send({"command": "status"})
        print(json.dumps(resp, indent=2))
        assert resp["status"] == "ok", f"status failed: {resp}"
        assert resp["data"]["engine"] == "Verilator"
        assert resp["data"]["program_loaded"] is False
        print()

        # 2. Load program
        print("== 2. Load program ==")
        resp = client.send(
            {"command": "load_program", "program_file": PROGRAM_FILE}
        )
        print(json.dumps(resp, indent=2))
        assert resp["status"] == "ok", f"load_program failed: {resp}"
        assert resp["data"]["program_loaded"] is True
        print()

        # 3. Reset
        print("== 3. Reset ==")
        resp = client.send({"command": "reset"})
        print(json.dumps(resp, indent=2))
        assert resp["status"] == "ok", f"reset failed: {resp}"
        assert resp["data"]["reset_applied"] is True
        print()

        # 4. Step through cycles and observe pipeline
        print("== 4. Step cycles ==")
        for i in range(25):
            resp = client.send({"command": "step"})
            assert resp["status"] == "ok", f"step {i} failed: {resp}"
            state = resp["data"]["pipeline_state"]["state"]
            if i < 6 or state["wb_writeback_enable"]:
                print(
                    f"  Cycle {state['cycle']:2d}: PC=0x{state['fetch_pc']:02x} "
                    f"Instr=0x{state['fetch_instruction']:08x} "
                    f"WB=0x{state['wb_writeback_data']:02x} "
                    f"Rd={state['wb_writeback_rd']} "
                    f"Stall={state['control_stall']}"
                )
        print()

        # 5. Read registers
        print("== 5. Read registers ==")
        resp = client.send({"command": "read_registers"})
        assert resp["status"] == "ok", f"read_registers failed: {resp}"
        regs = resp["data"]["registers"]
        reg_dict = {r["index"]: r["value"] for r in regs}

        for r in regs:
            if r["value"] != 0:
                print(f"  {r['register']} = {r['value']}")

        client.check(reg_dict.get(1, 0), EXPECTED["x1"], "x1")
        client.check(reg_dict.get(2, 0), EXPECTED["x2"], "x2")
        client.check(reg_dict.get(3, 0), EXPECTED["x3"], "x3")
        client.check(reg_dict.get(4, 0), EXPECTED["x4"], "x4")
        client.check(reg_dict.get(5, 0), EXPECTED["x5"], "x5")
        client.check(reg_dict.get(0, 0), 0, "x0")
        print()

        # 6. Read data memory
        print("== 6. Read data memory ==")
        resp = client.send({"command": "read_memory", "address": 0, "words": 4})
        assert resp["status"] == "ok", f"read_memory failed: {resp}"
        mem = resp["data"]["memory"]
        for entry in mem:
            print(f"  memory[{entry['address']}] = {entry['value']}")
        client.check(mem[0]["value"], EXPECTED["memory[0]"], "memory[0]")
        print()

        # 7. Get pipeline state
        print("== 7. Pipeline state ==")
        resp = client.send({"command": "get_pipeline_state"})
        assert resp["status"] == "ok", f"get_pipeline_state failed: {resp}"
        state = resp["data"]["state"]
        print(f"  Fetch PC: 0x{state['fetch_pc']:02x}")
        print(f"  Control stall: {state['control_stall']}")
        print(f"  Redirect: {state['redirect']}")
        print(f"  PC sel: {state['pc_sel']}")
        print()

        # 8. Invalid command test
        print("== 8. Invalid command ==")
        resp = client.send({"command": "bogus_command"})
        print(json.dumps(resp, indent=2))
        assert resp["status"] == "error", f"Expected error for invalid command"
        assert "unknown command" in resp.get("error", "")
        print()

        # Summary
        print("=" * 40)
        print(f"Passed: {client.pass_count}")
        print(f"Failed: {client.fail_count}")
        if client.fail_count == 0:
            print("ALL TESTS PASSED!")
        else:
            print("SOME TESTS FAILED!")

    finally:
        client.close()


if __name__ == "__main__":
    main()
