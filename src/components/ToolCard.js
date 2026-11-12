import { Link } from 'react-router-dom';

export default function ToolCard({ tool }) {
  return (
    <Link
      to={tool.path}
      className="tool-card"
      style={{ '--tool-accent': tool.accent }}
    >
      <div className="tool-card-top">
        <span className="tool-category">{tool.category}</span>
        <span className="tool-arrow" aria-hidden="true">
          →
        </span>
      </div>
      <h2>{tool.name}</h2>
      <p>{tool.description}</p>
    </Link>
  );
}
