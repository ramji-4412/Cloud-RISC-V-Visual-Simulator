import React, { useState, useCallback, useEffect } from 'react';
import { simulationService } from './services/simulationService.js';
import {
  assembleRV32I,
  simulateStep,
  createInitialState
} from './services/simulatorEngine.js';
import { parseVcd } from './components/waveform/VcdParser.js';
import WaveformStudio from './components/waveform/WaveformStudio.jsx';
import AssemblyEditor from './components/editor/AssemblyEditor.jsx';
import PipelineScene3D from './components/pipeline/PipelineScene3D.jsx';
import PipelineFlowView from './components/pipeline/PipelineFlowView.jsx';
import RegisterFileInspector from './components/inspector/RegisterFileInspector.jsx';
import InstructionDecoderInspector from './components/inspector/InstructionDecoderInspector.jsx';
import MemoryViewer from './components/inspector/MemoryViewer.jsx';
import {
  Cpu,
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Sliders,
  Settings,
  Upload,
  AlertTriangle,
  X,
  Database,
  Layers,
  GitCommit,
  Box,
  Activity,
  Code2
} from 'lucide-react';

const EXAMPLE_PROGRAM = `# RV32I Sample Benchmark
# Demonstrates arithmetic, memory access, & forwarding
addi x1, x0, 5
addi x2, x0, 7
add  x3, x1, x2
sw   x3, 0(x0)
lw   x4, 0(x0)
addi x5, x4, 1`;

const STAGE_CONFIGS = [
  { key: 'IF', name: 'Instruction Fetch', color: 0x06b6d4, x: -14 },
  { key: 'ID', name: 'Instruction Decode', color: 0x3b82f6, x: -7 },
  { key: 'EX', name: 'Execute / ALU', color: 0x8b5cf6, x: 0 },
  { key: 'MEM', name: 'Memory Access', color: 0xec4899, x: 7 },
  { key: 'WB', name: 'Write Back', color: 0x10b981, x: 14 }
];

function App() {
  // Source & Assembly
  const [source, setSource] = useState(EXAMPLE_PROGRAM);
  const [assembledProgram, setAssembledProgram] = useState([]);
  const [assemblyErrors, setAssemblyErrors] = useState([]);
  const [checkStatus, setCheckStatus] = useState(null);

  // Simulation State
  const [clientSim, setClientSim] = useState(createInitialState);
  const [isRunning, setIsRunning] = useState(false);
  const [clockSpeed, setClockSpeed] = useState(1.5); // Hz (cycles/sec)
  const [selectedStage, setSelectedStage] = useState('EX');
  const [activeTab, setActiveTab] = useState('flow'); // 'flow' | '3d' | 'waveforms'
  const [inspectorTab, setInspectorTab] = useState('registers'); // 'registers' | 'memory'

  // Mobile viewport section tab: 'all' | 'editor' | 'pipeline' | 'state'
  const [mobileSection, setMobileSection] = useState('all');

  // Backend link
  const [backendConnected, setBackendConnected] = useState(false);
  const [verilatorReady, setVerilatorReady] = useState(false);
  const [simError, setSimError] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // VCD Tracing
  const [parsedVcd, setParsedVcd] = useState(null);
  const [isTracing, setIsTracing] = useState(false);

  // Memory inspect address
  const [memoryAddress, setMemoryAddress] = useState(0);
  const [memoryWords, setMemoryWords] = useState(16);

  // ----------------------------------------------------------------
  // Initial assembly on mount
  // ----------------------------------------------------------------
  const handleInitialAssemble = useCallback(() => {
    const { instructions, errors } = assembleRV32I(source);
    setAssemblyErrors(errors);
    if (errors.length === 0) {
      setAssembledProgram(instructions);
    }
  }, [source]);

  useEffect(() => {
    handleInitialAssemble();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ----------------------------------------------------------------
  // Probe backend health (FastAPI RTL Link)
  // ----------------------------------------------------------------
  const probeBackendHealth = useCallback(async () => {
    try {
      const info = await simulationService.checkBackend();
      setBackendConnected(Boolean(info.backendAlive));
      setVerilatorReady(Boolean(info.verilatorConnected));
    } catch {
      setBackendConnected(false);
      setVerilatorReady(false);
    }
  }, []);

  useEffect(() => {
    probeBackendHealth();
    const interval = setInterval(probeBackendHealth, 15000);
    return () => clearInterval(interval);
  }, [probeBackendHealth]);

  // ----------------------------------------------------------------
  // Map Live Verilator RTL Execution State to Frontend Visuals
  // ----------------------------------------------------------------
  const mapRtlStateToUi = useCallback((rtlResult, prevSim, prog = []) => {
    if (!rtlResult || rtlResult.status !== 'ok') {
      return prevSim;
    }

    const ps = rtlResult.pipeline_state?.state || rtlResult.pipeline_state || {};
    const cycle = typeof rtlResult.cycles === 'number' ? rtlResult.cycles : prevSim.cycle;

    // 1. Hardware Registers (from Verilator debug_reg_data port)
    const hardwareRegs = new Int32Array(32);
    let modifiedReg = -1;
    if (Array.isArray(rtlResult.registers) && rtlResult.registers.length === 32) {
      for (let i = 0; i < 32; i++) {
        const val = rtlResult.registers[i]?.value ?? 0;
        hardwareRegs[i] = i === 0 ? 0 : val;
        if (prevSim.registers && prevSim.registers[i] !== val && i !== 0) {
          modifiedReg = i;
        }
      }
    } else {
      for (let i = 0; i < 32; i++) hardwareRegs[i] = prevSim.registers[i] || 0;
    }
    hardwareRegs[0] = 0; // x0 hardwired to zero in hardware

    // 2. Hardware Data Memory (from Verilator debug_dmem_data port)
    const hardwareMem = { ...(prevSim.memory || {}) };
    let modifiedMem = -1;
    if (Array.isArray(rtlResult.memory)) {
      rtlResult.memory.forEach(item => {
        if (item.value !== 0 || hardwareMem[item.address] !== undefined) {
          if (hardwareMem[item.address] !== item.value) {
            modifiedMem = item.address;
          }
          hardwareMem[item.address] = item.value;
        }
      });
    }

    // 3. Hardware Hazards & Pipeline Flow Signals
    const stall = Boolean(ps.control_stall);
    const redirect = Boolean(ps.redirect);
    const pcSel = ps.pc_sel ?? 0;
    const branchTaken = Boolean(redirect && pcSel === 1);

    const getInstAtPc = (pc) => {
      if (pc === null || pc === undefined) return null;
      return prog.find(inst => inst.pc === pc) || null;
    };

    const ifInst = getInstAtPc(ps.fetch_pc);
    const idInst = getInstAtPc(ps.if_id_pc);
    const exInst = getInstAtPc(ps.ex_pc);

    // 4. Construct 5-Stage Hardware Latches
    const pipeline = {
      IF: {
        valid: cycle > 0,
        pc: ps.fetch_pc ?? 0,
        rawInstruction: ps.fetch_instruction ?? 0,
        instruction: ifInst,
        stageStatus: cycle === 0 ? 'not_started' : stall ? 'stalled' : 'active',
        statusLabel: cycle === 0 ? 'Not Started' : stall ? 'Stalled / Held' : 'Active',
        statusReason: cycle === 0 ? 'Simulation idle. Ready to start.' : stall ? 'PC held by hazard detection unit (load-use hazard).' : 'Instruction fetched from memory.'
      },
      ID: {
        valid: cycle > 1 && !redirect,
        pc: ps.if_id_pc ?? 0,
        rawInstruction: ps.if_id_instruction ?? 0,
        instruction: redirect ? null : idInst,
        rs1: ps.id_rs1_data ?? 0,
        rs2: ps.id_rs2_data ?? 0,
        rd: exInst?.rd ?? 0,
        imm: ps.id_imm ?? 0,
        stageStatus: cycle <= 1 ? 'empty' : redirect ? 'flushed' : stall ? 'stalled' : 'active',
        statusLabel: cycle <= 1 ? 'Empty' : redirect ? 'Flushed' : stall ? 'Stalled' : 'Active',
        statusReason: cycle <= 1 ? 'Decode latch empty.' : redirect ? 'Flushed due to branch redirect.' : stall ? 'Decode stage stalled waiting for memory operand.' : 'Decoded registers & immediate operand.'
      },
      EX: {
        valid: cycle > 2 && !stall && !redirect,
        pc: ps.ex_pc ?? 0,
        instruction: (stall || redirect) ? null : exInst,
        aluResult: ps.mem_alu_result ?? 0,
        branchTaken: branchTaken,
        stageStatus: cycle <= 2 ? 'empty' : stall ? 'bubble' : redirect ? 'flushed' : 'active',
        statusLabel: cycle <= 2 ? 'Empty' : stall ? 'Bubble' : redirect ? 'Flushed' : 'Active',
        statusReason: cycle <= 2 ? 'Execution unit idle.' : stall ? 'Bubble injected into execute stage.' : redirect ? 'Branch redirect active.' : 'ALU execution complete.'
      },
      MEM: {
        valid: cycle > 3,
        memAddr: ps.mem_alu_result ?? 0,
        memWriteData: ps.mem_store_data ?? 0,
        memRead: Boolean(ps.mem_alu_result !== undefined && ps.ex_opcode === 0x03),
        memWrite: Boolean(ps.mem_alu_result !== undefined && ps.ex_opcode === 0x23),
        instruction: cycle > 3 ? (prog.find(inst => inst.rd === ps.mem_rd) || null) : null,
        stageStatus: cycle <= 3 ? 'empty' : 'active',
        statusLabel: cycle <= 3 ? 'Empty' : 'Active',
        statusReason: cycle <= 3 ? 'Data memory bus inactive.' : 'Data memory access stage.'
      },
      WB: {
        valid: cycle > 4 && Boolean(ps.wb_writeback_enable),
        writeReg: ps.wb_writeback_rd ?? 0,
        writeData: ps.wb_writeback_data ?? 0,
        regWrite: Boolean(ps.wb_writeback_enable),
        instruction: cycle > 4 && ps.wb_writeback_rd ? (prog.find(inst => inst.rd === ps.wb_writeback_rd) || null) : null,
        stageStatus: cycle <= 4 ? 'empty' : ps.wb_writeback_enable ? 'active' : 'empty',
        statusLabel: cycle <= 4 ? 'Empty' : ps.wb_writeback_enable ? 'Commit' : 'Idle',
        statusReason: cycle <= 4 ? 'Writeback bus inactive.' : ps.wb_writeback_enable ? `Committed 0x${(ps.wb_writeback_data >>> 0).toString(16).toUpperCase()} to x${ps.wb_writeback_rd}.` : 'No writeback scheduled.'
      }
    };

    // 5. Append Real RTL Waveform Telemetry Point
    const newWaveformPoint = {
      cycle,
      clk: cycle % 2 === 0 ? 0 : 1,
      pc: ps.fetch_pc ?? 0,
      if_id_valid: cycle > 0 ? 1 : 0,
      id_ex_valid: (cycle > 1 && !redirect) ? 1 : 0,
      ex_mem_valid: (cycle > 2 && !stall) ? 1 : 0,
      mem_wb_valid: cycle > 3 ? 1 : 0,
      stall: stall ? 1 : 0,
      flush: redirect ? 1 : 0,
      fwdA: 'NONE',
      fwdB: 'NONE',
      alu_out: ps.mem_alu_result ?? 0,
      reg_write: ps.wb_writeback_enable ? 1 : 0,
      mem_read: ps.ex_opcode === 0x03 ? 1 : 0,
      mem_write: ps.ex_opcode === 0x23 ? 1 : 0
    };

    const updatedWaveforms = [...(prevSim.waveforms || [])];
    if (updatedWaveforms.length > 100) updatedWaveforms.shift();
    updatedWaveforms.push(newWaveformPoint);

    return {
      cycle,
      pc: ps.fetch_pc ?? prevSim.pc,
      registers: hardwareRegs,
      recentRegMod: modifiedReg !== -1 ? modifiedReg : prevSim.recentRegMod,
      memory: hardwareMem,
      recentMemMod: modifiedMem !== -1 ? modifiedMem : prevSim.recentMemMod,
      pipeline,
      hazards: {
        stall,
        flush: redirect,
        forwardA: (ps.mem_rd && ps.mem_rd === (exInst?.rs1)) ? 'EX/MEM' : (ps.wb_writeback_rd && ps.wb_writeback_rd === (exInst?.rs1)) ? 'MEM/WB' : 'NONE',
        forwardB: (ps.mem_rd && ps.mem_rd === (exInst?.rs2)) ? 'EX/MEM' : (ps.wb_writeback_rd && ps.wb_writeback_rd === (exInst?.rs2)) ? 'MEM/WB' : 'NONE'
      },
      waveforms: updatedWaveforms
    };
  }, []);

  // ----------------------------------------------------------------
  // Single Step Execution (Verilator RTL State Synchronization)
  // ----------------------------------------------------------------
  const handleStep = useCallback(async () => {
    if (backendConnected && verilatorReady) {
      try {
        const rtlResult = await simulationService.step();
        if (rtlResult && rtlResult.status === 'ok') {
          setClientSim(prev => mapRtlStateToUi(rtlResult, prev, assembledProgram));
          return;
        }
      } catch (e) {
        console.warn('Backend step error, falling back to client emulator:', e.message);
      }
    }

    // Offline emulation fallback only when backend is disconnected
    setClientSim(prev => simulateStep(prev, assembledProgram));
  }, [assembledProgram, backendConnected, verilatorReady, mapRtlStateToUi]);

  // ----------------------------------------------------------------
  // Run Loop (Continuous Clock Ticking Driven by Verilator)
  // ----------------------------------------------------------------
  useEffect(() => {
    if (!isRunning) return;

    let isCancelled = false;
    const intervalTime = Math.max(80, Math.floor(1000 / clockSpeed));

    const tick = async () => {
      if (isCancelled) return;
      await handleStep();
    };

    const intervalId = setInterval(tick, intervalTime);

    return () => {
      isCancelled = true;
      clearInterval(intervalId);
    };
  }, [isRunning, clockSpeed, handleStep]);

  // ----------------------------------------------------------------
  // Play / Pause Toggle
  // ----------------------------------------------------------------
  const handleRunToggle = useCallback(() => {
    setIsRunning(prev => !prev);
  }, []);

  // ----------------------------------------------------------------
  // Reset Simulation
  // ----------------------------------------------------------------
  const handleReset = useCallback(async () => {
    setIsRunning(false);

    if (backendConnected) {
      try {
        const resetResult = await simulationService.reset();
        if (resetResult && resetResult.status === 'ok') {
          setClientSim(() => {
            const fresh = createInitialState();
            if (Array.isArray(resetResult.registers) && resetResult.registers.length === 32) {
              const hardwareRegs = new Int32Array(32);
              resetResult.registers.forEach(r => {
                hardwareRegs[r.index] = r.index === 0 ? 0 : (r.value ?? 0);
              });
              fresh.registers = hardwareRegs;
            }
            if (resetResult.pipeline_state) {
              const ps = resetResult.pipeline_state.state || resetResult.pipeline_state;
              fresh.pc = ps.fetch_pc ?? 0;
            }
            return fresh;
          });
          return;
        }
      } catch (e) {
        console.warn('Backend reset error:', e.message);
      }
    }

    setClientSim(createInitialState());
  }, [backendConnected]);

  // ----------------------------------------------------------------
  // Check Syntax (Syntax Validator)
  // ----------------------------------------------------------------
  const handleCheckSyntax = useCallback(() => {
    const { instructions, errors } = assembleRV32I(source);
    setAssemblyErrors(errors);
    if (errors.length === 0) {
      setCheckStatus({
        valid: true,
        message: `✓ Syntax Valid: ${instructions.length} RV32I instructions parsed with no errors.`
      });
      setSimError(null);
    } else {
      setCheckStatus({
        valid: false,
        message: `⚠ ${errors.length} syntax error(s) detected. Check diagnostic console below.`
      });
    }
  }, [source]);

  // ----------------------------------------------------------------
  // Assemble & Load Program (Loads into I-Mem and resets CPU)
  // ----------------------------------------------------------------
  const handleAssembleAndLoad = useCallback(async () => {
    setIsRunning(false);
    setSimError(null);

    const { instructions, errors } = assembleRV32I(source);
    setAssemblyErrors(errors);

    if (errors.length === 0) {
      setAssembledProgram(instructions);
      setCheckStatus({
        valid: true,
        message: `✓ Program loaded: ${instructions.length} instructions in I-Mem. Ready to Run!`
      });

      if (backendConnected) {
        try {
          await simulationService.start();
          await simulationService.assembleAndLoad(source, 'assembled.hex');
          const resetRes = await simulationService.reset();
          setClientSim(() => {
            const fresh = createInitialState();
            if (resetRes && resetRes.status === 'ok' && Array.isArray(resetRes.registers)) {
              const regs = new Int32Array(32);
              resetRes.registers.forEach(r => { regs[r.index] = r.index === 0 ? 0 : (r.value ?? 0); });
              fresh.registers = regs;
            }
            return fresh;
          });
        } catch (e) {
          console.warn('Backend load warning:', e.message);
          setClientSim(createInitialState());
        }
      } else {
        setClientSim(createInitialState());
      }
    } else {
      setCheckStatus({
        valid: false,
        message: `⚠ Cannot load program: ${errors.length} syntax error(s) in source.`
      });
      setSimError(`Assembly failed with ${errors.length} error(s). Please review the errors in the Assembly Source panel.`);
    }
  }, [source, backendConnected]);

  const handleSourceChange = useCallback((newSource) => {
    setSource(newSource);
    setCheckStatus(null);
  }, []);

  const handleClearSource = useCallback(() => {
    setIsRunning(false);
    setSource('');
    setAssembledProgram([]);
    setAssemblyErrors([]);
    setCheckStatus(null);
    setClientSim(createInitialState());
  }, []);

  const handleLoadExample = useCallback(() => {
    setIsRunning(false);
    setSource(EXAMPLE_PROGRAM);
    const { instructions, errors } = assembleRV32I(EXAMPLE_PROGRAM);
    setAssemblyErrors(errors);
    setAssembledProgram(instructions);
    setCheckStatus(null);
    setClientSim(createInitialState());
  }, []);

  // ----------------------------------------------------------------
  // Trace actions (Verilator VCD)
  // ----------------------------------------------------------------
  const handleStartTrace = useCallback(async () => {
    if (!backendConnected) {
      setSimError('Verilator RTL backend is offline. Use "Sample VCD" to view hardware traces.');
      return;
    }
    try {
      await simulationService.startTrace('pipeline.vcd');
      setIsTracing(true);
    } catch (e) {
      setSimError(e.message);
    }
  }, [backendConnected]);

  const handleStopTrace = useCallback(async () => {
    if (!backendConnected) return;
    try {
      await simulationService.stopTrace();
      setIsTracing(false);
      const file = await simulationService.getTraceFile('pipeline.vcd');
      if (file?.content) {
        setParsedVcd(parseVcd(file.content));
      }
    } catch (e) {
      setSimError(e.message);
    }
  }, [backendConnected]);

  // Convert memory object to MemoryViewer format
  const memoryArray = Object.keys(clientSim.memory).map(addr => ({
    address: parseInt(addr, 10),
    word_index: Math.floor(parseInt(addr, 10) / 4),
    value: clientSim.memory[addr] || 0
  }));

  // ================================================================
  // RENDER
  // ================================================================
  return (
    <div className="flex flex-col w-screen min-h-screen lg:h-screen bg-[#070b14] text-slate-100 overflow-x-hidden lg:overflow-hidden font-sans select-none">
      {/* ==================================================================== */}
      {/* 1. TOP NAVIGATION & CONTROL BAR (RESPONSIVE) */}
      {/* ==================================================================== */}
      <header className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5 px-3 sm:px-4 py-2 bg-slate-950/90 border-b border-slate-800/80 backdrop-blur-md z-30 shrink-0">
        {/* Brand & Architecture badges */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20 shrink-0">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-extrabold text-xs sm:text-sm tracking-wide bg-gradient-to-r from-cyan-400 via-sky-200 to-indigo-300 bg-clip-text text-transparent">
                  Cloud RISC-V Studio
                </span>
                <span className="px-1.5 py-0.5 text-[9px] sm:text-[10px] bg-slate-800/90 border border-slate-700 text-cyan-300 font-mono rounded font-semibold">
                  RV32I · 5-Stage
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] text-slate-400 font-mono">
                <span className="flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${backendConnected ? 'bg-emerald-400 animate-pulse' : 'bg-cyan-400'}`} />
                  {backendConnected ? 'FastAPI RTL Link' : 'Emulation'}
                </span>
                <span>•</span>
                <span className="text-slate-500 hidden xs:inline">
                  Verilator: {verilatorReady ? 'Synchronized' : 'Emulated'}
                </span>
              </div>
            </div>
          </div>

          {/* Settings button on mobile */}
          <div className="flex items-center gap-1.5 lg:hidden">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 transition"
              title="Studio Configuration"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Central Cycle Counter & Step Playback Controls */}
        <div className="flex flex-wrap items-center justify-between sm:justify-start gap-2 sm:gap-3 bg-slate-900/80 border border-slate-800 px-2.5 sm:px-3 py-1.5 rounded-xl shadow-inner overflow-x-auto">
          {/* Cycle counter */}
          <div className="flex items-center gap-1 pr-2 sm:pr-3 border-r border-slate-800 font-mono">
            <span className="text-[10px] uppercase text-slate-500 font-bold">Cycle</span>
            <span className="text-xs sm:text-sm font-bold text-cyan-400 w-10 sm:w-12 text-right">
              {clientSim.cycle}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1">
            {/* Run / Pause Button */}
            <button
              onClick={handleRunToggle}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition ${
                isRunning
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/30'
                  : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/30'
              }`}
              title={isRunning ? 'Pause execution' : 'Run continuous simulation'}
            >
              {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isRunning ? 'Pause' : 'Run'}</span>
            </button>

            {/* Single Step Button */}
            <button
              onClick={handleStep}
              disabled={isRunning}
              className="p-1.5 sm:p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-lg transition"
              title="Single Cycle Step"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>

            {/* Reset Button */}
            <button
              onClick={handleReset}
              className="p-1.5 sm:p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition"
              title="Reset simulation to Cycle 0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Clock Speed Slider */}
          <div className="flex items-center gap-1.5 sm:gap-2 pl-2 sm:pl-3 border-l border-slate-800">
            <Sliders className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="range"
              min="0.5"
              max="8"
              step="0.5"
              value={clockSpeed}
              onChange={(e) => setClockSpeed(parseFloat(e.target.value))}
              className="w-12 sm:w-16 accent-cyan-400 cursor-pointer"
              title={`Simulation Frequency: ${clockSpeed}Hz`}
            />
            <span className="text-[10px] sm:text-[11px] font-mono text-cyan-300 w-10 sm:w-12">{clockSpeed}Hz</span>
          </div>

          {/* Assemble & Load button */}
          <div className="pl-2 sm:pl-3 border-l border-slate-800">
            <button
              onClick={handleAssembleAndLoad}
              className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition active:scale-95"
              title="Assemble RV32I source code and load into simulator"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Assemble & Load</span>
            </button>
          </div>
        </div>

        {/* View Switches & Desktop Settings */}
        <div className="flex items-center justify-between sm:justify-end gap-2">
          {/* Main Stage View Switcher */}
          <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('flow')}
              className={`px-2 sm:px-2.5 py-1 rounded font-semibold flex items-center gap-1 transition ${
                activeTab === 'flow'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="5-Stage Microarchitectural Flow View"
            >
              <GitCommit className="w-3.5 h-3.5" />
              <span>Pipeline</span>
            </button>
            <button
              onClick={() => setActiveTab('3d')}
              className={`px-2 sm:px-2.5 py-1 rounded font-semibold flex items-center gap-1 transition ${
                activeTab === '3d'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="3D Spatial Stage View"
            >
              <Box className="w-3.5 h-3.5" />
              <span>3D View</span>
            </button>
            <button
              onClick={() => setActiveTab('waveforms')}
              className={`px-2 sm:px-2.5 py-1 rounded font-semibold flex items-center gap-1 transition ${
                activeTab === 'waveforms'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Logic Analyzer & Verilator VCD Waveforms"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Waveforms</span>
            </button>
          </div>

          {/* Desktop settings button */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="hidden lg:flex p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 transition"
            title="Studio Configuration"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ==================================================================== */}
      {/* MOBILE / TABLET WORKSPACE NAVIGATOR (Visible < lg) */}
      {/* ==================================================================== */}
      <div className="flex lg:hidden items-center justify-around bg-slate-950 border-b border-slate-800 px-2 py-1.5 text-xs font-mono shrink-0">
        <button
          onClick={() => setMobileSection('all')}
          className={`px-2.5 py-1 rounded transition ${
            mobileSection === 'all' ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/50' : 'text-slate-400 hover:text-white'
          }`}
        >
          All Panels
        </button>
        <button
          onClick={() => setMobileSection('editor')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded transition ${
            mobileSection === 'editor' ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/50' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Code2 className="w-3 h-3" />
          Source
        </button>
        <button
          onClick={() => setMobileSection('pipeline')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded transition ${
            mobileSection === 'pipeline' ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/50' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Cpu className="w-3 h-3" />
          Pipeline
        </button>
        <button
          onClick={() => setMobileSection('state')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded transition ${
            mobileSection === 'state' ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/50' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Database className="w-3 h-3" />
          State
        </button>
      </div>

      {/* ==================================================================== */}
      {/* ERROR BANNER */}
      {/* ==================================================================== */}
      {simError && (
        <div className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-rose-950/80 border-b border-rose-800/80 text-rose-300 text-xs shrink-0">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          <span className="flex-1 font-mono truncate">{simError}</span>
          <button onClick={() => setSimError(null)} className="p-0.5 hover:bg-rose-800/40 rounded">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 2. MAIN ENGINEERING WORKSPACE GRID (RESPONSIVE) */}
      {/* ==================================================================== */}
      <main className="flex-1 grid grid-cols-12 gap-3 p-2.5 sm:p-3 overflow-y-auto lg:overflow-hidden min-h-0">
        {/* Left Column: Assembly Code Editor */}
        <div
          className={`col-span-12 lg:col-span-3 flex-col h-[400px] lg:h-full min-h-[300px] ${
            mobileSection === 'all' || mobileSection === 'editor' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          <AssemblyEditor
            source={source}
            onChange={handleSourceChange}
            onClear={handleClearSource}
            onRunExample={handleLoadExample}
            onCheck={handleCheckSyntax}
            onAssembleAndLoad={handleAssembleAndLoad}
            lineErrors={assemblyErrors}
            checkStatus={checkStatus}
            currentPC={clientSim.pc}
          />
        </div>

        {/* Center Column: Pipeline Flow / 3D Scene / Waveform Studio */}
        <div
          className={`col-span-12 lg:col-span-6 flex-col h-[520px] lg:h-full min-h-[400px] gap-2.5 sm:gap-3 ${
            mobileSection === 'all' || mobileSection === 'pipeline' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          <div className="flex-1 min-h-[320px]">
            {activeTab === 'flow' && (
              <PipelineFlowView
                pipelineState={clientSim.pipeline}
                hazards={clientSim.hazards}
                cycle={clientSim.cycle}
                selectedStage={selectedStage}
                onSelectStage={setSelectedStage}
              />
            )}
            {activeTab === '3d' && (
              <PipelineScene3D
                pipelineState={clientSim.pipeline}
                hazards={clientSim.hazards}
                selectedStage={selectedStage}
                onSelectStage={setSelectedStage}
              />
            )}
            {activeTab === 'waveforms' && (
              <WaveformStudio
                waveforms={clientSim.waveforms}
                currentCycle={clientSim.cycle}
                vcdData={parsedVcd}
                onLoadVcd={setParsedVcd}
                onStartTrace={handleStartTrace}
                onStopTrace={handleStopTrace}
                isTracing={isTracing}
              />
            )}
          </div>

          {/* Quick Microarchitectural Latch Status Bar */}
          <div className="h-16 bg-slate-900 border border-slate-800 rounded-xl p-2 flex items-center justify-between font-mono text-xs shadow-lg shrink-0 overflow-x-auto">
            <div className="flex items-center justify-between w-full min-w-[560px]">
              {STAGE_CONFIGS.map((cfg) => {
                const stageData = clientSim.pipeline?.[cfg.key];
                const inst = stageData?.instruction;
                const status = stageData?.stageStatus || (stageData?.valid && inst ? 'active' : 'empty');
                const label = stageData?.statusLabel || (stageData?.valid && inst ? (inst.source || `PC:${inst.pc}`) : 'Empty');
                const reason = stageData?.statusReason || '';

                const statusBadgeColors = {
                  active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
                  stalled: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
                  bubble: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
                  flushed: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
                  reset: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
                  not_started: 'bg-slate-700/30 text-slate-400 border-slate-700/50',
                  empty: 'bg-slate-800/40 text-slate-400 border-slate-700/40'
                };
                const badgeCls = statusBadgeColors[status] || statusBadgeColors.empty;

                return (
                  <div
                    key={cfg.key}
                    onClick={() => setSelectedStage(cfg.key)}
                    className={`flex-1 min-w-[105px] flex flex-col px-2 py-1 mx-0.5 rounded cursor-pointer transition border overflow-hidden ${
                      selectedStage === cfg.key
                        ? 'bg-slate-800 border-cyan-500 shadow-sm'
                        : 'border-transparent hover:bg-slate-800/40'
                    }`}
                    title={`${cfg.name}: ${label}${reason ? ` (${reason})` : ''}`}
                  >
                    <div className="flex items-center justify-between gap-1 text-[10px] min-w-0">
                      <span className="font-bold text-slate-300 shrink-0">{cfg.key}</span>
                      <span className={`text-[8px] uppercase px-1 py-0.2 rounded font-mono border shrink-0 truncate max-w-[70px] ${badgeCls}`}>
                        {status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="truncate font-semibold text-slate-200 mt-0.5 text-[11px]">
                      {label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Multi-Tab Architectural Inspectors */}
        <div
          className={`col-span-12 lg:col-span-3 flex-col h-[520px] lg:h-full min-h-[380px] gap-2.5 sm:gap-3 ${
            mobileSection === 'all' || mobileSection === 'state' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Top Half: Instruction Decoder */}
          <div className="h-1/2 min-h-[190px]">
            <InstructionDecoderInspector
              stageKey={selectedStage}
              stageData={clientSim.pipeline?.[selectedStage]}
            />
          </div>

          {/* Bottom Half: Registers or Memory Inspector */}
          <div className="h-1/2 min-h-[220px] flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            {/* Inspector Tab Switcher */}
            <div className="flex items-center border-b border-slate-800 bg-slate-950/80 px-2 py-1 gap-1 text-[11px] shrink-0">
              <button
                onClick={() => setInspectorTab('registers')}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded font-semibold transition ${
                  inspectorTab === 'registers'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                Register File
              </button>
              <button
                onClick={() => setInspectorTab('memory')}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded font-semibold transition ${
                  inspectorTab === 'memory'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                Data Memory
              </button>
            </div>

            <div className="flex-1 min-h-0">
              {inspectorTab === 'registers' ? (
                <RegisterFileInspector
                  registers={Array.from(clientSim.registers)}
                  recentMod={clientSim.recentRegMod}
                />
              ) : (
                <MemoryViewer
                  memory={memoryArray}
                  cycles={clientSim.cycle}
                  onRefresh={() => {}}
                  address={memoryAddress}
                  words={memoryWords}
                  onAddressChange={setMemoryAddress}
                  onWordsChange={setMemoryWords}
                  busy={false}
                />
              )}
            </div>
          </div>
        </div>
      </main>

      {/* ==================================================================== */}
      {/* 3. SETTINGS MODAL */}
      {/* ==================================================================== */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-xl p-4 sm:p-5 shadow-2xl font-mono text-xs text-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-cyan-400" />
                <h3 className="font-bold text-sm text-slate-100 uppercase tracking-wider">
                  Studio Configuration
                </h3>
              </div>
              <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-white text-base p-1">✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-slate-400 block mb-1.5 font-semibold">FastAPI Simulation Backend URL</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    defaultValue="http://127.0.0.1:8000"
                    disabled
                    className="flex-1 bg-slate-950 border border-slate-700 px-3 py-2 rounded text-slate-500 outline-none"
                  />
                  <button
                    onClick={probeBackendHealth}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded font-semibold transition"
                  >
                    Probe
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  When the FastAPI backend is active, Cloud RISC-V coordinates with the Verilator C++ simulation model. Otherwise, cycle-accurate browser emulation is automatically enabled.
                </p>
              </div>

              <div className="bg-slate-950 p-3 rounded border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <div className="font-bold text-slate-300">Processor Microarchitecture Specs:</div>
                <div>• Target ISA: RV32I (Base 32-bit Integer Instruction Set)</div>
                <div>• Pipeline: 5-Stage In-Order (IF, ID, EX, MEM, WB)</div>
                <div>• Branch Resolution: EX Stage (Predict-Not-Taken)</div>
                <div>• Hazard Units: Load-Use Interlock & EX/MEM Forwarding Bypasses</div>
                <div>• Waveforms: Real-Time Digital Logic Analyzer & Verilator VCD</div>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded shadow transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
