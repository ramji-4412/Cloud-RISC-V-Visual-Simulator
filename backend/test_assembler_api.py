"""
Integration test for the Assembler API endpoints.
Tests assemble, assemble-and-load, and full-stack execution.
"""
import json
import urllib.request

BASE = "http://127.0.0.1:8000"


def get(ep):
    return json.loads(urllib.request.urlopen(BASE + ep).read())


def post(ep, data=None):
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(
        BASE + ep, data=body,
        headers={"Content-Type": "application/json"}, method="POST",
    )
    try:
        return json.loads(urllib.request.urlopen(req).read())
    except urllib.error.HTTPError as e:
        return json.loads(e.read())


def main():
    source = "addi x1, x0, 5\naddi x2, x0, 7\nadd x3, x1, x2\nsw x3, 0(x0)\nlw x4, 0(x0)\naddi x5, x4, 1"

    # 1. Assemble
    print("=== 1. Assemble ===")
    r = post("/api/assembler/assemble", {"source": source})
    print("Success:", r["success"])
    print("Machine code:", r["machine_code"])
    assert r["success"] is True
    assert r["machine_code"] == [
        "00500093", "00700113", "002081B3", "00302023", "00002203", "00120293"
    ]
    print("PASS: Assembler output matches expected")

    # 2. Start simulator
    print("=== 2. Start simulator ===")
    r = post("/api/simulator/start", {})
    print(r)
    assert r["connected"] is True

    # 3. Assemble and load
    print("=== 3. Assemble and load ===")
    r = post("/api/assembler/assemble-and-load", {
        "source": source,
        "program_file": "assembled.hex",
    })
    print("Success:", r["success"])
    print("Load result:", r.get("load_result", {}).get("status"))
    assert r["success"] is True
    assert r.get("load_result", {}).get("status") == "ok"

    # 4. Reset
    print("=== 4. Reset ===")
    r = post("/api/simulator/reset", {})
    assert r["status"] == "ok" and r["reset_applied"] is True

    # 5. Step 25 cycles
    print("=== 5. Step ===")
    for i in range(25):
        r = post("/api/simulator/step", {})
        assert r["status"] == "ok"

    # 6. Read registers
    print("=== 6. Read registers ===")
    r = get("/api/simulator/registers")
    reg_dict = {reg["index"]: reg["value"] for reg in r["registers"]}
    for reg in r["registers"]:
        if reg["value"] != 0:
            print(f"  {reg['register']} = {reg['value']}")

    assert reg_dict.get(1) == 5, f"x1 expected 5, got {reg_dict.get(1)}"
    assert reg_dict.get(2) == 7, f"x2 expected 7, got {reg_dict.get(2)}"
    assert reg_dict.get(3) == 12, f"x3 expected 12, got {reg_dict.get(3)}"
    assert reg_dict.get(4) == 12, f"x4 expected 12, got {reg_dict.get(4)}"
    assert reg_dict.get(5) == 13, f"x5 expected 13, got {reg_dict.get(5)}"
    assert reg_dict.get(0) == 0, f"x0 expected 0, got {reg_dict.get(0)}"
    print("  All register checks PASS")

    # 7. Read memory
    print("=== 7. Read memory ===")
    r = post("/api/simulator/memory", {"address": 0, "words": 4})
    mem = r["memory"]
    for m in mem:
        print(f"  memory[{m['address']}] = {m['value']}")
    assert mem[0]["value"] == 12
    print("  Memory check PASS")

    # 8. Error handling
    print("=== 8. Error handling ===")
    r = post("/api/assembler/assemble", {"source": "addi x40, x0, 5"})
    print(f"  Assemble error: {r['errors'][0]['message']}")
    assert r["success"] is False

    # 9. Stop
    print("=== 9. Stop ===")
    r = post("/api/simulator/stop", {})
    print(r)
    assert r["connected"] is False

    print()
    print("=" * 50)
    print("ALL ASSEMBLER INTEGRATION TESTS PASSED!")
    print("=" * 50)


if __name__ == "__main__":
    main()
