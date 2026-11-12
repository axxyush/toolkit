import { useState } from 'react';
import ToolShell from '../../components/ToolShell';
import { tools } from '../../data/tools';

const tool = tools.find((t) => t.id === 'uuid-generator');

export default function UuidGenerator() {
  const [count, setCount] = useState(5);
  const [uuids, setUuids] = useState([]);
  const [status, setStatus] = useState('');

  const generate = () => {
    const next = Array.from({ length: count }, () => crypto.randomUUID());
    setUuids(next);
    setStatus('');
  };

  const copy = async () => {
    if (!uuids.length) return;
    await navigator.clipboard.writeText(uuids.join('\n'));
    setStatus('Copied.');
  };

  return (
    <ToolShell tool={tool}>
      <div className="stack">
        <div className="field" style={{ maxWidth: 240 }}>
          <label htmlFor="uuid-count">How many</label>
          <input
            id="uuid-count"
            className="input"
            type="number"
            min="1"
            max="100"
            value={count}
            onChange={(e) => setCount(clampCount(e.target.value))}
          />
        </div>
        <div className="row">
          <button type="button" className="btn btn-primary" onClick={generate}>
            Generate
          </button>
          <button type="button" className="btn btn-ghost" onClick={copy} disabled={!uuids.length}>
            Copy all
          </button>
        </div>
        <div className="password-display" style={{ minHeight: 120 }}>
          {uuids.length ? uuids.join('\n') : 'UUIDs will appear here'}
        </div>
        {status && <p className="status ok">{status}</p>}
      </div>
    </ToolShell>
  );
}

function clampCount(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return 1;
  return Math.min(100, Math.max(1, Math.round(n)));
}
