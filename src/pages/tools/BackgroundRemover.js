import { useState } from 'react';
import { removeBackground } from '@imgly/background-removal';
import { saveAs } from 'file-saver';
import ToolShell from '../../components/ToolShell';
import FilePicker from '../../components/FilePicker';
import { tools } from '../../data/tools';

const tool = tools.find((t) => t.id === 'background-remover');

export default function BackgroundRemover() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [resultUrl, setResultUrl] = useState('');
  const [resultBlob, setResultBlob] = useState(null);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const onFile = (list) => {
    const next = list?.[0] || null;
    if (preview) URL.revokeObjectURL(preview);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setFile(next);
    setPreview(next ? URL.createObjectURL(next) : '');
    setResultUrl('');
    setResultBlob(null);
    setStatus(next ? `Ready: ${next.name}` : '');
  };

  const run = async () => {
    if (!file) {
      setStatus('Choose an image first.');
      return;
    }

    setBusy(true);
    setStatus('Loading AI model (first run may take a bit)…');
    try {
      const blob = await removeBackground(file, {
        progress: (key, current, total) => {
          if (!total) return;
          const pct = Math.round((current / total) * 100);
          setStatus(`Removing background… ${key} ${pct}%`);
        },
      });
      if (resultUrl) URL.revokeObjectURL(resultUrl);
      const url = URL.createObjectURL(blob);
      setResultBlob(blob);
      setResultUrl(url);
      setStatus('Background removed. Download the transparent PNG below.');
    } catch (err) {
      setStatus(err.message || 'Background removal failed.');
    } finally {
      setBusy(false);
    }
  };

  const download = () => {
    if (!resultBlob) return;
    const name = `${(file?.name || 'image').replace(/\.[^.]+$/, '')}-no-bg.png`;
    saveAs(resultBlob, name);
  };

  return (
    <ToolShell tool={tool}>
      <div className="stack">
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
            accept="image/*"
            label="Choose image"
            files={file ? [file] : []}
            onChange={onFile}
            hint="Runs fully in your browser with an on-device model. Works best with a clear subject (person, product, pet)."
          />
        </div>

        {(preview || resultUrl) && (
          <div className="panel-split">
            {preview && (
              <div className="field">
                <label>Original</label>
                <div className="preview-box">
                  <img
                    src={preview}
                    alt="Original"
                    style={{ maxHeight: 280, margin: '0 auto' }}
                  />
                </div>
              </div>
            )}
            {resultUrl && (
              <div className="field">
                <label>No background</label>
                <div
                  className="preview-box"
                  style={{
                    background:
                      'linear-gradient(45deg,#d0d7de 25%,transparent 25%),linear-gradient(-45deg,#d0d7de 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#d0d7de 75%),linear-gradient(-45deg,transparent 75%,#d0d7de 75%)',
                    backgroundSize: '16px 16px',
                    backgroundPosition: '0 0,0 8px,8px -8px,-8px 0',
                  }}
                >
                  <img
                    src={resultUrl}
                    alt="Background removed"
                    style={{ maxHeight: 280, margin: '0 auto' }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <div className="row">
          <button
            type="button"
            className="btn btn-primary"
            onClick={run}
            disabled={busy || !file}
          >
            {busy ? 'Processing…' : 'Remove background'}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={download}
            disabled={!resultBlob}
          >
            Download PNG
          </button>
        </div>

        {status && (
          <p
            className={`status ${
              status.includes('failed') || status.includes('Choose') ? 'error' : 'ok'
            }`}
          >
            {status}
          </p>
        )}
      </div>
    </ToolShell>
  );
}
