"""
Pytest configuration and fixtures for backend integration tests.

Tests assume the FastAPI backend is running at http://127.0.0.1:8000.
A session-scoped fixture ensures the Verilator simulator is stopped
after all tests complete, preventing orphan processes.
"""

import json
import urllib.request
import urllib.error
import pytest

BASE_URL = "http://127.0.0.1:8000"


def _get(endpoint):
    """GET helper returning parsed JSON."""
    with urllib.request.urlopen(BASE_URL + endpoint, timeout=10) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _post(endpoint, data=None, timeout=15):
    """POST helper returning parsed JSON."""
    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(
        BASE_URL + endpoint,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        return json.loads(exc.read().decode("utf-8"))


@pytest.fixture(scope="session")
def backend_url():
    return BASE_URL


@pytest.fixture(scope="session", autouse=True)
def ensure_simulator_stopped():
    """Ensure the simulator is stopped after all tests finish."""
    yield
    _post("/api/simulator/stop", {})


@pytest.fixture
def get():
    return _get


@pytest.fixture
def post():
    return _post
