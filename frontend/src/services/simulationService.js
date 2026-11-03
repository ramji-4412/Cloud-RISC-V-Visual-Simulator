
import {
  fetchHealth,
  fetchStatus,
  fetchArchitecture,
  fetchSimulatorStatus,
  startSimulator,
  stopSimulator,
  restartSimulator,
  loadProgram,
  resetSimulator,
  stepSimulator,
  runCycles,
  runSimulator,
  fetchRegisters,
  fetchMemory,
  fetchPipelineState,
  assembleCode,
  assembleAndLoad,
  startTrace,
  stopTrace,
  fetchTraceStatus,
  fetchTraceFile
} from './backendApi.js';

export const simulationService = {
  async checkBackend() {
    try {
      const health = await fetchHealth();
      const [statusResult, architectureResult] =
        await Promise.allSettled([
          fetchStatus(),
          fetchArchitecture()
        ]);

      const status =
        statusResult.status === 'fulfilled'
          ? statusResult.value
          : null;

      const architecture =
        architectureResult.status === 'fulfilled'
          ? architectureResult.value
          : null;

      return {
        backendAlive: true,
        verilatorConnected: Boolean(status?.connected),
        health,
        status,
        architecture,
        error: [
          statusResult.status === 'rejected'
            ? statusResult.reason.message
            : null,
          architectureResult.status === 'rejected'
            ? architectureResult.reason.message
            : null
        ].filter(Boolean).join(' ')
      };
    } catch (error) {
      return {
        backendAlive: false,
        verilatorConnected: false,
        health: null,
        status: null,
        architecture: null,
        error: error.message
      };
    }
  },

  async getSimulatorStatus() {
    return fetchSimulatorStatus();
  },

  async start() {
    return startSimulator();
  },

  async stop() {
    return stopSimulator();
  },

  async restart() {
    return restartSimulator();
  },

  async load(programFile) {
    return loadProgram(programFile);
  },

  async reset() {
    return resetSimulator();
  },

  async step() {
    return stepSimulator();
  },

  async runCycles(cycles) {
    return runCycles(cycles);
  },

  async run(maxCycles) {
    return runSimulator(maxCycles);
  },

  async getRegisters() {
    return fetchRegisters();
  },

  async getMemory(address, words) {
    return fetchMemory(address, words);
  },

  async getPipelineState() {
    return fetchPipelineState();
  },

  async assemble(source) {
    return assembleCode(source);
  },

  async assembleAndLoad(source, programFile) {
    return assembleAndLoad(source, programFile);
  },

  async startTrace(filename = 'pipeline.vcd') {
    return startTrace(filename);
  },

  async stopTrace() {
    return stopTrace();
  },

  async getTraceStatus() {
    return fetchTraceStatus();
  },

  async getTraceFile(filename = 'pipeline.vcd') {
    return fetchTraceFile(filename);
  }
};
