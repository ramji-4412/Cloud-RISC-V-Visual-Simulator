/**
 * MemoryViewer.jsx
 *
 * Data-memory inspector. Reads N words starting at a word-aligned
 * address from GET /api/simulator/memory.
 */

import React, { useState } from 'react';

function fmtHex(v) {
  return '0x' + (v >>> 0).toString(16).padStart(8, '0');
}

export default function MemoryViewer({
  memory,
  cycles,
  onRefresh,
  address,
  words,
  onAddressChange,
  onWordsChange,
  busy,
}) {
  const [copied, setCopied] = useState(false);

  const copyHex = () => {
    const text = (memory || [])
      .map((m) => `${m.address}: ${fmtHex(m.value)}`)
      .join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-200 font-mono">
      <div className="flex items-center justify-between border-b border-slate-800 px-3 py-1.5 bg-slate-950/60 shrink-0">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Data Memory
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] sm:text-[11px] text-slate-500">
            {cycles} cycles
          </span>
          <button
            onClick={copyHex}
            className="rounded px-1.5 py-0.5 text-[10px] text-slate-400 hover:bg-slate-800 transition"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 border-b border-slate-800 px-3 py-1.5 bg-slate-950/40 shrink-0">
        <label className="flex items-center gap-1 text-[11px] text-slate-400">
          Addr
          <input
            type="number"
            value={address}
            onChange={(e) =>
              onAddressChange(Math.max(0, Number(e.target.value) || 0))
            }
            className="w-16 sm:w-20 rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 font-mono text-xs text-slate-200"
          />
        </label>
        <label className="flex items-center gap-1 text-[11px] text-slate-400">
          Words
          <input
            type="number"
            min={1}
            max={256}
            value={words}
            onChange={(e) =>
              onWordsChange(Math.min(256, Math.max(1, Number(e.target.value) || 16)))
            }
            className="w-14 sm:w-16 rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 font-mono text-xs text-slate-200"
          />
        </label>
        <button
          onClick={onRefresh}
          disabled={busy}
          className="ml-auto rounded border border-slate-700 bg-slate-900 hover:bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300 disabled:opacity-50 transition"
        >
          Refresh
        </button>
      </div>

      <div className="panel-scroll flex-1 overflow-auto">
        {(!memory || memory.length === 0) ? (
          <div className="p-4 text-center text-xs text-slate-500">
            No memory contents.
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-slate-900 text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
              <tr>
                <th className="px-2.5 sm:px-3 py-1.5 text-left">Address</th>
                <th className="px-2 sm:px-3 py-1.5 text-left">Word</th>
                <th className="px-2 sm:px-3 py-1.5 text-right">Hex</th>
                <th className="px-2 sm:px-3 py-1.5 text-right">Decimal</th>
              </tr>
            </thead>
            <tbody>
              {memory.map((m) => (
                <tr
                  key={m.address}
                  className="border-b border-slate-800/60 font-mono hover:bg-slate-800/40 transition-colors"
                >
                  <td className="px-2.5 sm:px-3 py-1 text-slate-400 text-[11px]">
                    {fmtHex(m.address)}
                  </td>
                  <td className="px-2 sm:px-3 py-1 text-slate-500 text-[11px]">
                    {m.word_index}
                  </td>
                  <td className="px-2 sm:px-3 py-1 text-right text-sky-300 font-semibold text-[11px]">
                    {fmtHex(m.value)}
                  </td>
                  <td className="px-2 sm:px-3 py-1 text-right text-slate-300 text-[11px]">
                    {m.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
