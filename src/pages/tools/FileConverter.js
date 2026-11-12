import { useMemo, useState } from 'react';
import ToolShell from '../../components/ToolShell';
import FilePicker from '../../components/FilePicker';
import { tools } from '../../data/tools';
import {
  CONVERSION_MAP,
  FORMAT_OPTIONS,
  acceptForFormat,
  convertFile,
  labelForFormat,
} from '../../lib/conversions';

const tool = tools.find((t) => t.id === 'file-converter');

export default function FileConverter() {
  const [from, setFrom] = useState('pdf');
  const [to, setTo] = useState('png');
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const toOptions = useMemo(() => CONVERSION_MAP[from] || [], [from]);

  const onFromChange = (nextFrom) => {
    setFrom(nextFrom);
    const nextTargets = CONVERSION_MAP[nextFrom] || [];
    setTo(nextTargets.includes(to) ? to : nextTargets[0] || '');
    setFile(null);
    setStatus('');
    setProgress(null);
  };

  const onFile = (list) => {
    const next = list?.[0] || null;
    setFile(next);
    setProgress(null);
    setStatus(next ? `Ready: ${next.name}` : '');
  };

  const convert = async () => {
    if (!file) {
      setStatus('Choose a file first.');
      return;
    }
    if (!to) {
      setStatus('Choose a destination format.');
      return;
    }

    setBusy(true);
    setProgress(null);
    setStatus(`Converting ${labelForFormat(from)} → ${labelForFormat(to)}…`);

    try {
      await convertFile({
        file,
        from,
        to,
        onStatus: setStatus,
        onProgress: setProgress,
      });
      setStatus('Done — download started.');
      setProgress(100);
    } catch (err) {
      setStatus(err.message || 'Conversion failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolShell tool={tool}>
      <div className="stack">
        <div className="converter-grid">
          <div className="field">
            <label htmlFor="convert-from">Convert from</label>
            <select
              id="convert-from"
              className="select"
              value={from}
              onChange={(e) => onFromChange(e.target.value)}
            >
              {FORMAT_OPTIONS.map((format) => (
                <option key={format.id} value={format.id}>
                  {format.label}
                </option>
              ))}
            </select>
          </div>

          <div className="converter-arrow" aria-hidden="true">
            →
          </div>

          <div className="field">
            <label htmlFor="convert-to">Convert to</label>
            <select
              id="convert-to"
              className="select"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            >
              {toOptions.map((id) => (
                <option key={id} value={id}>
                  {labelForFormat(id)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="hint">
          {labelForFormat(from)} can convert to:{' '}
          {toOptions.map(labelForFormat).join(', ') || 'nothing yet'}.
        </p>

        <div
          className={`dropzone ${dragOver ? 'dragover' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files?.length) onFile(e.dataTransfer.files);
          }}
        >
          <FilePicker
            accept={acceptForFormat(from)}
            label="Choose file"
            files={file ? [file] : []}
            onChange={onFile}
            hint="Runs locally in your browser. Video/audio uses ffmpeg.wasm (first run downloads the engine)."
          />
        </div>

        {progress !== null && (
          <div className="field">
            <label>Progress: {progress}%</label>
            <div
              style={{
                height: 10,
                borderRadius: 999,
                background: 'rgba(11,18,32,0.08)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: '100%',
                  background: 'var(--accent)',
                  transition: 'width 0.2s ease',
                }}
              />
            </div>
          </div>
        )}

        <div className="row">
          <button
            type="button"
            className="btn btn-primary"
            onClick={convert}
            disabled={busy || !file || !to}
          >
            {busy
              ? 'Converting…'
              : `Convert ${labelForFormat(from)} → ${labelForFormat(to)}`}
          </button>
        </div>

        {status && (
          <p
            className={`status ${
              status.includes('failed') ||
              status.includes('Choose') ||
              status.includes('Could') ||
              status.includes('not supported')
                ? 'error'
                : 'ok'
            }`}
          >
            {status}
          </p>
        )}
      </div>
    </ToolShell>
  );
}
