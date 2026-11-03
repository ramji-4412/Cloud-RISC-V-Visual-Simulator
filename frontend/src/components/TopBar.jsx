export default function TopBar({
  backendAlive,
  verilatorConnected,
  simConnected,
  cycleCount,
  isChecking,
  onRefresh,
  title = 'Cloud RISC-V Studio',
  subtitle = 'Visual Simulator & Waveform Studio',
}) {
  return (
    <header className="flex items-center justify-between border-b border-[#23304a] bg-[#0a0e1a] px-4 py-2 z-10">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400">
          <span className="font-mono text-lg font-bold">R</span>
        </div>
        <div>
          <h1 className="text-xs font-bold tracking-tight text-slate-100 uppercase tracking-wider">
            {title}
          </h1>
          <p className="text-[10px] text-slate-500">{subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-2 py-1 rounded-md border border-[#23304a] bg-[#111729]">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              backendAlive ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
            }`}
          />
          <span className="text-[10px] font-medium text-slate-300">
            Backend: {backendAlive ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        <div className="flex items-center gap-2 px-2 py-1 rounded-md border border-[#23304a] bg-[#111729]">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              verilatorConnected ? 'bg-emerald-400' : 'bg-amber-400'
            }`}
          />
          <span className="text-[10px] font-medium text-slate-300">
            Verilator: {verilatorConnected ? 'Connected' : 'Not connected'}
          </span>
        </div>
        <div className="flex items-center gap-2 px-2 py-1 rounded-md border border-[#23304a] bg-[#111729]">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              simConnected ? 'bg-emerald-400' : 'bg-slate-600'
            }`}
          />
          <span className="text-[10px] font-medium text-slate-300">
            Sim: {simConnected ? `Cycle ${cycleCount ?? 0}` : 'Stopped'}
          </span>
        </div>
        <button
          onClick={onRefresh}
          disabled={isChecking}
          className="btn btn-icon"
        >
          {isChecking ? (
            <svg className="h-3.5 w-3.5 animate-spin text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938V30a1 1 0 001 1h28a1 1 0 001-1v-8.33c0-.761-.097-1.5-.273-2.197z"></path>
            </svg>
          ) : (
            <svg className="h-3.5 w-3.5 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
          )}
        </button>
      </div>
    </header>
  );
}
