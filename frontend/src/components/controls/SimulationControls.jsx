/**
 * SimulationControls.jsx
 *
 * Transport controls: Start, Stop, Restart, Reset, Step, Run Cycles,
 * Run All, plus cycle-count input and speed control.
 *
 * All operations delegate to the real backend. No execution is
 * emulated in JavaScript.
 */

import React, { useState } from 'react';
import {
  AlertTriangle,
  Circle,
  CircleDot,
  Loader2,
  Play,
  RotateCcw,
  Square,
  StepForward,
  Timer,
  Zap,
} from 'lucide-react';

function Button({
  onClick,
  disabled,
  title,
  variant = 'secondary',
  icon: Icon,
  children,
}) {
  const base =
    'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 disabled:cursor-not-allowed focus-ring';
  const variants = {
    primary: 'bg-[#38bdf8] text-[#0f172a] hover:bg-[#2563eb]',
    danger: 'bg-[#fb7185] text-white hover:bg-[#ef4040]',
    secondary:
      'border border-[#23304a] bg-[#111729] text-slate-200 hover:bg-[#17203a]',
  };
  return (
    <button onClick={onClick} disabled={disabled} title={title} className={`${base} ${variants[variant]}`}>
      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      {children}
    </button>
  );
}

export default function SimulationControls({
  onAction,
  simConnected,
  programLoaded,
  busy,
  lastStatus,
  lastError,
}) {
  const [cycles, setCycles] = useState(10);
  const [maxCycles, setMaxCycles] = useState(100);

  const canControl = simConnected && programLoaded && !busy;

  return (
    <div className="flex flex-col">
      <div className="section-header">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Simulation Controls
        </span>
        <span className="text-[10px] font-semibold">
          {simConnected ? 'CONNECTED' : 'STOPPED'}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 px-3 py-2">
        {!simConnected ? (
          <Button
            variant="primary"
            icon={Play}
            onClick={() => onAction('start')}
            disabled={busy}
          >
            Start Sim
          </Button>
        ) : (
          <>
            <Button
              variant="danger"
              icon={Square}
              onClick={() => onAction('stop')}
              disabled={busy}
            >
              Stop Sim
            </Button>
            <Button
              icon={RotateCcw}
              onClick={() => onAction('restart')}
              disabled={busy}
            >
              Restart
            </Button>
          </>
        )}

        <Button
          icon={RotateCcw}
          onClick={() => onAction('reset')}
          disabled={busy || !programLoaded}
          title="Reset processor state"
        >
          Reset
        </Button>

        <Button
          icon={StepForward}
          onClick={() => onAction('step')}
          disabled={busy || !programLoaded}
          title="Advance one clock cycle"
        >
          Step
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-b border-slate-800 px-3 py-2">
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-slate-400 uppercase font-medium">Run Cycles</label>
          <input
            type="number"
            min={1}
            max={10000}
            value={cycles}
            onChange={(e) => setCycles(Math.min(10000, Math.max(1, Number(e.target.value) || 10)))}
            className="w-16 rounded border border-slate-700 bg-slate-800 px-2 py-1 font-mono text-[11px] text-slate-200 focus-ring"
          />
          <Button
            icon={Zap}
            onClick={() => onAction('run-cycles', cycles)}
            disabled={busy || !programLoaded}
          >
            Run
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-[10px] text-slate-400 uppercase font-medium">Max Cycles</label>
          <input
            type="number"
            min={1}
            max={100000}
            value={maxCycles}
            onChange={(e) => setMaxCycles(Math.min(100000, Math.max(1, Number(e.target.value) || 100)))}
            className="w-20 rounded border border-slate-700 bg-slate-800 px-2 py-1 font-mono text-[11px] text-slate-200 focus-ring"
          />
          <Button
            icon={Timer}
            onClick={() => onAction('run', maxCycles)}
            disabled={busy || !programLoaded}
          >
            Run All
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 px-3 py-1.5 text-[10px]">
        {busy ? (
          <span className="flex items-center gap-1.5 text-amber-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Executing {lastStatus || 'operation'}...
          </span>
        ) : lastError ? (
          <span className="flex items-center gap-1.5 text-rose-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            {lastError}
          </span>
        ) : lastStatus ? (
          <span className="flex items-center gap-1.5 text-emerald-400">
            <CircleDot className="h-3.5 w-3.5" />
            {lastStatus}
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-slate-500">
            <Circle className="h-3.5 w-3.5" />
            {programLoaded ? 'Ready' : 'Load a program to begin'}
          </span>
        )}
      </div>
    </div>
  );
}
