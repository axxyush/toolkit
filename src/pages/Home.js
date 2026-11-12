import ToolCard from "../components/ToolCard";
import { tools } from "../data/tools";

export default function Home() {
  return (
    <>
      <section id="tools" className="tool-grid" aria-label="Available tools">
        {tools.map((tool) => (
          <ToolCard key={tool.id} tool={tool} />
        ))}
      </section>
    </>
  );
}
