import React, { useRef, useMemo } from 'react';
import { CheckCircle2, AlertTriangle, FileCode } from 'lucide-react';

export default function AssemblyEditor({
  source = '',
  onChange,
  onClear,
  onRunExample,
  onCheck,
  onAssembleAndLoad,
  lineErrors = [],
  checkStatus = null,
  currentPC = 0,
}) {
  const lineNumsRef = useRef(null);
  const textareaRef = useRef(null);

  // Split lines for line numbers
  const lines = useMemo(() => (source || '').split('\n'), [source]);

  const handleScroll = (e) => {
    if (lineNumsRef.current) {
      lineNumsRef.current.scrollTop = e.target.scrollTop;
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const newSource = source.substring(0, start) + '  ' + source.substring(end);
      if (onChange) onChange(newSource);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
  };

  // Error lines set
  const errorLineSet = useMemo(() => {
    const set = new Set();
    if (!lineErrors) return set;
    lineErrors.forEach((err) => {
      if (typeof err === 'object' && err.line !== undefined) {
        set.add(err.line);
      } else if (typeof err === 'string') {
        const match = err.match(/^Line\s+(\d+)/i);
        if (match) set.add(parseInt(match[1], 10));
      }
    });
    return set;
  }, [lineErrors]);

  const errorMessages = useMemo(() => {
    if (!lineErrors || lineErrors.length === 0) return [];
    return lineErrors.map((err) =>
      typeof err === 'string' ? err : `Line ${err.line}: ${err.message}`
    );
  }, [lineErrors]);

  // Determine current active line from PC (PC = 0, 4, 8 -> line index)
  const activeLineIndex = useMemo(() => {
    let pcCounter = 0;
    for (let i = 0; i < lines.length; i++) {
      let l = lines[i].split('#')[0].trim();
      if (!l) continue;
      if (l.includes(':')) {
        l = l.split(':').slice(1).join(':').trim();
      }
      if (l) {
        if (pcCounter === currentPC) return i + 1;
        pcCounter += 4;
      }
    }
    return -1;
  }, [lines, currentPC]);

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl font-mono">
      {/* 1. Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-slate-800 px-3 py-2 bg-slate-950/80 shrink-0">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Assembly Source
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          {/* Check Syntax Button */}
          {onCheck && (
            <button
              onClick={onCheck}
              className="px-2 py-0.5 rounded font-semibold text-cyan-300 hover:text-white bg-slate-800 hover:bg-cyan-600/30 border border-slate-700 transition"
              title="Validate assembly syntax, mnemonics, and labels without resetting simulation"
            >
              Check
            </button>
          )}

          {/* Load Example Button */}
          {onRunExample && (
            <button
              onClick={onRunExample}
              className="px-2 py-0.5 rounded text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
              title="Load example arithmetic & memory program"
            >
              Example
            </button>
          )}

          {/* Clear Button */}
          {onClear && (
            <button
              onClick={onClear}
              className="px-2 py-0.5 rounded text-slate-400 hover:text-rose-300 bg-slate-800 hover:bg-rose-950/40 border border-slate-700 transition"
              title="Clear assembly code"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* 2. Check / Validation Status Banner */}
      {checkStatus && (
        <div
          className={`flex items-center justify-between px-3 py-1.5 text-[11px] border-b ${
            checkStatus.valid
              ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-300'
              : 'bg-rose-950/60 border-rose-800/60 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-1.5">
            {checkStatus.valid ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            )}
            <span className="truncate">{checkStatus.message}</span>
          </div>
          {checkStatus.valid && onAssembleAndLoad && (
            <button
              onClick={onAssembleAndLoad}
              className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[10px] shadow shrink-0"
            >
              Load
            </button>
          )}
        </div>
      )}

      {/* 3. Text Area with Line Numbers */}
      <div className="relative flex-1 flex overflow-hidden min-h-[200px]">
        {/* Line Numbers Gutter */}
        <div
          ref={lineNumsRef}
          className="w-9 sm:w-10 shrink-0 overflow-hidden border-r border-slate-800 bg-[#090d18] py-3 pr-1.5 sm:pr-2 text-right text-[11px] sm:text-[12px] leading-6 text-slate-600 select-none"
          aria-hidden
        >
          {lines.map((_, i) => {
            const lineNum = i + 1;
            const isError = errorLineSet.has(lineNum);
            const isActivePC = lineNum === activeLineIndex;

            return (
              <div
                key={i}
                className={`flex items-center justify-end gap-1 ${
                  isError
                    ? 'text-rose-400 bg-rose-500/20 font-bold'
                    : isActivePC
                    ? 'text-cyan-300 bg-cyan-500/20 font-bold'
                    : ''
                }`}
              >
                {isActivePC && <span className="text-[8px] sm:text-[9px] text-cyan-400">▶</span>}
                <span>{lineNum}</span>
              </div>
            );
          })}
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={source}
          onChange={(e) => onChange && onChange(e.target.value)}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          className="flex-1 bg-transparent text-slate-100 p-2.5 sm:p-3 leading-6 outline-none resize-none text-[12px] sm:text-[12.5px] font-mono focus:ring-0 selection:bg-cyan-500/30 overflow-auto whitespace-pre"
          placeholder="# Enter RV32I instructions here...&#10;addi x1, x0, 5"
        />
      </div>

      {/* 4. Diagnostic Error Console */}
      {errorMessages.length > 0 && (
        <div className="border-t border-rose-900/60 bg-rose-950/40 p-2 sm:p-2.5 max-h-24 sm:max-h-28 overflow-y-auto shrink-0 text-xs text-rose-300">
          <div className="flex items-center gap-1.5 font-bold mb-1 text-rose-400 text-[11px]">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Assembly Diagnostic Errors ({errorMessages.length}):</span>
          </div>
          <div className="space-y-0.5">
            {errorMessages.map((msg, idx) => (
              <div key={idx} className="font-mono text-[11px] text-rose-300/90 pl-4 sm:pl-5 truncate">
                • {msg}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
