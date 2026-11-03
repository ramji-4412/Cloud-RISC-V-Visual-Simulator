export function parseVcd(text) {
  const signals = new Map();
  const scopeStack = [];
  let timescale = 1;
  let time = 0;
  const changesByTime = new Map();

  const scopeName = () => scopeStack.join('.');

  const lines = String(text || '').split(/\r?\n/);
  let i = 0;
  let inDumpvars = false;

  while (i < lines.length) {
    const line = lines[i].trim();
    i++;
    if (!line) continue;

    if (line.startsWith('$')) {
      if (line.startsWith('$timescale')) {
        const m = line.match(/(\d+)\s*(ps|ns|us|ms|s)/i);
        if (m) {
          const unit = m[2].toLowerCase();
          const base = unit === 'ps' ? 1e-3 : unit === 'ns' ? 1 : unit === 'us' ? 1e3 : unit === 'ms' ? 1e6 : 1e9;
          timescale = parseInt(m[1], 10) * base;
        }
        continue;
      }
      if (line.startsWith('$scope')) {
        const parts = line.split(/\s+/);
        scopeStack.push(parts[parts.length - 2] || parts[parts.length - 1]);
        continue;
      }
      if (line.startsWith('$upscope')) {
        scopeStack.pop();
        continue;
      }
      if (line.startsWith('$var')) {
        const parts = line.split(/\s+/);
        if (parts.length >= 5) {
          const type = parts[1];
          const width = parseInt(parts[2], 10) || 1;
          const id = parts[3];
          const name = parts.slice(4, parts.length - 1).join(' ');
          signals.set(id, { id, name, scope: scopeName(), width, type, value: null, changes: [] });
        }
        continue;
      }
      if (line.startsWith('$dumpvars')) {
        inDumpvars = true;
        continue;
      }
      if (line.startsWith('$dumpall')) {
        inDumpvars = true;
        continue;
      }
      if (line.startsWith('$end')) {
        inDumpvars = false;
        continue;
      }
      continue;
    }

    if (line.startsWith('#')) {
      time = parseInt(line.slice(1), 10) * timescale;
      continue;
    }

    let value = null;
    let id = null;
    if (line.startsWith('b') || line.startsWith('B')) {
      const parts = line.split(/\s+/);
      value = parts[0].slice(1);
      id = parts[1];
    } else if (line.length >= 2 && (line[0] === '0' || line[0] === '1' || line[0] === 'x' || line[0] === 'X' || line[0] === 'z' || line[0] === 'Z')) {
      value = line[0];
      id = line.slice(1).trim();
    } else {
      continue;
    }

    const sig = signals.get(id);
    if (!sig) continue;

    const rawValue = value;
    let numeric = null;
    if (rawValue === 'x' || rawValue === 'X') numeric = null;
    else if (rawValue === 'z' || rawValue === 'Z') numeric = null;
    else if (/^[01]+$/.test(rawValue)) numeric = parseInt(rawValue, 2);
    else numeric = parseInt(rawValue, 2);

    sig.value = numeric;
    if (!changesByTime.has(time)) changesByTime.set(time, []);
    changesByTime.get(time).push({ id, value: numeric, raw: rawValue });

    if (inDumpvars) {
      // initial values already recorded as changes at time 0
    }
  }

  const timeline = Array.from(changesByTime.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([t, changes]) => ({ time: t, changes }));

  // attach changes to signals
  for (const entry of timeline) {
    for (const ch of entry.changes) {
      const sig = signals.get(ch.id);
      if (sig) sig.changes.push({ time: entry.time, value: ch.value, raw: ch.raw });
    }
  }

  return {
    timescale,
    signals: Array.from(signals.values()),
    timeline,
  };
}

export default { parseVcd };
