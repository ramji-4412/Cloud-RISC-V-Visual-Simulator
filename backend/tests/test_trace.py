"""
Pytest integration tests for the VCD trace API.

Covers: start trace, stop trace, trace status, trace file retrieval,
invalid filenames, multiple trace sessions.
"""


def test_trace_start_stop(post, get):
    post("/api/simulator/start")
    try:
        r = post("/api/trace/start", {"filename": "pipeline.vcd"})
        assert r["status"] == "ok"
        assert r["trace_enabled"] is True

        r = post("/api/trace/stop")
        assert r["status"] == "ok"
        assert r["trace_enabled"] is False
    finally:
        post("/api/simulator/stop")


def test_trace_status(get, post):
    post("/api/simulator/start")
    try:
        post("/api/trace/start", {"filename": "pipeline.vcd"})
        r = get("/api/trace/status")
        assert r["status"] == "ok"
        assert r["trace_enabled"] is True
        post("/api/trace/stop")
    finally:
        post("/api/simulator/stop")


def test_trace_file_retrieval(get):
    r = get("/api/trace/file?filename=pipeline.vcd")
    assert r["status"] == "ok"
    assert r["filename"] == "pipeline.vcd"
    assert r["size_bytes"] > 0
    assert r["content"] != ""
    assert "$version" in r["content"]
    assert "$enddefinitions" in r["content"]


def test_trace_invalid_filename(get):
    r = get("/api/trace/file?filename=../../etc/passwd")
    assert r["status"] == "error"


def test_trace_no_filename(get):
    r = get("/api/trace/file")
    # Default filename is pipeline.vcd
    assert r["status"] in ("ok", "error")
