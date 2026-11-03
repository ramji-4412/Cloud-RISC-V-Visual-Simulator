"""
Pytest integration tests for the assembler API endpoints.

Covers: assemble, assemble-and-load, error handling, Phase A regression.
"""

PHASE_A_SOURCE = """addi x1, x0, 5
addi x2, x0, 7
add  x3, x1, x2
sw   x3, 0(x0)
lw   x4, 0(x0)
addi x5, x4, 1"""

PHASE_A_MACHINE_CODE = [
    "00500093", "00700113", "002081B3",
    "00302023", "00002203", "00120293",
]


def test_assemble_phase_a_success(post):
    r = post("/api/assembler/assemble", {"source": PHASE_A_SOURCE})
    assert r["success"] is True
    assert r["instruction_count"] == 6
    assert r["machine_code"] == PHASE_A_MACHINE_CODE
    assert r["errors"] == []


def test_assemble_invalid_register(post):
    r = post("/api/assembler/assemble", {"source": "addi x40, x0, 5"})
    assert r["success"] is False
    assert len(r["errors"]) > 0


def test_assemble_and_load_phase_a(post):
    # Simulator must be running for load_program to succeed
    post("/api/simulator/start")
    try:
        r = post("/api/assembler/assemble-and-load", {
            "source": PHASE_A_SOURCE,
            "program_file": "assembled.hex",
        }, timeout=30)
        assert r["success"] is True
        assert r["instruction_count"] == 6
        assert r["machine_code"] == PHASE_A_MACHINE_CODE
        assert r.get("load_result", {}).get("status") == "ok"
        assert r.get("load_result", {}).get("program_loaded") is True
    finally:
        post("/api/simulator/stop")


def test_assemble_and_load_invalid_filename(post):
    r = post("/api/assembler/assemble-and-load", {
        "source": "addi x1, x0, 5",
        "program_file": "../../etc/passwd",
    })
    # Pydantic validator rejects path separators -> 422 with detail
    assert "detail" in r or r.get("success") is False


def test_assemble_and_load_missing_extension(post):
    r = post("/api/assembler/assemble-and-load", {
        "source": "addi x1, x0, 5",
        "program_file": "program.txt",
    })
    # Pydantic validator rejects non-.hex extension -> 422 with detail
    assert "detail" in r or r.get("success") is False
