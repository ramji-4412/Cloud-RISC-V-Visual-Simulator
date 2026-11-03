/**
 * PipelineStage.jsx
 *
 * Renders one pipeline stage box with a header, status badge, and
 * key signal rows. The displayed values come from the real RTL
 * debug outputs returned by GET /api/simulator/pipeline.
 */

import React from 'react';

const STAGE_COLORS = {
  IF: { border: 'border-sky-500/60', bg: 'bg-sky-500/10', text: 'text-sky-300' },
  ID: { border: 'border-violet-500/60', bg: 'bg-violet-500/10', text: 'text-violet-300' },
  EX: { border: 'border-amber-500/60', bg: 'bg-amber-500/10', text: 'text-amber-300' },
  MEM: { border: 'border-emerald-500/60', bg: 'bg-emerald-500/10', text: 'text-emerald-300' },
  WB: { border: 'border-rose-500/60', bg: 'bg-rose-500/10', text: 'text-rose-300' },
};

const STAGE_COLOR_FALLBACK = {
  border: 'border-slate-600/60',
  bg: 'bg-slate-700/10',
  text: 'text-slate-300',
};

function Signal({ label, value, mono = true }) {
  return (
    <div className="flex items-center justify-between text-[11px]">
      <span className="text-slate-500">{label}</span>
      <span className={`${mono ? 'font-mono' : ''} text-slate-200 truncate ml-2`}>
        {value}
      </span>
    </div>
  );
}

export default function PipelineStage({
  name,
  active,
  stall,
  bubble,
  signals,
}) {
  const colors = STAGE_COLORS[name] || STAGE_COLOR_FALLBACK;
  const statusText = stall
    ? 'STALL'
    : bubble
      ? 'BUBBLE'
      : active
        ? 'ACTIVE'
        : 'IDLE';

  const statusTone = stall
    ? 'text-amber-400'
    : bubble
      ? 'text-slate-500'
      : active
        ? colors.text
        : 'text-slate-600';

  return (
    <div
      className={`rounded-md border p-2 transition-colors ${
        active
          ? `${colors.border} ${colors.bg}`
          : 'border-slate-800 bg-slate-900/40'
      }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className={`text-xs font-bold ${colors.text}`}>{name}</span>
        <span className={`text-[10px] font-semibold ${statusTone}`}>
          {statusText}
        </span>
      </div>
      <div className="space-y-0.5">
        {signals.map((s, i) => (
          <Signal key={i} label={s.label} value={s.value} />
        ))}
      </div>
    </div>
  );
}
