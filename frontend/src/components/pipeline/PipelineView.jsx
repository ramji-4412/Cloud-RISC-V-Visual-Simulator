/**
 * PipelineView.jsx
 *
 * Five-stage pipeline visualization. All values are sourced from the
 * real RTL debug outputs returned by GET /api/simulator/pipeline.
 *
 * Pipeline state object:
 *   {
 *     fetch_pc, fetch_instruction,
 *     if_id_pc, if_id_instruction,
 *     id_rs1_data, id_rs2_data, id_imm,
 *     ex_pc, ex_rd, ex_opcode,
 *     mem_alu_result, mem_store_data, mem_rd,
 *     wb_writeback_data, wb_writeback_rd, wb_writeback_enable,
 *     control_stall, redirect, pc_sel, cycle
 *   }
 */

import React, { useMemo } from 'react';
import PipelineStage from './PipelineStage.jsx';

function fmtHex(v, width = 8) {
  if (v == null || v === '') return '—';
  return '0x' + (Number(v) >>> 0).toString(16).padStart(width, '0');
}

function decodeOpcode(opcode) {
  const names = {
    0b0110011: 'R-type',
    0b0010011: 'I-type ALU',
    0b0000011: 'LOAD',
    0b0100011: 'STORE',
    0b1100011: 'BRANCH',
    0b1101111: 'JAL',
    0b1100111: 'JALR',
    0b0110111: 'LUI',
    0b0010111: 'AUIPC',
  };
  return names[Number(opcode)] || `0x${Number(opcode).toString(16)}`;
}

function decodePcSel(pcSel) {
  const names = { 0: 'PC+4', 1: 'Branch', 2: 'JAL', 3: 'JALR' };
  return names[Number(pcSel)] || String(pcSel);
}

export default function PipelineView({ pipelineState }) {
  const state = pipelineState || {};

  const hasStall = Number(state.control_stall) > 0;
  const hasRedirect = Number(state.redirect) > 0;

  const stages = useMemo(() => {
    return [
      {
        name: 'IF',
        active: true,
        stall: hasStall,
        bubble: false,
        signals: [
          { label: 'PC', value: fmtHex(state.fetch_pc, 8) },
          { label: 'Instr', value: fmtHex(state.fetch_instruction, 8) },
        ],
      },
      {
        name: 'ID',
        active: true,
        stall: hasStall,
        bubble: hasStall,
        signals: [
          { label: 'IF/ID PC', value: fmtHex(state.if_id_pc, 8) },
          { label: 'IF/ID Instr', value: fmtHex(state.if_id_instruction, 8) },
          { label: 'rs1 data', value: fmtHex(state.id_rs1_data, 8) },
          { label: 'rs2 data', value: fmtHex(state.id_rs2_data, 8) },
          { label: 'imm', value: fmtHex(state.id_imm, 8) },
        ],
      },
      {
        name: 'EX',
        active: true,
        stall: false,
        bubble: false,
        signals: [
          { label: 'EX PC', value: fmtHex(state.ex_pc, 8) },
          { label: 'Rd', value: `x${Number(state.ex_rd)}` },
          { label: 'Opcode', value: decodeOpcode(state.ex_opcode) },
        ],
      },
      {
        name: 'MEM',
        active: true,
        stall: false,
        bubble: false,
        signals: [
          { label: 'ALU result', value: fmtHex(state.mem_alu_result, 8) },
          { label: 'Store data', value: fmtHex(state.mem_store_data, 8) },
          { label: 'Rd', value: `x${Number(state.mem_rd)}` },
        ],
      },
      {
        name: 'WB',
        active: Number(state.wb_writeback_enable) > 0,
        stall: false,
        bubble: Number(state.wb_writeback_enable) === 0,
        signals: [
          { label: 'WB data', value: fmtHex(state.wb_writeback_data, 8) },
          { label: 'Rd', value: `x${Number(state.wb_writeback_rd)}` },
          { label: 'RegWrite', value: state.wb_writeback_enable ? '1' : '0' },
        ],
      },
    ];
  }, [state, hasStall, hasRedirect]);

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between border-b border-slate-800 px-3 py-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Pipeline View
        </span>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1 text-slate-500">
            <span className="h-2 w-2 rounded-full bg-sky-400" /> Active
          </span>
          <span className="flex items-center gap-1 text-amber-400">
            <span className="h-2 w-2 rounded-full bg-amber-400" /> Stall
          </span>
          <span className="flex items-center gap-1 text-slate-500">
            <span className="h-2 w-2 rounded-full bg-slate-600" /> Bubble
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-slate-800 px-3 py-1.5 text-[11px]">
        <span className="text-slate-500">PC Sel:</span>
        <span className="font-mono text-slate-200">
          {decodePcSel(state.pc_sel)}
        </span>
        <span className="ml-3 text-slate-500">Redirect:</span>
        <span
          className={`font-mono ${
            hasRedirect ? 'text-amber-400' : 'text-slate-400'
          }`}
        >
          {hasRedirect ? 'YES' : 'no'}
        </span>
        <span className="ml-auto text-slate-500">
          Cycle {state.cycle ?? '—'}
        </span>
      </div>

      <div className="grid grid-cols-5 gap-2 p-2">
        {stages.map((s) => (
          <PipelineStage key={s.name} {...s} />
        ))}
      </div>
    </div>
  );
}
