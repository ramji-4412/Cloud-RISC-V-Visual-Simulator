import React from 'react';
import { Binary, ShieldAlert, CheckCircle2, Clock } from 'lucide-react';

function toHex(val, pad = 8) {
  const unsigned = (val >>> 0);
  return '0x' + unsigned.toString(16).padStart(pad, '0').toUpperCase();
}

export default function InstructionDecoderInspector({ stageKey, stageData }) {
  const inst = stageData?.instruction;
  const status = stageData?.stageStatus || (stageData?.valid && inst ? 'active' : 'empty');
  const label = stageData?.statusLabel || (stageData?.valid && inst ? (inst.source || `PC:${inst.pc}`) : 'Empty');
  const reason = stageData?.statusReason || '';

  if (!inst || inst.isBubble || !stageData?.valid) {
    const statusBadges = {
      bubble: { bg: 'bg-sky-500/20 text-sky-300 border-sky-500/30', title: 'Bubble (Hazard Injected)' },
      stalled: { bg: 'bg-amber-500/20 text-amber-300 border-amber-500/30', title: 'Stalled / Held' },
      flushed: { bg: 'bg-rose-500/20 text-rose-300 border-rose-500/30', title: 'Flushed (Control Hazard)' },
      reset: { bg: 'bg-orange-500/20 text-orange-300 border-orange-500/30', title: 'Hardware Reset' },
      not_started: { bg: 'bg-slate-700/30 text-slate-400 border-slate-700/50', title: 'Simulation Not Started' },
      empty: { bg: 'bg-slate-800/40 text-slate-400 border-slate-700/40', title: 'Stage Empty' }
    };

    const currentBadge = statusBadges[status] || statusBadges.empty;

    return (
      <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl p-3 sm:p-4 shadow-xl justify-center items-center text-center">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-800/60 flex items-center justify-center text-slate-500 mb-2 sm:mb-3">
          <Binary className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mb-1">
          <h3 className="text-xs sm:text-sm font-semibold text-slate-200 font-mono">
            Stage {stageKey} Latch
          </h3>
          <span className={`text-[10px] px-2 py-0.5 rounded font-mono border ${currentBadge.bg}`}>
            {currentBadge.title}
          </span>
        </div>
        <p className="text-[11px] sm:text-xs text-slate-400 max-w-xs mt-1 leading-relaxed">
          {reason || 'No valid instruction in pipeline latch. Waiting for upstream execution.'}
        </p>
      </div>
    );
  }

  const ctrl = inst.ctrl || {};

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl font-mono text-xs">
      <div className="flex items-center justify-between px-3 sm:px-3.5 py-2 sm:py-2.5 bg-slate-950/80 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <Binary className="w-4 h-4 text-cyan-400" />
          <span className="font-bold tracking-wider uppercase text-slate-200 text-[11px] sm:text-xs">
            Stage {stageKey} Decoder
          </span>
        </div>
        <span className="px-2 py-0.5 text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800 rounded">
          {inst.format}-Type
        </span>
      </div>

      <div className="p-2.5 sm:p-3.5 space-y-2.5 sm:space-y-3 overflow-y-auto">
        {/* Assembly Disassembly */}
        <div className="bg-slate-950 p-2 sm:p-2.5 rounded-lg border border-slate-800">
          <div className="text-[10px] uppercase text-slate-500 font-semibold mb-0.5">Disassembly</div>
          <div className="text-xs sm:text-sm font-bold text-cyan-300 truncate">{inst.source}</div>
          <div className="text-[10px] sm:text-[11px] text-slate-400 mt-1 flex flex-wrap items-center gap-2 sm:gap-3">
            <span>PC: <b className="text-slate-200">{toHex(inst.pc || 0, 4)}</b></span>
            <span>Machine Code: <b className="text-purple-300">{toHex(inst.machineCode || 0)}</b></span>
          </div>
        </div>

        {/* Decoded Bitfields */}
        <div>
          <div className="text-[10px] uppercase text-slate-500 font-semibold mb-1">Decoded Bitfields</div>
          <div className="grid grid-cols-4 gap-1 sm:gap-1.5 text-center">
            <div className="bg-slate-950/60 p-1 sm:p-1.5 rounded border border-slate-800">
              <span className="text-[9px] text-slate-500 block">Opcode</span>
              <span className="font-bold text-slate-200 text-[11px]">{toHex(inst.opcode || 0, 2)}</span>
            </div>
            <div className="bg-slate-950/60 p-1 sm:p-1.5 rounded border border-slate-800">
              <span className="text-[9px] text-slate-500 block">rd</span>
              <span className="font-bold text-emerald-300 text-[11px]">x{inst.rd}</span>
            </div>
            <div className="bg-slate-950/60 p-1 sm:p-1.5 rounded border border-slate-800">
              <span className="text-[9px] text-slate-500 block">rs1</span>
              <span className="font-bold text-blue-300 text-[11px]">x{inst.rs1}</span>
            </div>
            <div className="bg-slate-950/60 p-1 sm:p-1.5 rounded border border-slate-800">
              <span className="text-[9px] text-slate-500 block">rs2</span>
              <span className="font-bold text-purple-300 text-[11px]">x{inst.rs2}</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1 sm:gap-1.5 text-center mt-1">
            <div className="bg-slate-950/60 p-1 sm:p-1.5 rounded border border-slate-800">
              <span className="text-[9px] text-slate-500 block">funct3</span>
              <span className="font-bold text-slate-300 text-[11px]">{inst.funct3 ?? '-'}</span>
            </div>
            <div className="bg-slate-950/60 p-1 sm:p-1.5 rounded border border-slate-800">
              <span className="text-[9px] text-slate-500 block">funct7</span>
              <span className="font-bold text-slate-300 text-[11px]">{inst.funct7 !== undefined ? toHex(inst.funct7, 2) : '-'}</span>
            </div>
            <div className="bg-slate-950/60 p-1 sm:p-1.5 rounded border border-slate-800">
              <span className="text-[9px] text-slate-500 block">Immediate</span>
              <span className="font-bold text-amber-300 text-[11px]">{inst.imm ?? 0}</span>
            </div>
          </div>
        </div>

        {/* Hardware Control Signals */}
        <div>
          <div className="text-[10px] uppercase text-slate-500 font-semibold mb-1">Micro-Control Signals</div>
          <div className="grid grid-cols-2 gap-1 sm:gap-1.5">
            <div className="flex items-center justify-between p-1 sm:p-1.5 bg-slate-950/60 rounded border border-slate-800/80 text-[11px]">
              <span className="text-slate-400">RegWrite:</span>
              <span className={ctrl.regWrite ? 'text-emerald-400 font-bold' : 'text-slate-600'}>
                {ctrl.regWrite ? '1' : '0'}
              </span>
            </div>
            <div className="flex items-center justify-between p-1 sm:p-1.5 bg-slate-950/60 rounded border border-slate-800/80 text-[11px]">
              <span className="text-slate-400">ALUSrc:</span>
              <span className={ctrl.aluSrc ? 'text-amber-400 font-bold' : 'text-slate-600'}>
                {ctrl.aluSrc ? '1 (Imm)' : '0 (Reg)'}
              </span>
            </div>
            <div className="flex items-center justify-between p-1 sm:p-1.5 bg-slate-950/60 rounded border border-slate-800/80 text-[11px]">
              <span className="text-slate-400">MemRead:</span>
              <span className={ctrl.memRead ? 'text-cyan-400 font-bold' : 'text-slate-600'}>
                {ctrl.memRead ? '1' : '0'}
              </span>
            </div>
            <div className="flex items-center justify-between p-1 sm:p-1.5 bg-slate-950/60 rounded border border-slate-800/80 text-[11px]">
              <span className="text-slate-400">MemWrite:</span>
              <span className={ctrl.memWrite ? 'text-rose-400 font-bold' : 'text-slate-600'}>
                {ctrl.memWrite ? '1' : '0'}
              </span>
            </div>
            <div className="flex items-center justify-between p-1 sm:p-1.5 bg-slate-950/60 rounded border border-slate-800/80 text-[11px]">
              <span className="text-slate-400">Branch:</span>
              <span className={ctrl.branch ? 'text-indigo-400 font-bold' : 'text-slate-600'}>
                {ctrl.branch ? '1' : '0'}
              </span>
            </div>
            <div className="flex items-center justify-between p-1 sm:p-1.5 bg-slate-950/60 rounded border border-slate-800/80 text-[11px]">
              <span className="text-slate-400">MemToReg:</span>
              <span className={ctrl.memToReg ? 'text-purple-400 font-bold' : 'text-slate-600'}>
                {ctrl.memToReg ? '1' : '0'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
