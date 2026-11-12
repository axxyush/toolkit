import { useMemo, useState } from 'react';
import imageCompression from 'browser-image-compression';
import { zipSync } from 'fflate';
import { PDFDocument } from 'pdf-lib';
import { saveAs } from 'file-saver';
import ToolShell from '../../components/ToolShell';
import FilePicker from '../../components/FilePicker';
import { tools } from '../../data/tools';
import { convertVideoWithFFmpeg } from '../../lib/ffmpegClient';

const tool = tools.find((t) => t.id === 'file-compressor');

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(Math.max(bytes, 1)) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** i).toFixed(i ? 1 : 0)} ${units[i]}`;
}

function extOf(name = '') {
  const match = /\.([^.]+)$/.exec(name);
  return (match?.[1] || '').toLowerCase();
}

function classifyFile(file) {
  const ext = extOf(file.name);
  const type = file.type || '';

  if (type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'].includes(ext)) {
    return 'image';
  }
  if (
    type.startsWith('video/') ||
    ['mp4', 'mov', 'webm', 'mkv', 'avi', 'm4v'].includes(ext)
  ) {
    return 'video';
  }
  if (type === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (
    ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'odt', 'ods', 'odp', 'rtf', 'txt', 'md', 'csv'].includes(
      ext
    ) ||
    type.includes('document') ||
    type.includes('sheet') ||
    type.includes('presentation') ||
    type.startsWith('text/')
  ) {
    return 'document';
  }
  return 'other';
}

function compressionMethodLabel(kind, forceZip) {
  if (forceZip) return 'ZIP archive';
  switch (kind) {
    case 'image':
      return 'Image recompress';
    case 'video':
      return 'Video re-encode (ffmpeg)';
    case 'pdf':
      return 'PDF optimize + ZIP fallback';
    case 'document':
      return 'ZIP archive';
    default:
      return 'ZIP archive';
  }
}

async function zipFiles(files, level = 9) {
  const entries = {};
  await Promise.all(
    files.map(async (file) => {
      const buffer = new Uint8Array(await file.arrayBuffer());
      entries[file.name] = buffer;
    })
  );
  const zipped = zipSync(entries, { level });
  const base =
    files.length === 1
      ? files[0].name.replace(/\.[^.]+$/, '') || 'compressed'
      : 'compressed-files';
  return {
    blob: new Blob([zipped], { type: 'application/zip' }),
    name: `${base}.zip`,
  };
}

async function compressImage(file, quality, maxWidth) {
  const output = await imageCompression(file, {
    maxSizeMB: Math.max(0.05, (file.size / (1024 * 1024)) * quality),
    maxWidthOrHeight: maxWidth,
    useWebWorker: true,
    initialQuality: quality,
    fileType: file.type.includes('png') ? 'image/png' : 'image/jpeg',
  });
  const ext = output.type.includes('png') ? 'png' : 'jpg';
  const name = `${file.name.replace(/\.[^.]+$/, '')}-compressed.${ext}`;
  return { blob: output, name };
}

async function compressPdf(file) {
  const bytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const optimized = await pdf.save({ useObjectStreams: true, addDefaultPage: false });
  const optimizedBlob = new Blob([optimized], { type: 'application/pdf' });

  // Also try ZIP — already-compressed PDFs often shrink more as a zip of the optimized bytes
  const zipped = zipSync(
    { [file.name]: new Uint8Array(optimized) },
    { level: 9 }
  );
  const zipBlob = new Blob([zipped], { type: 'application/zip' });

  if (optimizedBlob.size <= zipBlob.size && optimizedBlob.size < file.size) {
    return {
      blob: optimizedBlob,
      name: `${file.name.replace(/\.[^.]+$/, '')}-compressed.pdf`,
    };
  }
  if (zipBlob.size < file.size) {
    return {
      blob: zipBlob,
      name: `${file.name.replace(/\.[^.]+$/, '')}-compressed.zip`,
    };
  }
  // Return the smaller of the two even if gains are tiny
  if (optimizedBlob.size <= zipBlob.size) {
    return {
      blob: optimizedBlob,
      name: `${file.name.replace(/\.[^.]+$/, '')}-compressed.pdf`,
    };
  }
  return {
    blob: zipBlob,
    name: `${file.name.replace(/\.[^.]+$/, '')}-compressed.zip`,
  };
}

async function compressVideo(file, quality, onStatus, onProgress) {
  // quality 0.3–0.95 → CRF roughly 36–18 (lower CRF = higher quality/larger)
  const crf = Math.round(36 - (quality - 0.3) * ((36 - 18) / 0.65));
  const audioBitrate = quality > 0.7 ? '128k' : quality > 0.45 ? '96k' : '64k';
  const base = file.name.replace(/\.[^.]+$/, '') || 'video';
  const outputName = `${base}-compressed.mp4`;

  const blob = await convertVideoWithFFmpeg({
    file,
    outputName,
    args: [
      '-c:v',
      'libx264',
      '-preset',
      'ultrafast',
      '-crf',
      String(crf),
      '-c:a',
      'aac',
      '-b:a',
      audioBitrate,
      '-movflags',
      '+faststart',
    ],
    onStatus,
    onProgress,
  });

  return { blob, name: outputName };
}

export default function FileCompressor() {
  const [files, setFiles] = useState([]);
  const [quality, setQuality] = useState(0.65);
  const [maxWidth, setMaxWidth] = useState(1920);
  const [forceZip, setForceZip] = useState(false);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const summary = useMemo(() => {
    if (!files.length) return null;
    const total = files.reduce((sum, f) => sum + f.size, 0);
    const kinds = [...new Set(files.map(classifyFile))];
    return { total, kinds, count: files.length };
  }, [files]);

  const onFiles = (list) => {
    const next = [...list];
    setFiles(next);
    setProgress(null);
    if (!next.length) {
      setStatus('');
      return;
    }
    const total = next.reduce((sum, f) => sum + f.size, 0);
    setStatus(`${next.length} file${next.length > 1 ? 's' : ''} · ${formatBytes(total)}`);
  };

  const compress = async () => {
    if (!files.length) {
      setStatus('Choose at least one file.');
      return;
    }

    setBusy(true);
    setProgress(null);
    setStatus('Compressing…');

    try {
      // Multiple files always become one ZIP (after smart-compressing each when possible)
      if (files.length > 1 || forceZip) {
        if (forceZip || files.length > 1) {
          // For multi-file smart mode: compress each first when beneficial, then zip results
          if (!forceZip && files.length > 1) {
            setStatus('Compressing each file, then packing ZIP…');
            const packed = {};
            for (let i = 0; i < files.length; i += 1) {
              const file = files[i];
              const kind = classifyFile(file);
              setStatus(`Compressing ${i + 1}/${files.length}: ${file.name}`);
              let result;
              try {
                result = await compressOne(file, kind, false);
              } catch {
                result = {
                  blob: file,
                  name: file.name,
                };
              }
              packed[result.name] = new Uint8Array(await result.blob.arrayBuffer());
              setProgress(Math.round(((i + 1) / files.length) * 100));
            }
            const zipped = zipSync(packed, { level: 9 });
            const blob = new Blob([zipped], { type: 'application/zip' });
            saveAs(blob, 'compressed-files.zip');
            const original = files.reduce((sum, f) => sum + f.size, 0);
            setStatus(resultMessage(original, blob.size));
            return;
          }

          setStatus('Creating ZIP…');
          const { blob, name } = await zipFiles(files, 9);
          saveAs(blob, name);
          const original = files.reduce((sum, f) => sum + f.size, 0);
          setStatus(resultMessage(original, blob.size));
          setProgress(100);
          return;
        }
      }

      const file = files[0];
      const kind = classifyFile(file);
      setStatus(`Using ${compressionMethodLabel(kind, forceZip)}…`);
      const result = await compressOne(file, kind, forceZip);
      saveAs(result.blob, result.name);
      setStatus(resultMessage(file.size, result.blob.size));
      setProgress(100);
    } catch (err) {
      setStatus(err.message || 'Compression failed.');
    } finally {
      setBusy(false);
    }
  };

  async function compressOne(file, kind, zipOnly) {
    if (zipOnly) {
      return zipFiles([file], 9);
    }
    switch (kind) {
      case 'image':
        return compressImage(file, quality, maxWidth);
      case 'video':
        return compressVideo(file, quality, setStatus, setProgress);
      case 'pdf':
        return compressPdf(file);
      case 'document':
      case 'other':
      default:
        return zipFiles([file], 9);
    }
  }

  const showImageControls =
    !forceZip && files.some((f) => classifyFile(f) === 'image' || classifyFile(f) === 'video');

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
          <p style={{ margin: '0 0 0.75rem', fontWeight: 600 }}>
            Drop files here, or choose any file type
          </p>
          <FilePicker
            multiple
            label="Choose files"
            files={files}
            onChange={(list) => onFiles(list || [])}
            hint="Smart mode: images recompress, videos re-encode with ffmpeg, PDFs optimize, docs and other files pack into a ZIP. Force ZIP for a plain archive of anything."
          />
        </div>

        {summary && (
          <div className="stats">
            <div className="stat">
              <strong>{summary.count}</strong>
              <span>Files</span>
            </div>
            <div className="stat">
              <strong>{formatBytes(summary.total)}</strong>
              <span>Original size</span>
            </div>
            <div className="stat">
              <strong>{summary.kinds.join(', ')}</strong>
              <span>Detected types</span>
            </div>
          </div>
        )}

        {files.length > 0 && (
          <div className="preview-box" style={{ maxHeight: 160, overflow: 'auto' }}>
            {files.map((file) => (
              <div
                key={`${file.name}-${file.size}-${file.lastModified}`}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  padding: '0.35rem 0',
                  borderBottom: '1px solid var(--line)',
                  fontSize: '0.92rem',
                }}
              >
                <span>
                  {file.name}{' '}
                  <span style={{ color: 'var(--muted)' }}>
                    · {classifyFile(file)} · {compressionMethodLabel(classifyFile(file), forceZip)}
                  </span>
                </span>
                <span style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                  {formatBytes(file.size)}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="check-row">
          <label className="check">
            <input
              type="checkbox"
              checked={forceZip}
              onChange={(e) => setForceZip(e.target.checked)}
            />
            Force ZIP (skip smart compression)
          </label>
        </div>

        {showImageControls && (
          <div className="panel-split">
            <div className="field">
              <label htmlFor="fc-quality">
                Quality: {Math.round(quality * 100)}%
              </label>
              <input
                id="fc-quality"
                className="input"
                type="range"
                min="0.3"
                max="0.95"
                step="0.05"
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label htmlFor="fc-width">Image max edge: {maxWidth}px</label>
              <input
                id="fc-width"
                className="input"
                type="range"
                min="640"
                max="4000"
                step="40"
                value={maxWidth}
                onChange={(e) => setMaxWidth(Number(e.target.value))}
                disabled={!files.some((f) => classifyFile(f) === 'image')}
              />
            </div>
          </div>
        )}

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
            onClick={compress}
            disabled={busy || !files.length}
          >
            {busy ? 'Compressing…' : 'Compress & download'}
          </button>
          {files.length > 0 && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => onFiles([])}
              disabled={busy}
            >
              Clear
            </button>
          )}
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

function resultMessage(original, next) {
  const saved = original - next;
  const pct = original ? Math.round((1 - next / original) * 100) : 0;
  if (saved <= 0) {
    return `Done: ${formatBytes(original)} → ${formatBytes(next)}. File was already compact (little or no savings).`;
  }
  return `Done: ${formatBytes(original)} → ${formatBytes(next)} (${pct}% smaller)`;
}
