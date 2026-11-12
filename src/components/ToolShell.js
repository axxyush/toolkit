import { Link } from 'react-router-dom';

export default function ToolShell({ tool, children }) {
  return (
    <div className="tool-shell">
      <div className="tool-nav">
        <Link to="/" className="back-link">
          ← All tools
        </Link>
      </div>
      <section className="tool-panel">
        <header className="tool-header">
          <div className="eyebrow">{tool.category}</div>
          <h1>{tool.name}</h1>
          <p>{tool.description}</p>
        </header>
        {children}
      </section>
    </div>
  );
}
