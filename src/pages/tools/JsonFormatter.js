import { useState } from 'react';
import ToolShell from '../../components/ToolShell';
import { tools } from '../../data/tools';

const tool = tools.find((t) => t.id === 'json-formatter');

export default function JsonFormatter() {
  const [input, setInput] = useState('{\n  "hello": "world"\n}');
  const [status, setStatus] = useState('');

  const pretty = () => {
    try {
      setInput(JSON.stringify(JSON.parse(input), null, 2));
      setStatus('Formatted.');
    } catch (err) {
      setStatus(err.message);
    }
  };

  const minify = () => {
    try {
      setInput(JSON.stringify(JSON.parse(input)));
      setStatus('Minified.');
    } catch (err) {
      setStatus(err.message);
    }
  };

  const validate = () => {
    try {
      JSON.parse(input);
      setStatus('Valid JSON.');
    } catch (err) {
      setStatus(err.message);
    }
  };

  return (
    <ToolShell tool={tool}>
      <div className="stack">
        <div className="field">
          <label htmlFor="json-input">JSON</label>
          <textarea
            id="json-input"
            className="textarea"
            style={{ minHeight: 300, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' }}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </div>
        <div className="row">
          <button type="button" className="btn btn-primary" onClick={pretty}>
            Pretty print
          </button>
          <button type="button" className="btn btn-ghost" onClick={minify}>
            Minify
          </button>
          <button type="button" className="btn btn-ghost" onClick={validate}>
            Validate
          </button>
        </div>
        {status && (
          <p className={`status ${status.includes('Valid') || status.endsWith('.') ? 'ok' : 'error'}`}>
            {status}
          </p>
        )}
      </div>
    </ToolShell>
  );
}
