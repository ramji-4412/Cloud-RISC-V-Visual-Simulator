export default function StatusBar({
  cycleCount,
  simError,
  backendError,
  statusMessage,
  isSimulating,
}) {
  const simActive = isSimulating || cycleCount > 0;
  return (
    <footer className="flex items-center justify-between border-t border-[#23304a] bg-[#0a0e1a] px-4 py-1.5 z-10">
      <div className="flex items-center gap-3 text-[10px] text-slate-400">
        <span className="flex items-center gap-1.5">
          <span
            className={`h-1.5 w-1.5 rounded-full ${simActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`}
          />
          <span className="tracking-tight uppercase">
            RV32I &middot; Five-stage pipeline &middot; {cycleCount ?? 0} cycles
          </span>
        </span>
      </div>
      <div className="text-[10px] text-slate-500 max-w-md truncate">
        {simError || backendError || statusMessage || 'Backend monitoring active'}
      </div>
    </footer>
  );
}
