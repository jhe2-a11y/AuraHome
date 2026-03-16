import type { Note } from '../types/note';
import { NoteBlockCard } from './NoteBlockCard';

interface NotebookViewProps {
  note: Note;
  onToggleCheck: (blockId: string) => void;
}

export function NotebookView({ note, onToggleCheck }: NotebookViewProps) {
  const nonDividerBlocks = note.blocks.filter(b => b.type !== 'divider');

  if (nonDividerBlocks.length === 0) {
    return (
      <div className="notebook-view">
        <div className="notebook-empty">
          <div className="empty-illustration">📓</div>
          <p>Start typing on the left — your notes will transform here in real time!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="notebook-view">
      <div className="notebook-header">
        <span className="notebook-emoji">{note.emoji}</span>
        <h1 className="notebook-title">{note.title}</h1>
        {note.tags.length > 0 && (
          <div className="notebook-tags">
            {note.tags.map(tag => (
              <span key={tag} className="tag-pill">#{tag}</span>
            ))}
          </div>
        )}
      </div>
      <div className="notebook-blocks">
        {note.blocks.map((block, index) => (
          <NoteBlockCard
            key={block.id}
            block={block}
            index={index}
            onToggleCheck={() => onToggleCheck(block.id)}
          />
        ))}
      </div>
    </div>
  );
}
