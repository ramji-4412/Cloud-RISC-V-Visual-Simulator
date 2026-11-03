"""
Verification of FastAPI Lifespan Integration, SimulatorManager Process Lifecycle & Concurrency.

Tests:
1. Lifespan fails if simulator startup returns connected=false.
2. Lifespan fails if simulator startup raises an exception.
3. Successful startup and shutdown work cleanly.
4. Two concurrent start requests create only one process.
5. Concurrent simulator commands are serialized without protocol interleaving.
6. Stop waits for an in-flight command instead of terminating its process mid-command.
7. Failed startup cleans up the process, open pipes, and stderr thread.
8. Restart after termination works cleanly.
"""

import sys
import os
import time
import threading
from unittest.mock import patch

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
sys.path.insert(0, BASE_DIR)

os.environ["USE_WSL"] = "0"
os.environ["SIM_EXE"] = os.path.join(BASE_DIR, "build", "Vriscv_sim_top")
os.environ["SIM_DIR"] = os.path.join(BASE_DIR, "hardware", "sim")
os.environ["TRACE_DIR"] = os.path.join(BASE_DIR, "build")

from backend.app.main import app
from backend.app.simulator import SimulatorManager, simulator_manager
from fastapi.testclient import TestClient

passed = 0
failed = 0

def test(name, condition, extra="", err_msg=""):
    global passed, failed
    if condition:
        print(f"[PASS] {name} {extra}")
        passed += 1
    else:
        print(f"[FAIL] {name} {extra} -> {err_msg}")
        failed += 1

print("=" * 75)
print("FASTAPI LIFESPAN, VERILATOR PROCESS LIFECYCLE & CONCURRENCY TESTS")
print("=" * 75)

# Ensure simulator starts in stopped state
simulator_manager.stop()
test("Initial state: simulator not running", not simulator_manager.is_running())

# ----------------------------------------------------------------------
# 1. Lifespan fails if simulator startup returns connected=false
# ----------------------------------------------------------------------
with patch.object(simulator_manager, "start", return_value={"connected": False, "message": "Mocked failure: executable not found"}):
    lifespan_failed_cleanly = False
    caught_msg = ""
    try:
        with TestClient(app) as client:
            pass
    except RuntimeError as exc:
        lifespan_failed_cleanly = True
        caught_msg = str(exc)
    test(
        "1. Lifespan fails fast when start() returns connected=false",
        lifespan_failed_cleanly and "Mocked failure" in caught_msg,
        f"(Caught RuntimeError: {caught_msg})",
        err_msg=f"Expected RuntimeError, got: {caught_msg}"
    )

# ----------------------------------------------------------------------
# 2. Lifespan fails if simulator startup raises an exception
# ----------------------------------------------------------------------
with patch.object(simulator_manager, "start", side_effect=OSError("Binary execution permission denied")):
    lifespan_raised_exception = False
    caught_exc = ""
    try:
        with TestClient(app) as client:
            pass
    except OSError as exc:
        lifespan_raised_exception = True
        caught_exc = str(exc)
    test(
        "2. Lifespan fails fast when start() raises exception",
        lifespan_raised_exception and "permission denied" in caught_exc,
        f"(Caught OSError: {caught_exc})",
        err_msg=f"Expected OSError, got: {caught_exc}"
    )

# ----------------------------------------------------------------------
# 3. Successful startup and shutdown work cleanly
# ----------------------------------------------------------------------
with TestClient(app) as client:
    test("3a. Lifespan auto-started Verilator simulator", simulator_manager.is_running())
    initial_pid = simulator_manager.pid
    test("3b. Simulator process has valid PID", initial_pid is not None and initial_pid > 0, f"(PID: {initial_pid})")

    res = client.get("/api/simulator/status")
    status_data = res.json()
    test("3c. GET /api/simulator/status connected=True", res.status_code == 200 and status_data.get("connected") is True)
    test("3d. Model initialized successfully", status_data.get("model_initialized") is True)

# Lifespan context exited: verify clean shutdown
test("3e. Lifespan shutdown cleanly stopped simulator", not simulator_manager.is_running())

# ----------------------------------------------------------------------
# 4. Two concurrent start requests create only one process
# ----------------------------------------------------------------------
start_results = []
def worker_start():
    res = simulator_manager.start()
    start_results.append(res)

t1 = threading.Thread(target=worker_start)
t2 = threading.Thread(target=worker_start)
t1.start()
t2.start()
t1.join()
t2.join()

test(
    "4a. Two concurrent start calls both succeed",
    len(start_results) == 2 and all(r.get("connected") is True for r in start_results),
    f"Results: {[r.get('connected') for r in start_results]}"
)
pids = [r.get("pid") for r in start_results]
test(
    "4b. Concurrent start calls returned identical PID (only 1 process created)",
    len(set(pids)) == 1 and pids[0] == simulator_manager.pid,
    f"(PIDs: {pids})"
)

# ----------------------------------------------------------------------
# 5. Concurrent simulator commands are serialized without corruption
# ----------------------------------------------------------------------
concurrent_cmd_results = []
errors = []

def worker_command(cmd_id):
    try:
        for _ in range(5):
            res = simulator_manager.get_status()
            if not res.get("connected") or res.get("error"):
                errors.append(f"Thread {cmd_id} got error status: {res}")
            concurrent_cmd_results.append(res.get("connected"))
    except Exception as exc:
        errors.append(f"Thread {cmd_id} exception: {exc}")

cmd_threads = [threading.Thread(target=worker_command, args=(i,)) for i in range(4)]
for t in cmd_threads:
    t.start()
for t in cmd_threads:
    t.join()

test(
    "5. Concurrent simulator commands serialized cleanly (20 commands, 0 protocol errors)",
    len(errors) == 0 and len(concurrent_cmd_results) == 20 and all(s is True for s in concurrent_cmd_results),
    f"(Completed: {len(concurrent_cmd_results)}, Errors: {errors})"
)

# ----------------------------------------------------------------------
# 6. Stop waits for an in-flight command instead of terminating mid-command
# ----------------------------------------------------------------------
in_flight_started = threading.Event()
in_flight_finish = threading.Event()
stop_completed = threading.Event()
command_interrupted = False

def simulate_in_flight():
    global command_interrupted
    # Acquire the manager lock to simulate an in-flight protocol transaction
    with simulator_manager._lock:
        in_flight_started.set()
        # Hold lock briefly to ensure stop() attempts acquisition
        time.sleep(0.3)
        # While lock was held, check that simulator was NOT terminated
        if not simulator_manager.is_running():
            command_interrupted = True
    in_flight_finish.set()

def do_stop():
    simulator_manager.stop()
    stop_completed.set()

t_cmd = threading.Thread(target=simulate_in_flight)
t_stop = threading.Thread(target=do_stop)

t_cmd.start()
in_flight_started.wait()

t_stop.start()

# Verify that stop has NOT finished yet while command is holding the lock
test(
    "6a. Stop blocked while command was in-flight holding lock",
    not stop_completed.is_set()
)

in_flight_finish.wait()
t_cmd.join()
t_stop.join()

test(
    "6b. In-flight command finished uninterrupted before stop terminated process",
    not command_interrupted and not simulator_manager.is_running()
)

# ----------------------------------------------------------------------
# 7. Failed startup cleans up the process and stderr thread
# ----------------------------------------------------------------------
test_mgr = SimulatorManager()
test_mgr.SIM_EXE = "/non/existent/path/to/binary_12345"
test_mgr.USE_WSL = False

start_fail_res = test_mgr.start()
test(
    "7a. Start with invalid binary returns connected=false",
    start_fail_res.get("connected") is False,
    f"(Message: {start_fail_res.get('message')})"
)
test(
    "7b. Process reference cleared on failed start",
    test_mgr._proc is None and not test_mgr.is_running()
)
test(
    "7c. Stderr reader thread cleared and stopped on failed start",
    test_mgr._stderr_reader is None and test_mgr._stderr_stop is True
)

# ----------------------------------------------------------------------
# 8. Restart after termination works cleanly
# ----------------------------------------------------------------------
# simulator_manager was stopped in test 6
restart_res = simulator_manager.start()
restarted_pid = simulator_manager.pid
test(
    "8a. Restart after stop succeeds",
    restart_res.get("connected") is True and simulator_manager.is_running(),
    f"(New PID: {restarted_pid})"
)

# Verify simulator is responsive after restart
status_res = simulator_manager.get_status()
test(
    "8b. Simulator status responsive after restart",
    status_res.get("connected") is True and status_res.get("model_initialized") is True
)

reset_res = simulator_manager.reset()
test(
    "8c. Simulator reset functions cleanly after restart",
    reset_res.get("status") == "ok" and reset_res.get("reset_applied") is True
)

# Clean up at end of tests
simulator_manager.stop()
test("Final cleanup: simulator stopped cleanly", not simulator_manager.is_running())

print("=" * 75)
print(f"LIFESPAN & CONCURRENCY VERIFICATION: {passed} PASSED, {failed} FAILED")
print("=" * 75)

if failed > 0:
    sys.exit(1)
