import { useState, useCallback } from 'react';

const DEFAULT_WIDTH = 900;
const ROW_HEIGHT = 34;
const HEADER_HEIGHT = 40;

export default function WaveformViewer({ vcdData }) {
  const [selectedSignalIds, setSelectedSignalIds] = useState(new Set());
  const [scrollX, setScrollX] = useState(0);

  if (!vcdData || !vcdData.signals || vcdData.signals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-slate-900 rounded-md border border-slate-700">
        <p className="text-xs text-slate-500">No waveform data.</p>
        <p className="text-[10px] text-slate-600 mt-1">Start tracing, run the simulator, then stop trace.</p>
      </div>
    );
  }

  const signals = vcdData.signals;
  const timeline = vcdData.timeline;
  const times = timeline.map(t => t.time);
  const minT = Math.min(...times);
  const maxT = Math.max(...times);
  const timeSpan = maxT - minT || 1;

  // Determine visible width from container; use a large virtual width for scrolling
  const contentWidth = Math.max(DEFAULT_WIDTH, signals.length * 0 + 1000);

  const scaleX = (t) => 50 + ((t - minT) / timeSpan) * (contentWidth - 100);

  const toggleSignal = (id) => {
    setSelectedSignalIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedSignalIds(new Set(signals.map(s => s.id)));
  };

  const selectNone = () => {
    setSelectedSignalIds(new Set());
  };

  const visibleSignals = selectedSignalIds.size > 0
    ? signals.filter(s => selectedSignalIds.has(s.id))
    : signals.slice(0, 20);

  const handleScroll = (e) => {
    setScrollX(e.currentTarget.scrollLeft);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-md border border-slate-700 overflow-hidden">
      {/* Signal selection controls */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/50 px-3 py-2">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Signals:</span>
          <button
            onClick={selectAll}
            className="rounded border border-slate-700 px-1.5 py-0.5 text-[10px] text-slate-300 hover:bg-slate-800"
          >
            All
          </button>
          <button
            onClick={selectNone}
            className="rounded border border-slate-700 px-1.5 py-0.5 text-[10px] text-slate-300 hover:bg-slate-800"
          >
            None
          </button>
          <span className="text-[10px] text-slate-500 ml-2">
            {selectedSignalIds.size > 0 ? `${selectedSignalIds.size} / ${signals.length} selected` : `All ${signals.length} signals`}
          </span>
        </div>
        <div className="text-xs text-slate-500">
          {minT} → {maxT} ({timeSpan.toFixed(0)} ps)
        </div>
      </div>

      {/* Scrollable waveform area */}
      <div
        className="flex-1 overflow-auto relative"
        onScroll={handleScroll}
        style={{ scrollLeft: scrollX }}
      >
        <div className={`relative w-[${contentWidth}px] h-full`}>
          {/* Time axis (top) */}
          <div className="absolute top-0 left-50 right-[50] h-[24px] flex items-center border-b border-slate-800">
            {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => {
              const t = minT + frac * timeSpan;
              const x = scaleX(t) - scrollX;
              return (
                <div
                  key={i}
                  className="absolute text-[10px] text-slate-500"
                  style={{ left: `${Math.max(0, x - 20)}px`, width: '40px', textAlign: 'center' }}
                >
                  {t.toFixed(0)}
                </div>
              );
            })}
          </div>

          {/* Signal rows */}
          <div className="mt-24">
            {visibleSignals.map((sig, idx) => {
              const y = idx * ROW_HEIGHT + 10;
              const isSelected = selectedSignalIds.size > 0 ? selectedSignalIds.has(sig.id) : true;
              const hasChanges = sig.changes && sig.changes.length > 0;
              return (
                <div
                  key={sig.id}
                  className="flex items-center border-b border-slate-800/50 last:border-0"
                  style={{ height: ROW_HEIGHT }}
                >
                  {/* Signal label */}
                  <div className="w-64 shrink-0 pl-3 pr-2 flex items-center">
                    <label className="flex items-center gap-2 cursor-pointer select-none group">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSignal(sig.id)}
                        className="rounded border-slate-600 text-sky-500 focus:ring-sky-500"
                      />
                      <span className={`text-[10px] truncate ${isSelected ? 'text-slate-200' : 'text-slate-500'}`} title={`${sig.name} (${sig.scope})`}>
                        {sig.name}
                      </span>
                    </label>
                  </div>

                  {/* Waveform canvas area */}
                  <div className="flex-1 relative h-[20px]">
                    <svg
                      width={contentWidth - 50}
                      height={20}
                      className="absolute left-[50px] top-0"
                      style={{ transform: `translateX(-${scrollX}px)` }}
                    >
                      {/* Draw signal transitions as a step line */}
                      {hasChanges && sig.changes.length > 0 ? (
                        <polyline
                          points={sig.changes
                            .map((c) => {
                              const x = scaleX(c.time);
                              const val = c.value !== null && c.value !== 0 ? 4 : 16;
                              return `${x},${val}`;
                            })
                            .join(' ')}
                          fill="none"
                          stroke={sig.width === 1 ? '#38bdf8' : '#818cf8'}
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      ) : (
                        <line
                          x1={50}
                          y1={y}
                          x2={contentWidth - 50}
                          y2={y}
                          stroke="#374151"
                          strokeWidth="1"
                          strokeDasharray="2,2"
                        />
                      )}
                    </svg>
                    {/* Baseline reference */}
                    <div className="absolute left-[50px] right-0 top-9 h-[2px] bg-slate-800" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
