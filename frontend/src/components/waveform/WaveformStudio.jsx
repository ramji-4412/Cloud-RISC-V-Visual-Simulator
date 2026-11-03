import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Activity, ZoomIn, ZoomOut, Radio, FileText, Upload, RefreshCw } from 'lucide-react';
import { WAVEFORM_SIGNALS, toHex } from '../../services/simulatorEngine.js';
import { SAMPLE_PIPELINE_VCD } from '../../data/sampleVcd.js';
import { parseVcd } from './VcdParser.js';

export default function WaveformStudio({
  waveforms = [],
  currentCycle = 0,
  vcdData = null,
  onLoadVcd = null,
  onStartTrace = null,
  onStopTrace = null,
  isTracing = false,
  traceStatus = null
}) {
  const [viewMode, setViewMode] = useState('live'); // 'live' | 'vcd'
  const [zoom, setZoom] = useState(1);
  const [hoveredCycle, setHoveredCycle] = useState(null);

  // VCD viewer state
  const [selectedSignalIds, setSelectedSignalIds] = useState(new Set());
  const [signalSearch, setSignalSearch] = useState('');
  const [vcdScrollX, setVcdScrollX] = useState(0);

  const canvasRef = useRef(null);
  const canvasContainerRef = useRef(null);

  // Auto-scroll canvas to rightmost cycle when new cycle arrives
  useEffect(() => {
    if (viewMode === 'live' && canvasContainerRef.current) {
      canvasContainerRef.current.scrollLeft = canvasContainerRef.current.scrollWidth;
    }
  }, [waveforms.length, viewMode]);

  // ----------------------------------------------------------------
  // Render Live Logic Analyzer onto Canvas
  // ----------------------------------------------------------------
  useEffect(() => {
    if (viewMode !== 'live') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Dark engineering background
    ctx.fillStyle = '#080d1a';
    ctx.fillRect(0, 0, width, height);

    const rowHeight = 24;
    const nameWidth = 130;
    const timeWidth = width - nameWidth;
    const cycleCount = waveforms.length;

    if (cycleCount === 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '12px monospace';
      ctx.fillText('No simulation telemetry recorded yet. Click "Run" or "Step" above to stream logic waveforms.', nameWidth + 20, 50);
      return;
    }

    const stepWidth = Math.max(20, (timeWidth / Math.max(30, cycleCount)) * zoom);

    // Grid cycle lines & Headers
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.font = '10px monospace';
    ctx.fillStyle = '#64748b';

    for (let c = 0; c < cycleCount; c++) {
      const x = nameWidth + c * stepWidth;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();

      if (c % 2 === 0 || stepWidth > 28) {
        ctx.fillText(`C${waveforms[c].cycle ?? c}`, x + 4, 14);
      }
    }

    // Render each signal track
    WAVEFORM_SIGNALS.forEach((sig, idx) => {
      const yBase = 24 + idx * rowHeight;

      // Track label background
      ctx.fillStyle = '#0b1120';
      ctx.fillRect(0, yBase, nameWidth, rowHeight);

      // Track label text
      ctx.fillStyle = sig.color;
      ctx.font = 'bold 11px monospace';
      ctx.fillText(sig.name, 10, yBase + 16);

      // Track separator line
      ctx.strokeStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(0, yBase + rowHeight);
      ctx.lineTo(width, yBase + rowHeight);
      ctx.stroke();

      ctx.strokeStyle = sig.color;
      ctx.lineWidth = 1.75;

      if (sig.type === 'digital') {
        ctx.beginPath();
        waveforms.forEach((point, cIdx) => {
          const val = point[sig.key] ? 1 : 0;
          const xStart = nameWidth + cIdx * stepWidth;
          const xEnd = xStart + stepWidth;
          const y = val === 1 ? yBase + 4 : yBase + rowHeight - 4;

          if (cIdx === 0) {
            ctx.moveTo(xStart, y);
          } else {
            ctx.lineTo(xStart, y);
          }
          ctx.lineTo(xEnd, y);
        });
        ctx.stroke();
      } else {
        // Bus signal (draw diamond cells with hex values)
        waveforms.forEach((point, cIdx) => {
          const xStart = nameWidth + cIdx * stepWidth;
          const xEnd = xStart + stepWidth;
          const val = point[sig.key];

          ctx.beginPath();
          ctx.moveTo(xStart, yBase + rowHeight / 2);
          ctx.lineTo(xStart + 4, yBase + 3);
          ctx.lineTo(xEnd - 4, yBase + 3);
          ctx.lineTo(xEnd, yBase + rowHeight / 2);
          ctx.lineTo(xEnd - 4, yBase + rowHeight - 3);
          ctx.lineTo(xStart + 4, yBase + rowHeight - 3);
          ctx.closePath();
          ctx.fillStyle = `${sig.color}18`;
          ctx.fill();
          ctx.stroke();

          // Hex string inside bus cell
          if (stepWidth > 32) {
            ctx.fillStyle = sig.color;
            ctx.font = '9px monospace';
            const hexVal = typeof val === 'number' ? toHex(val, 4) : String(val ?? 0);
            ctx.fillText(hexVal, xStart + 5, yBase + 15);
          }
        });
      }
    });

    // Hover cycle indicator line
    if (hoveredCycle !== null) {
      const hx = nameWidth + hoveredCycle * stepWidth;
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(hx, 0);
      ctx.lineTo(hx, height);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [waveforms, zoom, hoveredCycle, viewMode]);

  // ----------------------------------------------------------------
  // VCD Signals Calculations
  // ----------------------------------------------------------------
  const vcdSignals = useMemo(() => vcdData?.signals || [], [vcdData]);
  const vcdTimeline = useMemo(() => vcdData?.timeline || [], [vcdData]);

  const vcdTimes = useMemo(() => vcdTimeline.map(t => t.time), [vcdTimeline]);
  const vcdMinT = vcdTimes.length > 0 ? Math.min(...vcdTimes) : 0;
  const vcdMaxT = vcdTimes.length > 0 ? Math.max(...vcdTimes) : 1;
  const vcdTimeSpan = Math.max(1, vcdMaxT - vcdMinT);

  const vcdContentWidth = 1400 * zoom;
  const vcdScaleX = (t) => 50 + ((t - vcdMinT) / vcdTimeSpan) * (vcdContentWidth - 100);

  const filteredVcdSignals = useMemo(() => {
    if (!vcdSignals.length) return [];
    const q = signalSearch.toLowerCase().trim();
    const list = q
      ? vcdSignals.filter(s => s.name.toLowerCase().includes(q) || s.scope.toLowerCase().includes(q))
      : vcdSignals;
    if (selectedSignalIds.size > 0) {
      return list.filter(s => selectedSignalIds.has(s.id));
    }
    return list.slice(0, 24); // Show top 24 signals by default
  }, [vcdSignals, signalSearch, selectedSignalIds]);

  const handleSelectAllVcd = () => {
    setSelectedSignalIds(new Set(vcdSignals.map(s => s.id)));
  };

  const handleSelectNoneVcd = () => {
    setSelectedSignalIds(new Set());
  };

  const handleToggleVcdSignal = (id) => {
    setSelectedSignalIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleLoadSampleVcd = () => {
    try {
      const parsed = parseVcd(SAMPLE_PIPELINE_VCD);
      if (onLoadVcd) onLoadVcd(parsed);
      setViewMode('vcd');
    } catch (err) {
      console.error('Failed to parse sample VCD:', err);
    }
  };

  const handleVcdFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result;
        const parsed = parseVcd(text);
        if (onLoadVcd) onLoadVcd(parsed);
        setViewMode('vcd');
      } catch (err) {
        alert('Failed to parse VCD file: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  // ================================================================
  // RENDER
  // ================================================================
  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl font-mono">
      {/* 1. Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-950/80 border-b border-slate-800 shrink-0">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold tracking-wider uppercase text-slate-200">
              Waveform Studio
            </span>
          </div>

          {/* Mode Switcher */}
          <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[11px]">
            <button
              onClick={() => setViewMode('live')}
              className={`px-2 py-0.5 sm:px-2.5 rounded font-semibold flex items-center gap-1 transition ${
                viewMode === 'live' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Radio className="w-3 h-3" />
              Live ({waveforms.length} cycles)
            </button>
            <button
              onClick={() => setViewMode('vcd')}
              className={`px-2 py-0.5 sm:px-2.5 rounded font-semibold flex items-center gap-1 transition ${
                viewMode === 'vcd' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3 h-3" />
              VCD {vcdData ? `(${vcdSignals.length})` : ''}
            </button>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {viewMode === 'vcd' && (
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={handleLoadSampleVcd}
                className="px-2 py-0.5 text-[10px] bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded border border-slate-700 transition"
                title="Load bundled 5-stage pipeline VCD trace"
              >
                Sample VCD
              </button>
              <label className="px-2 py-0.5 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 cursor-pointer transition flex items-center gap-1">
                <Upload className="w-3 h-3" />
                Open .VCD
                <input type="file" accept=".vcd" onChange={handleVcdFileUpload} className="hidden" />
              </label>
              {onStartTrace && onStopTrace && (
                <button
                  onClick={isTracing ? onStopTrace : onStartTrace}
                  className={`px-2 py-0.5 text-[10px] rounded font-semibold transition ${
                    isTracing
                      ? 'bg-rose-600 hover:bg-rose-500 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                  }`}
                >
                  {isTracing ? 'Stop Recording' : 'Record Trace'}
                </button>
              )}
            </div>
          )}

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5">
            <button
              onClick={() => setZoom(prev => Math.max(0.5, prev - 0.25))}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] text-slate-400 w-9 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(prev => Math.min(2.5, prev + 0.25))}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Body Viewports */}
      {viewMode === 'live' ? (
        /* ================= LIVE LOGIC ANALYZER ================= */
        <div ref={canvasContainerRef} className="relative flex-1 overflow-x-auto overflow-y-hidden bg-[#080d1a]">
          <canvas
            ref={canvasRef}
            width={Math.max(1200, waveforms.length * 28 * zoom + 150)}
            height={380}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left - 130;
              const stepWidth = Math.max(20, ((rect.width - 130) / Math.max(30, waveforms.length)) * zoom);
              const cycleIdx = Math.floor(x / stepWidth);
              if (cycleIdx >= 0 && cycleIdx < waveforms.length) {
                setHoveredCycle(cycleIdx);
              } else {
                setHoveredCycle(null);
              }
            }}
            onMouseLeave={() => setHoveredCycle(null)}
            className="cursor-crosshair"
          />
        </div>
      ) : (
        /* ================= VERILATOR VCD VIEWER ================= */
        <div className="flex-1 flex flex-col min-h-0 bg-[#080d1a]">
          {!vcdData || !vcdSignals.length ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500">
              <Activity className="w-10 h-10 mb-2 opacity-30 text-cyan-400" />
              <p className="text-xs font-semibold text-slate-300">No VCD waveform data loaded.</p>
              <p className="text-[11px] text-slate-500 mt-1 max-w-sm">
                Click "Sample VCD" to inspect bundled RV32I 5-stage pipeline hardware trace, or click "Record Trace" during simulation.
              </p>
              <button
                onClick={handleLoadSampleVcd}
                className="mt-3 px-3 py-1.5 text-xs bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded shadow transition"
              >
                Load Sample Pipeline VCD (176 Signals)
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Signal Filter Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-slate-950/60 border-b border-slate-800 text-[11px] text-slate-400">
                <div className="flex items-center gap-2">
                  <span>Signals:</span>
                  <button onClick={handleSelectAllVcd} className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300">
                    All
                  </button>
                  <button onClick={handleSelectNoneVcd} className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300">
                    None
                  </button>
                  <span className="text-[10px] text-slate-500 hidden sm:inline">
                    Showing {filteredVcdSignals.length} of {vcdSignals.length}
                  </span>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <input
                    type="text"
                    placeholder="Filter signal..."
                    value={signalSearch}
                    onChange={(e) => setSignalSearch(e.target.value)}
                    className="px-2 py-0.5 text-xs bg-slate-900 border border-slate-700 rounded text-slate-200 outline-none focus:border-cyan-500 w-28 sm:w-36"
                  />
                  <span className="text-[10px]">
                    {vcdMinT} → {vcdMaxT} ps
                  </span>
                </div>
              </div>

              {/* Scrollable Signal Tracks */}
              <div className="flex-1 overflow-auto divide-y divide-slate-800/40">
                {filteredVcdSignals.map((sig) => {
                  const isChecked = selectedSignalIds.size === 0 || selectedSignalIds.has(sig.id);
                  const changes = sig.changes || [];
                  const isDigital = sig.width === 1;

                  // Build digital step path
                  let svgPath = '';
                  if (changes.length > 0) {
                    let lastY = changes[0].value ? 4 : 16;
                    let lastX = vcdScaleX(vcdMinT);
                    svgPath = `M ${lastX} ${lastY} `;

                    changes.forEach((c) => {
                      const curX = vcdScaleX(c.time);
                      const curY = c.value ? 4 : 16;
                      svgPath += `L ${curX} ${lastY} L ${curX} ${curY} `;
                      lastX = curX;
                      lastY = curY;
                    });
                    svgPath += `L ${vcdScaleX(vcdMaxT)} ${lastY}`;
                  } else {
                    const y = sig.value ? 4 : 16;
                    svgPath = `M ${vcdScaleX(vcdMinT)} ${y} L ${vcdScaleX(vcdMaxT)} ${y}`;
                  }

                  return (
                    <div key={sig.id} className="flex items-center h-7 hover:bg-slate-950/40 text-[11px]">
                      {/* Signal Label Column */}
                      <div className="w-48 sm:w-64 shrink-0 px-2 sm:px-3 flex items-center gap-1.5 sm:gap-2 truncate border-r border-slate-800/60">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleVcdSignal(sig.id)}
                          className="rounded border-slate-700 bg-slate-800 text-cyan-500"
                        />
                        <span className="text-slate-300 font-semibold truncate text-[10px] sm:text-[11px]" title={`${sig.scope}.${sig.name}`}>
                          {sig.name}
                        </span>
                        {sig.width > 1 && (
                          <span className="text-[9px] px-1 bg-slate-800 text-indigo-300 rounded font-mono">
                            [{sig.width - 1}:0]
                          </span>
                        )}
                      </div>

                      {/* Waveform Trace */}
                      <div className="flex-1 overflow-x-hidden relative h-5">
                        <svg width={vcdContentWidth} height={20} className="overflow-visible">
                          {isDigital ? (
                            <path
                              d={svgPath}
                              fill="none"
                              stroke="#38bdf8"
                              strokeWidth="1.5"
                            />
                          ) : (
                            /* Bus signal boxes */
                            changes.map((c, i) => {
                              const x1 = vcdScaleX(c.time);
                              const nextT = changes[i + 1]?.time ?? vcdMaxT;
                              const x2 = vcdScaleX(nextT);
                              const w = Math.max(8, x2 - x1);
                              return (
                                <g key={i}>
                                  <polygon
                                    points={`${x1},10 ${x1 + 3},4 ${x2 - 3},4 ${x2},10 ${x2 - 3},16 ${x1 + 3},16`}
                                    fill="rgba(129, 140, 248, 0.15)"
                                    stroke="#818cf8"
                                    strokeWidth="1"
                                  />
                                  {w > 30 && (
                                    <text x={x1 + 6} y={13} fill="#818cf8" fontSize="9" fontFamily="monospace">
                                      {toHex(c.value ?? 0, 4)}
                                    </text>
                                  )}
                                </g>
                              );
                            })
                          )}
                        </svg>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
