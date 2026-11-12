import { useMemo, useState } from 'react';
import ToolShell from '../../components/ToolShell';
import { tools } from '../../data/tools';

const tool = tools.find((t) => t.id === 'word-counter');

export default function WordCounter() {
  const [text, setText] = useState('');

  const stats = useMemo(() => {
    const trimmed = text.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const chars = text.length;
    const charsNoSpaces = text.replace(/\s/g, '').length;
    const sentences = trimmed ? (trimmed.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || []).length : 0;
    const paragraphs = trimmed ? trimmed.split(/\n\s*\n/).filter(Boolean).length : 0;
    const readingMinutes = Math.max(1, Math.ceil(words / 200));
    return { words, chars, charsNoSpaces, sentences, paragraphs, readingMinutes };
  }, [text]);

  return (
    <ToolShell tool={tool}>
      <div className="stack">
        <div className="stats">
          <div className="stat">
            <strong>{stats.words}</strong>
            <span>Words</span>
          </div>
          <div className="stat">
            <strong>{stats.chars}</strong>
            <span>Characters</span>
          </div>
          <div className="stat">
            <strong>{stats.charsNoSpaces}</strong>
            <span>No spaces</span>
          </div>
          <div className="stat">
            <strong>{stats.sentences}</strong>
            <span>Sentences</span>
          </div>
          <div className="stat">
            <strong>{stats.paragraphs}</strong>
            <span>Paragraphs</span>
          </div>
          <div className="stat">
            <strong>{text.trim() ? `~${stats.readingMinutes}m` : '0m'}</strong>
            <span>Reading time</span>
          </div>
        </div>

        <div className="field">
          <label htmlFor="wc-text">Your text</label>
          <textarea
            id="wc-text"
            className="textarea"
            style={{ minHeight: 280 }}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste or type here…"
          />
        </div>
      </div>
    </ToolShell>
  );
}
