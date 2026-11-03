import React, { useMemo } from 'react';

function formatHex(val, pad = 8) {
  const unsigned = (val >>> 0);
  return '0x' + unsigned.toString(16).padStart(pad, '0').toUpperCase();
}

export default function MachineCodePanel({ assembleResult, error }) {
  const instructions = useMemo(
    () => assembleResult?.instructions || [],
    [assembleResult]
  );

  if (error) {
    return (
      <div className="flex flex-col">
        <div className="flex items-center justify-between border-b border-[#23304a] px-3 py-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Machine Code
          </span>
        </div>
        <div className="p-3 text-[11px] text-rose-400 whitespace-pre-wrap">
          {error}
        </div>
      </div>
    );
  }

  if (!assembleResult) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-center text-xs text-slate-500">
        No assembly result yet. Press <span className="text-sky-400">Assemble</span>.
      </div>
    );
  }

  if (!assembleResult.success) {
    return (
      <div className="p-3 text-xs text-rose-400">
        Assembly failed with {assembleResult.errors?.length || 0} error(s).
      </div>
    );
  }

  if (instructions.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-slate-500">
        No instructions produced.
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between border-b border-[#23304a] px-3 py-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Machine Code
        </span>
        <span className="text-[11px] text-slate-500">
          {assembleResult.instruction_count} instruction
          {assembleResult.instruction_count === 1 ? '' : 's'}
        </span>
      </div>
      <div className="panel-scroll overflow-auto">
        <table className="w-full text-[10px]">
          <thead className="sticky top-0 bg-[#0f1424] text-[10px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-3 py-1.5 text-left">Addr</th>
              <th className="px-3 py-1.5 text-left">Source</th>
              <th className="px-3 py-1.5 text-right">Hex</th>
            </tr>
          </thead>
          <tbody>
            {instructions.map((instr, i) => (
              <tr
                key={i}
                className="cursor-pointer border-b border-slate-800/60 font-mono hover:bg-slate-800/60 text-slate-300"
              >
                <td className="px-3 py-0.5 text-slate-500">{instr.address}</td>
                <td className="px-3 py-0.5 text-slate-400">{instr.assembly}</td>
                <td className="px-3 py-0.5 text-right text-sky-400">{formatHex(instr.machine_code)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
