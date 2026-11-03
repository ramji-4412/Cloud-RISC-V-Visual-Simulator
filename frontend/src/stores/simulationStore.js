/**
 * simulationStore.js
 *
 * A tiny, dependency-free reactive state store for the simulator UI.
 *
 * We deliberately avoid Redux / Zustand / MobX: the simulation state is
 * small and mostly driven by async API calls. This store is just a
 * pub/sub wrapper around a plain state object so that hooks and
 * components can subscribe to slices of state without prop drilling.
 *
 * The store holds ONLY information that comes from the real backend.
 * Nothing here is fabricated or emulated.
 */

const listeners = new Set();

const INITIAL_STATE = {
  // Backend connectivity.
  backendAlive: false,
  backendError: null,
  isChecking: false,

  // Simulator engine.
  simConnected: false,
  simEngine: null,
  simMessage: '',
  modelInitialized: false,
  programLoaded: false,
  programFile: null,
  resetApplied: false,
  cycleCount: 0,
  traceEnabled: false,
  simError: false,
  simErrorMessage: null,

  // Assembly / machine code.
  source: '',
  assembleResult: null,      // raw response from /api/assembler/assemble
  assembleError: null,       // string or null
  isAssembling: false,
  isAssembleLoading: false,

  // Simulation operations.
  isOperating: false,
  lastOperation: null,       // { command, status, message }

  // Processor state (always from the real backend).
  registers: [],             // [{ register, index, value }]
  memory: [],                // [{ address, word_index, value }]
  memoryAddress: 0,
  memoryWords: 16,
  pipelineState: null,        // raw state object from /api/simulator/pipeline

  // Architecture description.
  architecture: null,        // { name, isa, xlen, pipeline_stages, ... }

  // Waveform / VCD.
  trace: null,               // parsed VCD or null
  traceLoading: false,
  traceError: null,
};

let state = { ...INITIAL_STATE };

function getSnapshot() {
  return state;
}

function setState(partial) {
  state = { ...state, ...partial };
  const snap = state;
  listeners.forEach((fn) => {
    try {
      fn(snap);
    } catch (err) {
      // Never let a listener throw and break the store.
      console.error('simulationStore listener error', err);
    }
  });
}

function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function reset() {
  state = { ...INITIAL_STATE };
  listeners.forEach((fn) => fn(state));
}

export const simulationStore = {
  getState: getSnapshot,
  setState,
  subscribe,
  reset,
  INITIAL_STATE,
};
