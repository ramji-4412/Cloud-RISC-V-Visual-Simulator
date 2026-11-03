/**
 * RegisterFile.jsx
 *
 * Displays all 32 architectural registers (x0..x31) with ABI aliases,
 * hex and decimal values, and a highlight for recently modified
 * registers.
 *
 * Data comes from GET /api/simulator/registers:
 *   [{ register, index, value }]
 */

import React, { useMemo } from 'react';

const ABI_ALIASES = [
  'zero', 'ra', 'sp', 'gp', 'tp', 't0', 't1', 't2', 's0', 's1',
  'a0', 'a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 's2', 's3',
  's4', 's5', 's6', 's7', 's8', 's9', 's10', 's11', 't3', 't4',
  't5', 't6',
];

function fmtHex(v) {
  return '0x' + (v >>> 0).toString(16).padStart(8, '0');
}

function RegisterRow({ name, alias, index, value, modified }) {
  return (
    <div
      className={`flex items-center justify-between rounded px-2 py-1 font-mono text-xs ${
        modified
          ? 'bg-amber-500/10 ring-1 ring-amber-500/30'
          : 'hover:bg-slate-800/60'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="w-8 text-slate-500">{name}</span>
        <span className="w-8 text-slate-400">{alias}</span>
        <span className="text-slate-600">#{index}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sky-300">{fmtHex(value)}</span>
        <span className="w-16 text-right text-slate-500">{value}</span>
      </div>
    </div>
  );
}

export default function RegisterFile({ registers, modifiedSet }) {
  const rows = useMemo(() => {
    return (registers || []).map((reg) => {
      const alias = ABI_ALIASES[reg.index] || '';
      const modified = modifiedSet
        ? modifiedSet.has(reg.index)
        : false;
      return {
        ...reg,
        alias,
        modified,
      };
    });
  }, [registers, modifiedSet]);

  if (!registers || registers.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-slate-500">
        No register data. Start the simulator and load a program.
      </div>
    );
  }

  // Render x0..x15 and x16..x31 in two columns.
  const left = rows.slice(0, 16);
  const right = rows.slice(16, 32);

  return (
    <div className="grid grid-cols-2 gap-2 p-2">
      <div className="space-y-0.5">
        {left.map((r) => (
          <RegisterRow key={r.index} {...r} />
        ))}
      </div>
      <div className="space-y-0.5">
        {right.map((r) => (
          <RegisterRow key={r.index} {...r} />
        ))}
      </div>
    </div>
  );
}
