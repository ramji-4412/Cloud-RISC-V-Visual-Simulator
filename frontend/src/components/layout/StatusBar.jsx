/**
 * StatusBar.jsx
 *
 * Bottom chrome: cycle counter, stall count, redirect indicator,
 * program state, and a scrolling message log.
 *
 * All values are sourced from the real backend pipeline state.
 */

import React from 'react';
import { AlertTriangle, Circle, Cpu, Info, Play, Square } from 'lucide-react';

function Stat({ label, value, highlight }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <span
        className={`font-mono text-xs ${
          highlight ? 'text-sky-300' : 'text-slate-200'
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export default function StatusBar({
  cycleCount,
  stallCount,
  redirect,
  pcSel,
  programFile,
  programLoaded,
  simConnected,
  messages,
}) {
  const hasStall = stallCount > 0;
  const hasRedirect = redirect > 0;

  return (
    <footer className="flex h-7 items-center justify-between border-t border-slate-800 bg-slate-950 px-4 text-xs">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-1.5">
          {simConnected ? (
            <Play className="h-3 w-3 text-emerald-400" />
          ) : (
            <Square className="h-3 w-3 text-slate-500" />
          )}
          <span className="text-slate-400">
            {simConnected ? 'Simulator running' : 'Simulator stopped'}
          </span>
        </div>

        <Stat label="Cycle" value={cycleCount} highlight />
        <Stat label="Stall" value={stallCount} highlight={hasStall} />
        <Stat label="Redirect" value={hasRedirect ? 'Yes' : 'No'} highlight={hasRedirect} />
        <Stat label="PC Sel" value={pcSel} />
        <div className="flex items-center gap-1.5">
          <Cpu className="h-3 w-3 text-slate-500" />
          <span className="text-slate-400">
            {programLoaded
              ? `Program: ${programFile || 'loaded'}`
              : 'No program loaded'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-hidden">
        {messages.length === 0 ? (
          <span className="flex items-center gap-1.5 text-slate-500">
            <Info className="h-3 w-3" />
            Ready
          </span>
        ) : (
          messages.slice(-3).map((m, i) => (
            <span
              key={i}
              className="flex items-center gap-1.5 text-slate-400"
            >
              {m.tone === 'error' ? (
                <AlertTriangle className="h-3 w-3 text-rose-400" />
              ) : m.tone === 'warn' ? (
                <Circle className="h-3 w-3 text-amber-400" />
              ) : (
                <Circle className="h-3 w-3 text-sky-400" />
              )}
              <span className="truncate max-w-[280px]">{m.text}</span>
            </span>
          ))
        )}
      </div>
    </footer>
  );
}
