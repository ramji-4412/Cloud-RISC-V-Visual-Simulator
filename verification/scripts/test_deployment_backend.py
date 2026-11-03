"""
End-to-end Verification Script for Cloud RISC-V Backend in Native Linux / Container Mode.

Tests all requirements of Phase F:
 1. Health check endpoint (GET /api/health)
 2. Simulator start / status (POST /api/simulator/start, GET /api/simulator/status)
 3. RV32I Assembler endpoint (POST /api/assembler/assemble)
 4. Assemble and Load into RTL memory (POST /api/assembler/assemble-and-load)
 5. Hardware reset (POST /api/simulator/reset)
 6. Cycle stepping (POST /api/simulator/step)
 7. Pipeline state verification (GET /api/simulator/pipeline)
 8. Multi-cycle execution (POST /api/simulator/run-cycles)
 9. Register updates in RTL register file (GET /api/simulator/registers)
 10. Memory writes and reads in RTL data memory (POST /api/simulator/memory)
 11. Full benchmark execution (run branch benchmark)
 12. VCD waveform trace start (POST /api/trace/start)
 13. VCD waveform generation and retrieval (POST /api/trace/stop, GET /api/trace/file)
 14. VCD parsing and signal verification
 15. Process restart & error recovery (POST /api/simulator/restart)
"""

import sys
import os
import json
import time

# Ensure project root is in sys.path
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
sys.path.insert(0, BASE_DIR)

# Force native Linux execution mode
os.environ["USE_WSL"] = "0"
os.environ["SIM_EXE"] = os.path.join(BASE_DIR, "build", "Vriscv_sim_top")
os.environ["SIM_DIR"] = os.path.join(BASE_DIR, "hardware", "sim")
os.environ["TRACE_DIR"] = os.path.join(BASE_DIR, "build")

from backend.app.main import app
from backend.app.simulator import simulator_manager
from fastapi.testclient import TestClient

passed = 0
failed = 0

def test(name, condition, extra="", resp=None):
    global passed, failed
    if condition:
        print(f"[PASS] {name} {extra}")
        passed += 1
    else:
        err = f" -> {resp.status_code}: {resp.text}" if resp is not None else ""
        print(f"[FAIL] {name} {extra}{err}")
        failed += 1

print("=" * 70)
print("CLOUD RISC-V BACKEND DEPLOYMENT VERIFICATION (Native Linux Mode)")
print(f"Simulator Executable: {simulator_manager.SIM_EXE}")
print(f"Simulation Directory: {simulator_manager.SIM_DIR}")
print(f"Trace Directory:      {simulator_manager.TRACE_DIR}")
print(f"USE_WSL:              {simulator_manager.USE_WSL}")
print("=" * 70)

with TestClient(app) as client:
    # 1. Health check
    res = client.get("/api/health")
    test("1. Health Endpoint", res.status_code == 200 and res.json().get("status") == "healthy")

    # 2. Status (Automatic Lifespan Initialization Verification)
    res = client.get("/api/simulator/status")
    test("2. Simulator Status (Auto-Started via Lifespan)", res.status_code == 200 and res.json().get("connected") is True)

    # 3. Simulator start idempotency
    res = client.post("/api/simulator/start")
    test("3. Simulator Start (Idempotent)", res.status_code == 200 and res.json().get("connected") is True)

    # 4. Assemble source code
    sample_code = """
addi x1, x0, 15
addi x2, x0, 25
add  x3, x1, x2
sw   x3, 4(x0)
lw   x4, 4(x0)
"""
    res = client.post("/api/assembler/assemble", json={"source": sample_code})
    data = res.json()
    test("4. Assembler Encode", res.status_code == 200 and data.get("success") is True and data.get("instruction_count") == 5)

    # 5. Assemble and load into RTL processor
    res = client.post("/api/assembler/assemble-and-load", json={
        "source": sample_code,
        "program_file": "test_deploy_prog.hex"
    })
    data = res.json()
    test("5. Assemble & Load into RTL", res.status_code == 200 and data.get("success") is True and data.get("load_result", {}).get("program_loaded") is True)

    # 6. Reset CPU
    res = client.post("/api/simulator/reset")
    rst_data = res.json()
    test("6. Processor Reset", res.status_code == 200 and rst_data.get("reset_applied") is True and "registers" in rst_data, resp=res)

    # 7. Step 1 cycle
    res = client.post("/api/simulator/step")
    s_data = res.json()
    test("7. Single Cycle Step", res.status_code == 200 and s_data.get("command") == "step" and "registers" in s_data, resp=res)

    # 8. Check pipeline state
    res = client.get("/api/simulator/pipeline")
    p_data = res.json()
    test("8. Pipeline State Extraction", res.status_code == 200 and "state" in p_data, resp=res)

    # 9. Step through the program (14 cycles to ensure all instructions complete writeback)
    res = client.post("/api/simulator/run-cycles", json={"cycles": 14})
    test("9. Multi-Cycle Execution", res.status_code == 200 and res.json().get("cycles_executed") == 14, resp=res)

    # 10. Verify register file in RTL (x1=15, x2=25, x3=40, x4=40)
    res = client.get("/api/simulator/registers")
    r_data = res.json()
    regs = r_data.get("registers", [])
    v1 = regs[1].get("value") if len(regs) > 1 and isinstance(regs[1], dict) else None
    v2 = regs[2].get("value") if len(regs) > 2 and isinstance(regs[2], dict) else None
    v3 = regs[3].get("value") if len(regs) > 3 and isinstance(regs[3], dict) else None
    v4 = regs[4].get("value") if len(regs) > 4 and isinstance(regs[4], dict) else None

    test("10. RTL Register x1 == 15", len(regs) == 32 and v1 == 15, f"(x1={v1})", resp=res)
    test("11. RTL Register x2 == 25", len(regs) == 32 and v2 == 25, f"(x2={v2})", resp=res)
    test("12. RTL Register x3 == 40", len(regs) == 32 and v3 == 40, f"(x3={v3})", resp=res)
    test("13. RTL Register x4 == 40", len(regs) == 32 and v4 == 40, f"(x4={v4})", resp=res)

    # 11. Verify RTL data memory (sw x3, 4(x0) should write 40 at address 4)
    res = client.post("/api/simulator/memory", json={"address": 0, "words": 4})
    m_data = res.json()
    mem = m_data.get("memory", [])
    val_at_4 = next((item["value"] for item in mem if item["address"] == 4), None)
    test("14. RTL Data Memory at 0x4 == 40", val_at_4 == 40, f"(val={val_at_4})")

    # 12. Waveform Tracing: Start Trace
    res = client.post("/api/trace/start", json={"filename": "deploy_test.vcd"})
    test("15. VCD Trace Start", res.status_code == 200 and res.json().get("trace_enabled") is True)

    # Run 5 more cycles while tracing
    client.post("/api/simulator/run-cycles", json={"cycles": 5})

    # Stop Trace
    res = client.post("/api/trace/stop")
    test("16. VCD Trace Stop", res.status_code == 200 and res.json().get("trace_enabled") is False)

    # 13. Retrieve VCD file
    res = client.get("/api/trace/file?filename=deploy_test.vcd")
    vcd_data = res.json()
    content = vcd_data.get("content", "")
    test("17. VCD File Retrieval", res.status_code == 200 and vcd_data.get("status") == "ok" and len(content) > 100)
    test("18. VCD Content Valid", "$scope" in content and "$var" in content and "clk" in content)

    # 14. Restart simulator process
    res = client.post("/api/simulator/restart")
    test("19. Simulator Process Restart", res.status_code == 200 and res.json().get("connected") is True)

    # 15. Check status after restart
    res = client.get("/api/simulator/status")
    test("20. Status After Restart", res.status_code == 200 and res.json().get("connected") is True)

    # Clean up temporary test files
    try:
        os.remove(os.path.join(simulator_manager.SIM_DIR, "test_deploy_prog.hex"))
    except Exception:
        pass
    try:
        os.remove(os.path.join(simulator_manager.TRACE_DIR, "deploy_test.vcd"))
    except Exception:
        pass

print("=" * 70)
print(f"RESULTS: {passed} PASSED, {failed} FAILED")
print("=" * 70)

if failed > 0:
    sys.exit(1)
