import subprocess
import json
import sys
import os

exe_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../build/Vriscv_sim_top"))
sim_hex = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../hardware/sim/bench_01_branches.hex"))

print(f"Launching Verilator native executable: {exe_path}")
proc = subprocess.Popen(
    [exe_path],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    bufsize=1
)

# 1. Status command
proc.stdin.write(json.dumps({"command": "status"}) + "\n")
proc.stdin.flush()
status_line = proc.stdout.readline()
print("1. Status Response:", status_line.strip())
status_resp = json.loads(status_line)
assert status_resp["status"] == "ok", f"Expected ok status, got {status_resp}"
assert status_resp["data"]["model_initialized"] is True
print("   -> Model initialized: True, Engine: Verilator")

# 2. Load program command
proc.stdin.write(json.dumps({"command": "load_program", "program_file": sim_hex}) + "\n")
proc.stdin.flush()
load_line = proc.stdout.readline()
print("2. Load Response:", load_line.strip())
load_resp = json.loads(load_line)
assert load_resp["status"] == "ok"
assert load_resp["data"]["program_loaded"] is True
print("   -> Program loaded successfully")

# 3. Step command
proc.stdin.write(json.dumps({"command": "step"}) + "\n")
proc.stdin.flush()
step_line = proc.stdout.readline()
print("3. Step Response:", step_line.strip())
step_resp = json.loads(step_line)
assert step_resp["status"] == "ok"
assert step_resp["data"]["cycles"] == 1
print("   -> Advanced to cycle 1")

# 4. Read registers command
proc.stdin.write(json.dumps({"command": "read_registers"}) + "\n")
proc.stdin.flush()
regs_line = proc.stdout.readline()
regs_resp = json.loads(regs_line)
assert regs_resp["status"] == "ok"
assert len(regs_resp["data"]["registers"]) == 32
print(f"4. Registers read: 32 hardware registers returned (x0={regs_resp['data']['registers'][0]['value']})")

# 5. Clean quit
proc.stdin.write(json.dumps({"command": "quit"}) + "\n")
proc.stdin.flush()
proc.wait(timeout=3)
print(f"5. Process cleanly exited with return code: {proc.returncode}")
print("SMOKE TEST COMPLETE: 100% SUCCESS")

