"""
Edge case and stress tests for RV32I instructions via the actual backend API.

Each test: assemble -> load -> reset -> run cycles -> check registers.
"""

import json
import urllib.request
import urllib.error

BASE = "http://127.0.0.1:8000"


def post(endpoint, data=None, timeout=30):
    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(
        BASE + endpoint,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        return json.loads(exc.read().decode("utf-8"))


def get(endpoint):
    with urllib.request.urlopen(BASE + endpoint, timeout=10) as resp:
        return json.loads(resp.read().decode("utf-8"))


def run_program(name, source, cycles=30, expected_regs=None, timeout=30):
    """Assemble, load, reset, run, and check registers."""
    print(f"\n=== {name} ===")
    print(f"Source: {source.replace(chr(10), ' | ')}")

    # Assemble and load
    r = post("/api/assembler/assemble-and-load", {
        "source": source,
        "program_file": "edge_test.hex",
    }, timeout=timeout)
    assert r["success"], f"Assemble failed: {r.get('errors')}"

    # Reset
    r = post("/api/simulator/reset")
    assert r["status"] == "ok"

    # Run cycles
    r = post("/api/simulator/run-cycles", {"cycles": cycles})
    assert r["status"] == "ok"

    # Read registers
    r = get("/api/simulator/registers")
    assert r["status"] == "ok"
    reg_dict = {reg["index"]: reg["value"] for reg in r["registers"]}

    if expected_regs:
        for idx, expected in expected_regs.items():
            actual = reg_dict.get(idx)
            status = "PASS" if actual == expected else "FAIL"
            print(f"  x{idx}: expected={expected}, actual={actual} [{status}]")
            assert actual == expected, f"x{idx} expected {expected}, got {actual}"
    else:
        for idx in sorted(reg_dict.keys()):
            if reg_dict[idx] != 0:
                print(f"  x{idx}: {reg_dict[idx]}")

    print(f"  PASS: {name}")
    return reg_dict


def main():
    # Ensure simulator is running
    post("/api/simulator/start")
    try:
        # 1. R-type arithmetic: add, sub
        run_program(
            "R-type arithmetic (add, sub)",
            "addi x1, x0, 10\naddi x2, x0, 4\nadd  x3, x1, x2\nsub  x4, x1, x2",
            expected_regs={1: 10, 2: 4, 3: 14, 4: 6}
        )

        # 2. Shift operations
        run_program(
            "Shift left logical (slli)",
            "addi x1, x0, 1\nslli x2, x1, 4",
            expected_regs={1: 1, 2: 16}
        )

        run_program(
            "Shift right logical (srli)",
            "addi x1, x0, 16\nsrli x2, x1, 2",
            expected_regs={1: 16, 2: 4}
        )

        run_program(
            "Shift right arithmetic (srai)",
            "addi x1, x0, -8\nsrai x2, x1, 1",
            expected_regs={1: 4294967288, 2: 4294967292}  # -8 as u32, -4 as u32
        )

        # 3. LUI and AUIPC
        run_program(
            "LUI",
            "lui x1, 0x12345",
            expected_regs={1: 0x12345000}
        )

        run_program(
            "AUIPC",
            "addi x0, x0, 0\nauipc x1, 0x100",
            expected_regs={1: 1048580}  # PC=4 + (0x100 << 12) = 4 + 1048576
        )

        # 4. Comparisons (signed and unsigned)
        run_program(
            "Signed less than (slt, slti)",
            "addi x1, x0, 5\naddi x2, x0, 10\nslt x3, x1, x2\nslti x4, x1, 7",
            expected_regs={1: 5, 2: 10, 3: 1, 4: 1}
        )

        run_program(
            "Signed less than immediate (slti)",
            "addi x1, x0, 5\nslti x2, x1, 3\nslti x3, x1, 7",
            expected_regs={1: 5, 2: 0, 3: 1}
        )

        run_program(
            "Unsigned less than (sltu, sltiu)",
            "addi x1, x0, 5\naddi x2, x0, 10\nsltu x3, x1, x2\nsltiu x4, x1, 3",
            expected_regs={1: 5, 2: 10, 3: 1, 4: 0}
        )

        # 5. Loads and stores
        run_program(
            "Store and load word (sw, lw)",
            "addi x1, x0, 42\nsw x1, 0(x0)\nlw x2, 0(x0)",
            expected_regs={1: 42, 2: 42}
        )

        # 6. Branch not taken (beq with unequal regs)
        run_program(
            "Branch not taken (beq)",
            "addi x1, x0, 5\naddi x2, x0, 6\nbeq x1, x2, +8\naddi x3, x0, 99",
            expected_regs={1: 5, 2: 6, 3: 99}
        )

        # 7. Branch taken
        run_program(
            "Branch taken (beq)",
            "addi x1, x0, 5\naddi x2, x0, 5\nbeq x1, x2, +4\naddi x3, x0, 0\naddi x3, x0, 99",
            expected_regs={1: 5, 2: 5, 3: 99}
        )

        # 8. JAL
        run_program(
            "Jump and link (JAL)",
            "jal x1, +8\naddi x2, x0, 0\naddi x2, x0, 77",
            cycles=20,
            expected_regs={1: 4, 2: 77}  # x1 = return addr (4), x2 = 77 (at jump target addr 8)
        )

        # 9. Register x0 is always zero
        run_program(
            "x0 is hardwired to zero",
            "addi x0, x0, 42\naddi x1, x0, 5",
            expected_regs={0: 0, 1: 5}
        )

        # 10. Negative immediate
        run_program(
            "Negative immediate (addi)",
            "addi x1, x0, -100",
            expected_regs={1: 4294967196}  # -100 as u32
        )

        # 11. Jump and link register (JALR)
        run_program(
            "Jump and link register (JALR)",
            "addi x1, x0, 12\njalr x2, 0(x1)\naddi x3, x0, 55",
            cycles=20,
            expected_regs={1: 12, 2: 8, 3: 0}  # x1=12 (target), x2=8 (PC+4 return), x3=0 (skipped)
        )

        print("\n=== ALL EDGE CASE TESTS PASSED ===")

    finally:
        post("/api/simulator/stop")


if __name__ == "__main__":
    main()
