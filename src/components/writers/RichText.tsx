import { ReactNode } from "react";

/**
 * Renders the guide's plain-text format: blank line = paragraph,
 * "## " = heading, "- " = bullet. No HTML is ever injected.
 */
const RichText = ({ text }: { text: string }) => {
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];

  const flush = () => {
    if (!bullets.length) return;
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="flex flex-col gap-2 pl-1">
        {bullets.map((b, i) => (
          <li key={i} className="flex gap-3">
            <span aria-hidden className="text-primary-500">♪</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>,
    );
    bullets = [];
  };

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (line.startsWith("- ")) {
      bullets.push(line.slice(2));
      continue;
    }
    flush();
    if (!line) continue;
    if (line.startsWith("## "))
      blocks.push(
        <h3 key={blocks.length} className="h3-bold mt-4">
          {line.slice(3)}
        </h3>,
      );
    else
      blocks.push(
        <p key={blocks.length} className="leading-relaxed">
          {line}
        </p>,
      );
  }
  flush();

  return <div className="flex flex-col gap-4 base-regular text-light-2">{blocks}</div>;
};

export default RichText;
