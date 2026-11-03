
const BACKEND_BASE_URL = (
  import.meta.env.VITE_BACKEND_URL || ''
).replace(/\/+$/, '');

async function request(endpoint, options = {}) {
  const url = `${BACKEND_BASE_URL}${endpoint}`;

  let response;
  const method = options.method || 'GET';

  try {
    const headers = {
      Accept: 'application/json',
      ...(options.headers || {})
    };

    let body;
    if (options.body !== undefined && options.body !== null) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(options.body);
    } else if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify({});
    }

    response = await fetch(url, {
      method,
      headers,
      body,
      signal: AbortSignal.timeout(options.timeout || 10000)
    });
  } catch (error) {
    if (error.name === 'TimeoutError') {
      throw new Error(`Backend request timed out: ${endpoint}`);
    }

    throw new Error(
      `Cannot connect to backend at ${BACKEND_BASE_URL}. ` +
      'Check that your FastAPI server is running.'
    );
  }

  const responseText = await response.text();

  let data = null;

  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch {
      throw new Error(
        `Backend returned invalid JSON for ${endpoint}.`
      );
    }
  }

  if (!response.ok) {
    const detail =
      data?.detail ||
      data?.message ||
      data?.error ||
      response.statusText;

    throw new Error(
      `Backend error (${response.status}): ${detail}`
    );
  }

  return data;
}

export function fetchHealth() {
  return request('/api/health', { timeout: 45000 });
}

export function fetchStatus() {
  return request('/api/status');
}

export function fetchArchitecture() {
  return request('/api/architecture');
}

export function fetchSimulatorStatus() {
  return request('/api/simulator/status');
}

export function startSimulator() {
  return request('/api/simulator/start', { method: 'POST' });
}

export function stopSimulator() {
  return request('/api/simulator/stop', { method: 'POST' });
}

export function restartSimulator() {
  return request('/api/simulator/restart', { method: 'POST' });
}

export function loadProgram(programFile) {
  return request('/api/simulator/load', {
    method: 'POST',
    body: { program_file: programFile }
  });
}

export function resetSimulator() {
  return request('/api/simulator/reset', { method: 'POST' });
}

export function stepSimulator() {
  return request('/api/simulator/step', { method: 'POST' });
}

export function runCycles(cycles) {
  return request('/api/simulator/run-cycles', {
    method: 'POST',
    body: { cycles }
  });
}

export function runSimulator(maxCycles) {
  return request('/api/simulator/run', {
    method: 'POST',
    body: { max_cycles: maxCycles }
  });
}

export function fetchRegisters() {
  return request('/api/simulator/registers');
}

export function fetchMemory(address, words) {
  return request('/api/simulator/memory', {
    method: 'POST',
    body: { address, words }
  });
}

export function fetchPipelineState() {
  return request('/api/simulator/pipeline');
}

export function assembleCode(source) {
  return request('/api/assembler/assemble', {
    method: 'POST',
    body: { source }
  });
}

export function assembleAndLoad(source, programFile) {
  return request('/api/assembler/assemble-and-load', {
    method: 'POST',
    body: { source, program_file: programFile }
  });
}

export function startTrace(filename = 'pipeline.vcd') {
  return request('/api/trace/start', {
    method: 'POST',
    body: { filename }
  });
}

export function stopTrace() {
  return request('/api/trace/stop', { method: 'POST' });
}

export function fetchTraceStatus() {
  return request('/api/trace/status');
}

export function fetchTraceFile(filename = 'pipeline.vcd') {
  return request(`/api/trace/file?filename=${encodeURIComponent(filename)}`);
}

export { BACKEND_BASE_URL };
