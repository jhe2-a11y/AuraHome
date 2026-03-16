import type { Note, ViewMode } from '../types/note';

interface SidebarProps {
  notes: Note[];
  activeNoteId: string | null;
  viewMode: ViewMode;
  searchQuery: string;
  allTags: string[];
  useServer: boolean;
  onSelectNote: (id: string) => void;
  onCreateNote: () => void;
  onDeleteNote: (id: string) => void;
  onSetViewMode: (mode: ViewMode) => void;
  onSearch: (query: string) => void;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function Sidebar({
  notes,
  activeNoteId,
  viewMode,
  searchQuery,
  allTags,
  useServer,
  onSelectNote,
  onCreateNote,
  onDeleteNote,
  onSetViewMode,
  onSearch,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="brand-icon">✦</span>
        <h1>AuraHome</h1>
        {useServer && <span className="sync-dot" title="Synced to server" />}
      </div>

      <button className="btn-new-note" onClick={onCreateNote}>
        <span>+</span> New Note
      </button>

      <div className="search-box">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          placeholder="Search notes or #tags..."
          value={searchQuery}
          onChange={e => onSearch(e.target.value)}
        />
      </div>

      <div className="view-toggle">
        <button
          className={viewMode === 'editor' ? 'active' : ''}
          onClick={() => onSetViewMode('editor')}
          title="Editor only"
        >
          ✏️
        </button>
        <button
          className={viewMode === 'split' ? 'active' : ''}
          onClick={() => onSetViewMode('split')}
          title="Split view"
        >
          ⬜⬜
        </button>
        <button
          className={viewMode === 'notebook' ? 'active' : ''}
          onClick={() => onSetViewMode('notebook')}
          title="Notebook only"
        >
          📓
        </button>
        <button
          className={viewMode === 'art' ? 'active' : ''}
          onClick={() => onSetViewMode('art')}
          title="Art mode — visualize your notes"
        >
          🎨
        </button>
      </div>

      {allTags.length > 0 && (
        <div className="sidebar-tags">
          {allTags.slice(0, 12).map(tag => (
            <button
              key={tag}
              className={`sidebar-tag ${searchQuery === tag ? 'active' : ''}`}
              onClick={() => onSearch(searchQuery === tag ? '' : tag)}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      <div className="note-list">
        {notes.map(note => (
          <div
            key={note.id}
            className={`note-card ${note.id === activeNoteId ? 'active' : ''}`}
            onClick={() => onSelectNote(note.id)}
          >
            <div className="note-card-header">
              <span className="note-card-emoji">{note.emoji}</span>
              <span className="note-card-title">{note.title}</span>
              <button
                className="note-card-delete"
                onClick={e => {
                  e.stopPropagation();
                  onDeleteNote(note.id);
                }}
                title="Delete note"
              >
                ×
              </button>
            </div>
            <div className="note-card-meta">
              <span>{timeAgo(note.updatedAt)}</span>
              <span>{note.blocks.filter(b => b.type !== 'divider').length} blocks</span>
            </div>
            {note.tags.length > 0 && (
              <div className="note-card-tags">
                {note.tags.slice(0, 3).map(t => (
                  <span key={t} className="mini-tag">#{t}</span>
                ))}
              </div>
            )}
            <div
              className="note-card-accent"
              style={{ background: note.color }}
            />
          </div>
        ))}
      </div>

      {notes.length === 0 && (
        <div className="sidebar-empty">
          <p>No notes yet</p>
          <p className="subtle">Click "New Note" to start</p>
        </div>
      )}
    </aside>
  );
}
