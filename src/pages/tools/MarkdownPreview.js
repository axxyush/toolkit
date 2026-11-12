import { useMemo, useState } from 'react';
import { marked } from 'marked';
import ToolShell from '../../components/ToolShell';
import { tools } from '../../data/tools';

const tool = tools.find((t) => t.id === 'markdown-preview');

marked.setOptions({ breaks: true });

export default function MarkdownPreview() {
  const [markdown, setMarkdown] = useState(
    '# Hello\n\nWrite **Markdown** on the left.\n\n- Lists work\n- So do `code` snippets\n'
  );

  const html = useMemo(() => marked.parse(markdown || ''), [markdown]);

  return (
    <ToolShell tool={tool}>
      <div className="panel-split">
        <div className="field">
          <label htmlFor="md-input">Markdown</label>
          <textarea
            id="md-input"
            className="textarea"
            style={{ minHeight: 360 }}
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Preview</label>
          <div
            className="preview-box markdown-body"
            style={{ minHeight: 360 }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>
    </ToolShell>
  );
}
