"""
Pytest integration tests for the simulator lifecycle API.

Covers: start, stop, restart, load, reset, step, run-cycles,
registers, memory, pipeline state, error handling, Phase A regression.
"""

PHASE_A_SOURCE = """addi x1, x0, 5
addi x2, x0, 7
add  x3, x1, x2
sw   x3, 0(x0)
lw   x4, 0(x0)
addi x5, x4, 1"""

EXPECTED_REGISTERS = {1: 5, 2: 7, 3: 12, 4: 12, 5: 13, 0: 0}


def test_health(get):
    r = get("/api/health")
    assert r["status"] == "healthy"


def test_simulator_start_stop(post):
    r = post("/api/simulator/start")
    assert r["connected"] is True
    assert r["engine"] == "Verilator"

    r = post("/api/simulator/stop")
    assert r["connected"] is False


def test_simulator_restart(post):
    r = post("/api/simulator/start")
    assert r["connected"] is True

    r = post("/api/simulator/restart")
    assert r["connected"] is True

    r = post("/api/simulator/stop")
    assert r["connected"] is False


def test_phase_a_full_flow(post, get):
    # Ensure simulator is running
    post("/api/simulator/start")

    # Assemble and load
    r = post("/api/assembler/assemble-and-load", {
        "source": PHASE_A_SOURCE,
        "program_file": "assembled.hex",
    }, timeout=30)
    assert r["success"] is True
    assert r.get("load_result", {}).get("status") == "ok"

    # Reset
    r = post("/api/simulator/reset")
    assert r["status"] == "ok"
    assert r["reset_applied"] is True

    # Step through 25 cycles
    for i in range(25):
        r = post("/api/simulator/step")
        assert r["status"] == "ok", f"Step {i} failed: {r}"

    # Read registers
    r = get("/api/simulator/registers")
    assert r["status"] == "ok"
    reg_dict = {reg["index"]: reg["value"] for reg in r["registers"]}

    for idx, expected in EXPECTED_REGISTERS.items():
        assert reg_dict.get(idx) == expected, (
            f"x{idx} expected {expected}, got {reg_dict.get(idx)}"
        )

    # Read memory
    r = post("/api/simulator/memory", {"address": 0, "words": 4})
    assert r["status"] == "ok"
    assert r["memory"][0]["value"] == 12

    post("/api/simulator/stop")


def test_invalid_cycle_count(post):
    # Pydantic validation: cycles must be >= 1
    r = post("/api/simulator/run-cycles", {"cycles": 0})
    assert "detail" in r


def test_invalid_memory_address(post):
    # Pydantic validation: address must be word-aligned (multiple of 4)
    r = post("/api/simulator/memory", {"address": 1, "words": 4})
    assert "detail" in r


def test_invalid_memory_words(post):
    # Pydantic validation: words must be >= 1
    r = post("/api/simulator/memory", {"address": 0, "words": 0})
    assert "detail" in r


def test_missing_program_file(post):
    r = post("/api/simulator/load", {"program_file": "nonexistent.hex"})
    assert r["status"] == "error"
    assert r["program_loaded"] is False


def test_pipeline_state_shape(get, post):
    post("/api/simulator/start")
    post("/api/simulator/reset")
    r = get("/api/simulator/pipeline")
    assert r["status"] == "ok"
    assert "fetch_pc" in r["state"]
    assert "control_stall" in r["state"]
    post("/api/simulator/stop")


def test_simulator_status_shape(get, post):
    post("/api/simulator/start")
    r = get("/api/simulator/status")
    assert r["connected"] is True
    assert r["engine"] == "Verilator"
    assert "message" in r
    assert "cycle_count" in r
    post("/api/simulator/stop")
