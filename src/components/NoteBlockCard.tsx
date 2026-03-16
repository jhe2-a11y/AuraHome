import type { NoteBlock } from '../types/note';

interface NoteBlockCardProps {
  block: NoteBlock;
  index: number;
  onToggleCheck: () => void;
}

export function NoteBlockCard({ block, index, onToggleCheck }: NoteBlockCardProps) {
  const delay = `${Math.min(index * 0.04, 0.6)}s`;

  if (block.type === 'divider') {
    return <div className="block-divider" style={{ animationDelay: delay }} />;
  }

  if (block.type === 'heading') {
    return (
      <div
        className="block block-heading"
        style={{ animationDelay: delay, '--accent': block.color } as React.CSSProperties}
      >
        <span className="block-icon">{block.icon}</span>
        <h2>{block.content}</h2>
        <div className="heading-underline" style={{ background: block.color }} />
      </div>
    );
  }

  if (block.type === 'checklist') {
    return (
      <div
        className={`block block-checklist ${block.checked ? 'checked' : ''}`}
        style={{ animationDelay: delay, marginLeft: `${block.indent * 20}px` }}
        onClick={onToggleCheck}
      >
        <span className="check-box">{block.checked ? '✓' : ''}</span>
        <span className="check-label">{block.content}</span>
      </div>
    );
  }

  if (block.type === 'quote') {
    return (
      <div
        className="block block-quote"
        style={{ animationDelay: delay, marginLeft: `${block.indent * 20}px` }}
      >
        <div className="quote-bar" />
        <div className="quote-content">
          <span className="block-icon">{block.icon}</span>
          <p>{block.content}</p>
        </div>
      </div>
    );
  }

  if (block.type === 'highlight') {
    return (
      <div
        className="block block-highlight"
        style={{
          animationDelay: delay,
          '--accent': block.color,
          marginLeft: `${block.indent * 20}px`,
        } as React.CSSProperties}
      >
        <span className="block-icon">{block.icon}</span>
        <p>{block.content}</p>
        <div className="highlight-glow" style={{ background: block.color }} />
      </div>
    );
  }

  if (block.type === 'definition') {
    const separator = block.content.includes(' - ')
      ? ' - '
      : block.content.includes(': ')
        ? ': '
        : ' = ';
    const [term, ...rest] = block.content.split(separator);
    const definition = rest.join(separator);

    return (
      <div
        className="block block-definition"
        style={{
          animationDelay: delay,
          '--accent': block.color,
          marginLeft: `${block.indent * 20}px`,
        } as React.CSSProperties}
      >
        <span className="block-icon">{block.icon}</span>
        <div className="def-content">
          <span className="def-term">{term}</span>
          <span className="def-separator">→</span>
          <span className="def-meaning">{definition}</span>
        </div>
      </div>
    );
  }

  // Default: bullet
  return (
    <div
      className="block block-bullet"
      style={{
        animationDelay: delay,
        '--accent': block.color,
        marginLeft: `${block.indent * 20}px`,
      } as React.CSSProperties}
    >
      <span className="bullet-dot" style={{ background: block.color }} />
      {block.icon && <span className="block-icon">{block.icon}</span>}
      <p>{block.content}</p>
    </div>
  );
}
