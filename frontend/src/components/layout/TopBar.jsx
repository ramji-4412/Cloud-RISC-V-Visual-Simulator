/**
 * TopBar.jsx
 *
 * Application chrome: logo/title, backend + Verilator status indicators,
 * and a global simulation status readout. Purely presentational; all
 * data comes from props.
 */

import React from 'react';
import {
  Activity,
  Cpu,
  Circle,
  CircleDot,
  Server,
  Zap
} from 'lucide-react';

function StatusPill({ label, value, tone = 'neutral' }) {
  const tones = {
    ok: 'text-emerald-400',
    warn: 'text-amber-400',
    error: 'text-rose-400',
    neutral: 'text-slate-400',
    info: 'text-sky-400',
  };
  const dot = {
    ok: 'bg-emerald-400',
    warn: 'bg-amber-400',
    error: 'bg-rose-400',
    neutral: 'bg-slate-500',
    info: 'bg-sky-400',
  };
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className={`h-2 w-2 rounded-full ${dot[tone]}`} />
      <span className="text-slate-400">{label}:</span>
      <span className={tones[tone]}>{value}</span>
    </div>
  );
}

export default function TopBar({
  backendAlive,
  backendError,
  isChecking,
  simConnected,
  simMessage,
  architecture,
  onRefresh,
}) {
  const backendTone = backendError
    ? 'error'
    : backendAlive
      ? 'ok'
      : isChecking
        ? 'warn'
        : 'error';
  const backendLabel = backendError
    ? 'error'
    : backendAlive
      ? 'online'
      : isChecking
        ? 'checking'
        : 'offline';

  const simTone = simConnected ? 'ok' : 'neutral';
  const simLabel = simConnected ? 'running' : 'stopped';

  return (
    <header className="flex h-12 items-center justify-between border-b border-slate-800 bg-slate-950/90 px-4">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sky-500/15 ring-1 ring-sky-500/40">
          <Cpu className="h-4 w-4 text-sky-400" />
        </div>
        <div>
          <div className="text-sm font-semibold tracking-tight text-slate-100">
            Cloud RISC-V Visual Simulator
          </div>
          <div className="text-[11px] text-slate-500">
            RV32I Five-Stage Pipeline &amp; Waveform Studio
          </div>
        </div>
      </div>

      <div className="flex items-center gap-5">
        <div className="hidden items-center gap-4 sm:flex">
          <StatusPill
            label="Backend"
            value={backendLabel}
            tone={backendTone}
          />
          <StatusPill
            label="Verilator"
            value={simLabel}
            tone={simTone}
          />
          {architecture && (
            <StatusPill
              label="ISA"
              value={architecture.isa || 'RV32I'}
              tone="info"
            />
          )}
        </div>

        <button
          onClick={onRefresh}
          disabled={isChecking}
          title="Refresh backend status"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-800 bg-slate-900 text-slate-400 transition hover:bg-slate-800 hover:text-slate-100 disabled:opacity-50"
        >
          <Activity
            className={`h-4 w-4 ${isChecking ? 'animate-spin' : ''}`}
          />
        </button>
      </div>
    </header>
  );
}
