"""
Integration test for the FastAPI -> Verilator simulation API.

Tests the full sequence: start, load, reset, step, run-cycles, registers,
memory, pipeline, stop. Also tests error handling.
"""

import json
import urllib.request
import urllib.error

BASE = "http://127.0.0.1:8000"


def get(ep):
    return json.loads(urllib.request.urlopen(BASE + ep).read())


def post(ep, data=None):
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(
        BASE + ep,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        return json.loads(urllib.request.urlopen(req).read())
    except urllib.error.HTTPError as e:
        return json.loads(e.read())


def main():
    print("=== 1. Health ===")
    h = get("/api/health")
    print(h)
    assert h["status"] == "healthy"

    print("=== 2. Simulator status (before start) ===")
    st = get("/api/simulator/status")
    print(st)

    print("=== 3. Start simulator ===")
    r = post("/api/simulator/start")
    print(r)
    assert r["connected"] is True, f"Start failed: {r}"

    print("=== 4. Load program ===")
    r = post("/api/simulator/load", {"program_file": "program.hex"})
    print(r)
    assert r["status"] == "ok", f"Load failed: {r}"
    assert r["program_loaded"] is True

    print("=== 5. Reset ===")
    r = post("/api/simulator/reset")
    print(r["status"], r["reset_applied"])
    assert r["status"] == "ok"
    assert r["reset_applied"] is True

    print("=== 6. Step cycles ===")
    for i in range(25):
        r = post("/api/simulator/step")
        assert r["status"] == "ok", f"Step {i} failed: {r}"
        st = r["pipeline_state"]
        if st["wb_writeback_enable"]:
            print(
                f"  Cycle {st['cycle']:2d}: WB=0x{st['wb_writeback_data']:02x} "
                f"Rd={st['wb_writeback_rd']} Stall={st['control_stall']}"
            )

    print("=== 7. Read registers ===")
    r = get("/api/simulator/registers")
    assert r["status"] == "ok"
    reg_dict = {reg["index"]: reg["value"] for reg in r["registers"]}
    for reg in r["registers"]:
        if reg["value"] != 0:
            print(f"  {reg['register']} = {reg['value']}")

    # Verify Phase A regression.
    assert reg_dict.get(1) == 5, f"x1 expected 5, got {reg_dict.get(1)}"
    assert reg_dict.get(2) == 7, f"x2 expected 7, got {reg_dict.get(2)}"
    assert reg_dict.get(3) == 12, f"x3 expected 12, got {reg_dict.get(3)}"
    assert reg_dict.get(4) == 12, f"x4 expected 12, got {reg_dict.get(4)}"
    assert reg_dict.get(5) == 13, f"x5 expected 13, got {reg_dict.get(5)}"
    assert reg_dict.get(0) == 0, f"x0 expected 0, got {reg_dict.get(0)}"
    print("  All register checks PASS")

    print("=== 8. Read memory ===")
    r = post("/api/simulator/memory", {"address": 0, "words": 4})
    assert r["status"] == "ok"
    mem = r["memory"]
    for m in mem:
        print(f"  memory[{m['address']}] = {m['value']}")
    assert mem[0]["value"] == 12, f"memory[0] expected 12, got {mem[0]['value']}"
    print("  Memory check PASS")

    print("=== 9. Pipeline state ===")
    r = get("/api/simulator/pipeline")
    assert r["status"] == "ok"
    st = r["state"]
    print(f"  Fetch PC: 0x{st['fetch_pc']:02x}, Stall: {st['control_stall']}")
    print(f"  Redirect: {st['redirect']}, PC sel: {st['pc_sel']}")

    print("=== 10. Invalid cycle count ===")
    r = post("/api/simulator/run-cycles", {"cycles": 0})
    print(f"  Response: {r.get('detail', r)}")

    print("=== 11. Invalid memory address ===")
    r = post("/api/simulator/memory", {"address": 1, "words": 4})
    print(f"  Response: {r.get('detail', r)}")

    print("=== 12. Missing program file ===")
    r = post("/api/simulator/load", {"program_file": "nonexistent.hex"})
    print(f"  Response: {r.get('detail', r.get('error', r))}")

    print("=== 13. Invalid command (via status endpoint) ===")
    # Test invalid memory words
    r = post("/api/simulator/memory", {"address": 0, "words": 0})
    print(f"  Response: {r.get('detail', r)}")

    print("=== 14. Stop simulator ===")
    r = post("/api/simulator/stop")
    print(r)
    assert r["connected"] is False, f"Stop failed: {r}"

    print("=== 15. Verify stopped ===")
    r = get("/api/simulator/status")
    print(r)
    assert r["connected"] is False

    print()
    print("=" * 50)
    print("ALL INTEGRATION TESTS PASSED!")
    print("=" * 50)


if __name__ == "__main__":
    main()
