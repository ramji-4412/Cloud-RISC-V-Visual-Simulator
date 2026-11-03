import React, { useState, useMemo } from 'react';
import { Database } from 'lucide-react';

const ABI_NAMES = [
  'zero', 'ra', 'sp', 'gp', 'tp', 't0', 't1', 't2',
  's0/fp', 's1', 'a0', 'a1', 'a2', 'a3', 'a4', 'a5',
  'a6', 'a7', 's2', 's3', 's4', 's5', 's6', 's7',
  's8', 's9', 's10', 's11', 't3', 't4', 't5', 't6'
];

function toHex(val, pad = 8) {
  const unsigned = (val >>> 0);
  return '0x' + unsigned.toString(16).padStart(pad, '0').toUpperCase();
}

export default function RegisterFileInspector({ registers, recentMod }) {
  const [search, setSearch] = useState('');

  const regArray = useMemo(() => {
    const regs = registers || [];
    return Array.from({ length: 32 }).map((_, i) => ({
      index: i,
      name: `x${i}`,
      abi: ABI_NAMES[i],
      val: regs[i] !== undefined ? regs[i] : 0
    })).filter(r => {
      const q = search.toLowerCase();
      return r.name.toLowerCase().includes(q) || r.abi.toLowerCase().includes(q);
    });
  }, [registers, search]);

  const rowClass = (isModified) => {
    return isModified
      ? 'grid grid-cols-12 px-2.5 sm:px-3 py-1 sm:py-1.5 transition-colors items-center bg-emerald-500/20 text-emerald-300 font-bold'
      : 'grid grid-cols-12 px-2.5 sm:px-3 py-1 sm:py-1.5 transition-colors items-center hover:bg-slate-800/50 text-slate-300';
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      <div className="flex items-center justify-between px-3 py-2 bg-slate-950/80 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Database className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-[11px] sm:text-xs font-bold tracking-wider uppercase text-slate-200 truncate">
            Registers (x0 - x31)
          </span>
        </div>
        <input
          type="text"
          placeholder="Filter..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-2 py-0.5 text-xs bg-slate-800 border border-slate-700 rounded text-slate-200 focus:outline-none focus:border-cyan-500 font-mono w-20 sm:w-28"
        />
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 font-mono text-xs">
        <div className="grid grid-cols-12 px-2.5 sm:px-3 py-1 bg-slate-950/60 text-slate-400 text-[10px] sm:text-[11px] font-semibold sticky top-0">
          <div className="col-span-2">Reg</div>
          <div className="col-span-3">ABI</div>
          <div className="col-span-4">Hex Value</div>
          <div className="col-span-3 text-right">Dec</div>
        </div>

        {regArray.map(r => {
          const isModified = recentMod === r.index;
          const isX0 = r.index === 0;
          const cls = rowClass(isModified);

          return (
            <div key={r.index} className={cls}>
              <div className="col-span-2 font-bold flex items-center gap-1 text-[11px]">
                {r.name}
                {isX0 && <span className="text-[8px] px-1 bg-slate-800 text-slate-400 rounded">RO</span>}
              </div>
              <div className="col-span-3 text-slate-400 text-[10px] sm:text-[11px] truncate">{r.abi}</div>
              <div className="col-span-4 text-cyan-300 font-semibold text-[11px] truncate">{toHex(r.val)}</div>
              <div className="col-span-3 text-right text-slate-400 text-[11px]">{r.val}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
