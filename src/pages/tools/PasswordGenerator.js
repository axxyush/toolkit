import { useState } from 'react';
import ToolShell from '../../components/ToolShell';
import { tools } from '../../data/tools';

const tool = tools.find((t) => t.id === 'password-generator');

function generatePassword({ length, lower, upper, numbers, symbols }) {
  const sets = [];
  if (lower) sets.push('abcdefghijklmnopqrstuvwxyz');
  if (upper) sets.push('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
  if (numbers) sets.push('0123456789');
  if (symbols) sets.push('!@#$%^&*()-_=+[]{};:,.<>?');
  if (!sets.length) return '';

  const all = sets.join('');
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);

  const chars = Array.from(values, (v) => all[v % all.length]);

  // Ensure at least one from each selected set
  sets.forEach((set, index) => {
    if (index >= length) return;
    const rand = crypto.getRandomValues(new Uint32Array(1))[0];
    chars[index] = set[rand % set.length];
  });

  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}

export default function PasswordGenerator() {
  const [length, setLength] = useState(16);
  const [lower, setLower] = useState(true);
  const [upper, setUpper] = useState(true);
  const [numbers, setNumbers] = useState(true);
  const [symbols, setSymbols] = useState(true);
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');

  const create = () => {
    const next = generatePassword({ length, lower, upper, numbers, symbols });
    if (!next) {
      setStatus('Select at least one character set.');
      return;
    }
    setPassword(next);
    setStatus('');
  };

  const copy = async () => {
    if (!password) return;
    await navigator.clipboard.writeText(password);
    setStatus('Copied.');
  };

  return (
    <ToolShell tool={tool}>
      <div className="stack">
        <div className="field" style={{ maxWidth: 360 }}>
          <label htmlFor="pw-length">Length: {length}</label>
          <input
            id="pw-length"
            className="input"
            type="range"
            min="8"
            max="64"
            value={length}
            onChange={(e) => setLength(Number(e.target.value))}
          />
        </div>

        <div className="check-row">
          <label className="check">
            <input type="checkbox" checked={lower} onChange={(e) => setLower(e.target.checked)} />
            Lowercase
          </label>
          <label className="check">
            <input type="checkbox" checked={upper} onChange={(e) => setUpper(e.target.checked)} />
            Uppercase
          </label>
          <label className="check">
            <input type="checkbox" checked={numbers} onChange={(e) => setNumbers(e.target.checked)} />
            Numbers
          </label>
          <label className="check">
            <input type="checkbox" checked={symbols} onChange={(e) => setSymbols(e.target.checked)} />
            Symbols
          </label>
        </div>

        <div className="password-display">{password || 'Click generate to create a password'}</div>

        <div className="row">
          <button type="button" className="btn btn-primary" onClick={create}>
            Generate
          </button>
          <button type="button" className="btn btn-ghost" onClick={copy} disabled={!password}>
            Copy
          </button>
        </div>
        {status && <p className={`status ${status.includes('Select') ? 'error' : 'ok'}`}>{status}</p>}
      </div>
    </ToolShell>
  );
}
