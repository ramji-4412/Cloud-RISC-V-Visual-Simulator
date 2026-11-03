/**
 * AssemblyToolbar.jsx
 *
 * Toolbar buttons for the assembly editor: Assemble, Assemble & Load,
 * and status indicator.
 */

import React from 'react';
import { AlertTriangle, CheckCircle, Cpu, Loader2 } from 'lucide-react';

export default function AssemblyToolbar({
  onAssemble,
  onAssembleAndLoad,
  isAssembling,
  isAssembleLoading,
  assembleError,
  canOperate,
}) {
  const busy = isAssembling || isAssembleLoading;

  return (
    <div className="flex items-center gap-2 border-b border-slate-800 px-3 py-1.5">
      <button
        onClick={onAssemble}
        disabled={busy || !canOperate}
        className="flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-medium text-slate-200 transition hover:bg-slate-800 disabled:opacity-50"
      >
        {isAssembling ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Cpu className="h-3.5 w-3.5" />
        )}
        Assemble
      </button>
      <button
        onClick={onAssembleAndLoad}
        disabled={busy || !canOperate}
        className="flex items-center gap-1.5 rounded-md bg-sky-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-sky-500 disabled:opacity-50"
      >
        {isAssembleLoading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Cpu className="h-3.5 w-3.5" />
        )}
        Assemble &amp; Load
      </button>

      <div className="ml-auto flex items-center gap-2">
        {assembleError && (
          <span className="flex items-center gap-1 text-[11px] text-rose-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            {assembleError}
          </span>
        )}
        {!busy && !assembleError && canOperate && (
          <span className="flex items-center gap-1 text-[11px] text-emerald-400">
            <CheckCircle className="h-3.5 w-3.5" />
            Ready
          </span>
        )}
      </div>
    </div>
  );
}
