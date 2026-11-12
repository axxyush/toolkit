import { useMemo, useState } from 'react';
import { diffLines, diffWords } from 'diff';
import ToolShell from '../../components/ToolShell';
import { tools } from '../../data/tools';

const tool = tools.find((t) => t.id === 'diff-checker');

export default function DiffChecker() {
  const [left, setLeft] = useState('Hello world\nThis is the original text.');
  const [right, setRight] = useState('Hello world\nThis is the changed text.');
  const [mode, setMode] = useState('lines');

  const parts = useMemo(() => {
    if (mode === 'words') return diffWords(left, right);
    return diffLines(left, right);
  }, [left, right, mode]);

  const stats = useMemo(() => {
    let added = 0;
    let removed = 0;
    parts.forEach((part) => {
      const count =
        mode === 'words'
          ? part.value.trim()
            ? part.value.trim().split(/\s+/).length
            : 0
          : part.count || part.value.split('\n').filter(Boolean).length;
      if (part.added) added += count;
      if (part.removed) removed += count;
    });
    return { added, removed };
  }, [parts, mode]);

  return (
    <ToolShell tool={tool}>
      <div className="stack">
        <div className="chip-row">
          <button
            type="button"
            className={`chip ${mode === 'lines' ? 'active' : ''}`}
            onClick={() => setMode('lines')}
          >
            Line diff
          </button>
          <button
            type="button"
            className={`chip ${mode === 'words' ? 'active' : ''}`}
            onClick={() => setMode('words')}
          >
            Word diff
          </button>
        </div>

        <div className="panel-split">
          <div className="field">
            <label htmlFor="diff-left">Original</label>
            <textarea
              id="diff-left"
              className="textarea"
              style={{ minHeight: 220 }}
              value={left}
              onChange={(e) => setLeft(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="diff-right">Changed</label>
            <textarea
              id="diff-right"
              className="textarea"
              style={{ minHeight: 220 }}
              value={right}
              onChange={(e) => setRight(e.target.value)}
            />
          </div>
        </div>

        <div className="stats">
          <div className="stat">
            <strong style={{ color: 'var(--ok)' }}>+{stats.added}</strong>
            <span>Added</span>
          </div>
          <div className="stat">
            <strong style={{ color: 'var(--danger)' }}>−{stats.removed}</strong>
            <span>Removed</span>
          </div>
        </div>

        <div className="field">
          <label>Diff</label>
          <div className="diff-output" aria-live="polite">
            {parts.map((part, index) => {
              const className = part.added
                ? 'diff-added'
                : part.removed
                  ? 'diff-removed'
                  : 'diff-same';
              return (
                <span key={`${index}-${className}-${part.value.slice(0, 12)}`} className={className}>
                  {part.value}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </ToolShell>
  );
}
