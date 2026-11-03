import React, { useState } from 'react';
import {
  ArrowRight,
  PlayCircle,
  PauseCircle,
  AlertOctagon,
  RefreshCw,
  MinusCircle,
  Cpu,
  Layers,
  Zap,
  Info,
  CheckCircle2,
  X
} from 'lucide-react';

const STAGES = [
  { key: 'IF', name: 'Instruction Fetch', short: 'Fetch', color: '#06b6d4', bg: 'bg-cyan-500/10', border: 'border-cyan-500/40' },
  { key: 'ID', name: 'Instruction Decode', short: 'Decode', color: '#3b82f6', bg: 'bg-blue-500/10', border: 'border-blue-500/40' },
  { key: 'EX', name: 'Execute / ALU', short: 'Execute', color: '#8b5cf6', bg: 'bg-purple-500/10', border: 'border-purple-500/40' },
  { key: 'MEM', name: 'Memory Access', short: 'Memory', color: '#ec4899', bg: 'bg-pink-500/10', border: 'border-pink-500/40' },
  { key: 'WB', name: 'Write Back', short: 'Writeback', color: '#10b981', bg: 'bg-emerald-500/10', border: 'border-emerald-500/40' }
];

function toHex(val, pad = 8) {
  if (val === null || val === undefined) return '—';
  return '0x' + (Number(val) >>> 0).toString(16).padStart(pad, '0').toUpperCase();
}

export default function PipelineFlowView({
  pipelineState = {},
  hazards = {},
  cycle = 0,
  selectedStage = 'EX',
  onSelectStage
}) {
  const [detailStage, setDetailStage] = useState(null);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return {
          label: 'Active',
          icon: PlayCircle,
          className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
        };
      case 'stalled':
        return {
          label: 'Stalled / Held',
          icon: PauseCircle,
          className: 'bg-amber-500/20 text-amber-300 border-amber-500/40'
        };
      case 'bubble':
        return {
          label: 'Bubble',
          icon: AlertOctagon,
          className: 'bg-sky-500/15 text-sky-400 border-sky-500/40 border-dashed'
        };
      case 'flushed':
        return {
          label: 'Flushed',
          icon: RefreshCw,
          className: 'bg-rose-500/20 text-rose-400 border-rose-500/40'
        };
      case 'not_started':
        return {
          label: 'Not Started',
          icon: MinusCircle,
          className: 'bg-slate-700/30 text-slate-400 border-slate-700/50'
        };
      case 'reset':
        return {
          label: 'Reset',
          icon: RefreshCw,
          className: 'bg-orange-500/20 text-orange-400 border-orange-500/40'
        };
      case 'empty':
      default:
        return {
          label: 'Empty',
          icon: MinusCircle,
          className: 'bg-slate-800/40 text-slate-400 border-slate-700/40'
        };
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      {/* 1. Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2.5 bg-slate-950/90 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            5-Stage RV32I Pipeline Microarchitecture
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-slate-800 text-slate-400">
            Cycle {cycle}
          </span>
        </div>

        {/* Hazard & State Summary Legend */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[11px] font-mono">
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Active
          </span>
          <span className="flex items-center gap-1 text-amber-400">
            <span className="w-2 h-2 rounded-full bg-amber-400" /> Bubble / Stall
          </span>
          <span className="flex items-center gap-1 text-rose-400">
            <span className="w-2 h-2 rounded-full bg-rose-400" /> Flushed
          </span>
          <span className="flex items-center gap-1 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-slate-500" /> Empty
          </span>
        </div>
      </div>

      {/* 2. Main 5-Stage Horizontal Progression */}
      <div className="flex-1 p-2 sm:p-3 overflow-x-auto overflow-y-auto">
        <div className="flex items-stretch justify-between gap-2 min-w-[720px] sm:min-w-[760px] h-full">
          {STAGES.map((cfg, idx) => {
            const stageData = pipelineState[cfg.key] || {};
            const inst = stageData.instruction;
            const hasInst = stageData.valid && inst && !inst.isBubble;

            // Resolve exact condition
            const rawStatus = stageData.stageStatus || (hasInst ? 'active' : (cycle === 0 ? 'not_started' : 'empty'));
            const badge = getStatusBadge(rawStatus);
            const StatusIcon = badge.icon;
            const isSelected = selectedStage === cfg.key;

            return (
              <React.Fragment key={cfg.key}>
                {/* Stage Card */}
                <div
                  onClick={() => {
                    onSelectStage?.(cfg.key);
                    setDetailStage(cfg.key);
                  }}
                  className={`flex-1 min-w-[125px] sm:min-w-[135px] flex flex-col rounded-xl border p-2 sm:p-2.5 cursor-pointer transition-all duration-150 select-none overflow-hidden ${
                    isSelected
                      ? 'ring-2 ring-cyan-500 shadow-md bg-slate-800 border-cyan-500'
                      : 'bg-slate-900/80 hover:bg-slate-800/60 border-slate-800'
                  }`}
                  title={`Click to inspect Stage ${cfg.key}: ${cfg.name}`}
                >
                  {/* Card Header: Stage Name + Status Badge (Strictly Contained & Aligned) */}
                  <div className="flex items-center justify-between gap-1 pb-1.5 border-b border-slate-800 shrink-0 w-full overflow-hidden">
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: cfg.color }}
                      />
                      <span className="text-xs font-bold text-slate-100">
                        {cfg.key}
                      </span>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8.5px] sm:text-[9px] font-semibold border max-w-[85px] sm:max-w-[95px] shrink-0 truncate ${badge.className}`}
                      title={stageData.statusLabel || badge.label}
                    >
                      <StatusIcon className="w-2.5 h-2.5 shrink-0" />
                      <span className="truncate">{stageData.statusLabel || badge.label}</span>
                    </span>
                  </div>

                  {/* Primary Instruction / Status Display */}
                  <div className="my-2 p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 flex flex-col justify-center min-h-[52px] overflow-hidden">
                    {hasInst ? (
                      <div className="min-w-0">
                        <div className="text-xs font-bold font-mono text-cyan-300 truncate">
                          {inst.source || `${inst.mnemonic.toUpperCase()}`}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center justify-between">
                          <span>PC: {toHex(inst.pc, 4)}</span>
                          <span className="text-[9px] uppercase tracking-wider px-1 rounded bg-slate-800 text-slate-300">
                            {inst.format}-type
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 min-w-0">
                        <StatusIcon className="w-4 h-4 text-slate-500 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-slate-300 truncate">
                            {cfg.name}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {stageData.statusReason || 'Stage idle / no instruction'}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Stage-Specific Key Hardware Signals */}
                  <div className="flex-1 space-y-1 font-mono text-[11px] py-1">
                    {cfg.key === 'IF' && (
                      <>
                        <div className="flex justify-between items-center text-slate-300">
                          <span className="text-slate-400">PC:</span>
                          <span className="font-semibold text-slate-200">
                            {toHex(stageData.pc ?? (hasInst ? inst.pc : 0), 4)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-slate-300">
                          <span className="text-slate-400">Word:</span>
                          <span className="text-purple-300">
                            {toHex(stageData.rawInstruction ?? (hasInst ? inst.machineCode : 0x00000013))}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-slate-300">
                          <span className="text-slate-400">Stall:</span>
                          <span className={hazards.stall ? 'text-amber-400 font-bold' : 'text-slate-500'}>
                            {hazards.stall ? '1 (Hold PC)' : '0'}
                          </span>
                        </div>
                      </>
                    )}

                    {cfg.key === 'ID' && (
                      <>
                        <div className="flex justify-between items-center text-slate-300">
                          <span className="text-slate-400">rs1 / rs2:</span>
                          <span className="font-semibold text-blue-300">
                            x{stageData.rs1 ?? (hasInst ? inst.rs1 : 0)} / x{stageData.rs2 ?? (hasInst ? inst.rs2 : 0)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-slate-300">
                          <span className="text-slate-400">rd:</span>
                          <span className="font-semibold text-emerald-300">
                            x{stageData.rd ?? (hasInst ? inst.rd : 0)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-slate-300">
                          <span className="text-slate-400">Imm:</span>
                          <span className="text-amber-300">
                            {stageData.imm ?? (hasInst ? inst.imm : 0)}
                          </span>
                        </div>
                      </>
                    )}

                    {cfg.key === 'EX' && (
                      <>
                        <div className="flex justify-between items-center text-slate-300">
                          <span className="text-slate-400">ALU Out:</span>
                          <span className="font-semibold text-cyan-300">
                            {toHex(stageData.aluResult ?? 0, 4)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-slate-300">
                          <span className="text-slate-400">Fwd A/B:</span>
                          <span className={hazards.forwardA !== 'NONE' || hazards.forwardB !== 'NONE' ? 'text-amber-400 font-semibold' : 'text-slate-500'}>
                            {hazards.forwardA || 'NONE'}/{hazards.forwardB || 'NONE'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-slate-300">
                          <span className="text-slate-400">Branch:</span>
                          <span className={stageData.branchTaken ? 'text-rose-400 font-bold' : 'text-slate-500'}>
                            {stageData.branchTaken ? 'TAKEN' : 'NOT TAKEN'}
                          </span>
                        </div>
                      </>
                    )}

                    {cfg.key === 'MEM' && (
                      <>
                        <div className="flex justify-between items-center text-slate-300">
                          <span className="text-slate-400">Addr:</span>
                          <span className="font-semibold text-slate-200">
                            {toHex(stageData.memAddr ?? 0, 4)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-slate-300">
                          <span className="text-slate-400">Wr Data:</span>
                          <span className="text-pink-300">
                            {toHex(stageData.memWriteData ?? 0, 4)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-slate-300">
                          <span className="text-slate-400">Rd/Wr:</span>
                          <span className="font-semibold text-slate-300">
                            {stageData.memRead ? 'READ' : stageData.memWrite ? 'WRITE' : 'NOP'}
                          </span>
                        </div>
                      </>
                    )}

                    {cfg.key === 'WB' && (
                      <>
                        <div className="flex justify-between items-center text-slate-300">
                          <span className="text-slate-400">Write rd:</span>
                          <span className="font-semibold text-emerald-300">
                            x{stageData.writeReg ?? (hasInst ? inst.rd : 0)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-slate-300">
                          <span className="text-slate-400">Commit:</span>
                          <span className="font-semibold text-cyan-300">
                            {toHex(stageData.writeData ?? 0, 4)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-slate-300">
                          <span className="text-slate-400">RegWr:</span>
                          <span className={stageData.regWrite ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                            {stageData.regWrite ? 'ENABLED' : 'DISABLED'}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Microarchitectural Explanation Footer */}
                  <div className="mt-2 pt-1.5 border-t border-slate-800 text-[10px] text-slate-400 flex items-center gap-1 shrink-0">
                    <Info className="w-3 h-3 text-cyan-400 shrink-0" />
                    <span className="truncate">
                      {stageData.statusReason || cfg.name}
                    </span>
                  </div>
                </div>

                {/* Connecting Inter-Stage Bus Arrow */}
                {idx < STAGES.length - 1 && (
                  <div className="flex flex-col items-center justify-center px-0.5 shrink-0 select-none">
                    <div className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                      <ArrowRight className="w-3 h-3 text-cyan-400" />
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* 3. Stage Details Popover / Modal (on stage card click) */}
      {detailStage && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-xl p-4 sm:p-5 shadow-2xl font-mono text-xs text-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: STAGES.find(s => s.key === detailStage)?.color }}
                />
                <h3 className="font-bold text-sm text-slate-100 uppercase tracking-wider">
                  Stage {detailStage}: {STAGES.find(s => s.key === detailStage)?.name}
                </h3>
              </div>
              <button
                onClick={() => setDetailStage(null)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">
                  Microarchitectural Condition
                </div>
                <div className="flex items-center gap-2 text-sm font-bold text-cyan-400">
                  {pipelineState[detailStage]?.statusLabel || 'Empty / No Active Instruction'}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  {pipelineState[detailStage]?.statusReason || 'Stage latch holds no valid speculative or committed operation.'}
                </div>
              </div>

              {pipelineState[detailStage]?.instruction && (
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">
                    Instruction In Latch
                  </div>
                  <div className="text-xs font-bold text-purple-300">
                    {pipelineState[detailStage]?.instruction?.source}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
                    <span>PC: {toHex(pipelineState[detailStage]?.instruction?.pc, 4)}</span>
                    <span>Machine Code: {toHex(pipelineState[detailStage]?.instruction?.machineCode)}</span>
                  </div>
                </div>
              )}

              <div className="text-[11px] text-slate-400 leading-relaxed">
                Clicking a stage card updates the Right-Column Instruction Decoder and displays the full RV32I bitfield distribution and micro-control flags for this pipeline latch.
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setDetailStage(null)}
                className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded shadow transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
