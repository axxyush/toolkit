import { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { saveAs } from 'file-saver';
import ToolShell from '../../components/ToolShell';
import FilePicker from '../../components/FilePicker';
import { tools } from '../../data/tools';

const tool = tools.find((t) => t.id === 'pdf-merge');

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** i).toFixed(i ? 1 : 0)} ${units[i]}`;
}

export default function PdfMerge() {
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const onFiles = (list) => {
    const pdfs = [...(list || [])].filter(
      (f) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name)
    );
    setFiles((prev) => [...prev, ...pdfs]);
    setStatus(
      pdfs.length
        ? `Added ${pdfs.length} PDF${pdfs.length > 1 ? 's' : ''}.`
        : 'Choose PDF files only.'
    );
  };

  const move = (index, dir) => {
    setFiles((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const removeAt = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const merge = async () => {
    if (files.length < 2) {
      setStatus('Add at least two PDFs to merge.');
      return;
    }

    setBusy(true);
    setStatus('Merging…');
    try {
      const merged = await PDFDocument.create();
      for (const file of files) {
        const bytes = await file.arrayBuffer();
        const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const pages = await merged.copyPages(doc, doc.getPageIndices());
        pages.forEach((page) => merged.addPage(page));
      }
      const output = await merged.save({ useObjectStreams: true });
      saveAs(new Blob([output], { type: 'application/pdf' }), 'merged.pdf');
      setStatus(`Done — ${files.length} PDFs merged.`);
    } catch (err) {
      setStatus(err.message || 'Merge failed. One of the PDFs may be encrypted or damaged.');
    } finally {
      setBusy(false);
    }
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
            if (e.dataTransfer.files?.length) onFiles(e.dataTransfer.files);
          }}
        >
          <FilePicker
            accept=".pdf,application/pdf"
            multiple
            label="Choose PDFs"
            files={files}
            onChange={onFiles}
            hint="Add two or more PDFs, reorder them, then merge into one download."
          />
        </div>

        {files.length > 0 && (
          <div className="preview-box" style={{ padding: 0, overflow: 'hidden' }}>
            {files.map((file, index) => (
              <div key={`${file.name}-${file.lastModified}-${index}`} className="list-row">
                <div>
                  <strong>
                    {index + 1}. {file.name}
                  </strong>
                  <div className="hint" style={{ margin: 0 }}>
                    {formatBytes(file.size)}
                  </div>
                </div>
                <div className="row" style={{ margin: 0 }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => move(index, -1)}
                    disabled={index === 0 || busy}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => move(index, 1)}
                    disabled={index === files.length - 1 || busy}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => removeAt(index)}
                    disabled={busy}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="row">
          <button
            type="button"
            className="btn btn-primary"
            onClick={merge}
            disabled={busy || files.length < 2}
          >
            {busy ? 'Merging…' : 'Merge PDFs'}
          </button>
          {files.length > 0 && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setFiles([]);
                setStatus('');
              }}
              disabled={busy}
            >
              Clear
            </button>
          )}
        </div>

        {status && (
          <p
            className={`status ${
              status.includes('failed') ||
              status.includes('least') ||
              status.includes('only')
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
