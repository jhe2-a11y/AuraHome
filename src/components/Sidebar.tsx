import type { Note, ViewMode } from '../types/note';
import type { NoteRelation } from '../utils/relatedness';

interface SidebarProps {
  notes: Note[];
  activeNoteId: string | null;
  viewMode: ViewMode;
  searchQuery: string;
  allTags: string[];
  useServer: boolean;
  relatedNotes: NoteRelation[];
  clusteredNotes: Note[][];
  allNotes: Note[];
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

function NoteCard({
  note,
  isActive,
  onSelect,
  onDelete,
}: {
  note: Note;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={`note-card ${isActive ? 'active' : ''}`}
      onClick={onSelect}
    >
      <div className="note-card-header">
        <span className="note-card-emoji">{note.emoji}</span>
        <span className="note-card-title">{note.title}</span>
        <button
          className="note-card-delete"
          onClick={e => { e.stopPropagation(); onDelete(); }}
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
      <div className="note-card-accent" style={{ background: note.color }} />
    </div>
  );
}

export function Sidebar({
  notes,
  activeNoteId,
  viewMode,
  searchQuery,
  allTags,
  useServer,
  relatedNotes,
  clusteredNotes,
  allNotes,
  onSelectNote,
  onCreateNote,
  onDeleteNote,
  onSetViewMode,
  onSearch,
}: SidebarProps) {
  const noteMap = new Map(allNotes.map(n => [n.id, n]));

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
        >✏️</button>
        <button
          className={viewMode === 'split' ? 'active' : ''}
          onClick={() => onSetViewMode('split')}
          title="Split view"
        >⬜⬜</button>
        <button
          className={viewMode === 'notebook' ? 'active' : ''}
          onClick={() => onSetViewMode('notebook')}
          title="Notebook only"
        >📓</button>
        <button
          className={viewMode === 'art' ? 'active' : ''}
          onClick={() => onSetViewMode('art')}
          title="Art mode"
        >🎨</button>
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

      {/* Related Notes Panel */}
      {relatedNotes.length > 0 && activeNoteId && (
        <div className="related-section">
          <div className="section-header">
            <span className="section-icon">🔗</span>
            <span>Related Notes</span>
          </div>
          <div className="related-list">
            {relatedNotes.map(rel => {
              const rNote = noteMap.get(rel.noteId);
              if (!rNote) return null;
              return (
                <div
                  key={rel.noteId}
                  className="related-card"
                  onClick={() => onSelectNote(rel.noteId)}
                >
                  <div className="related-card-top">
                    <span className="related-emoji">{rNote.emoji}</span>
                    <span className="related-title">{rNote.title}</span>
                  </div>
                  <div className="related-reason">{rel.reason}</div>
                  <div className="related-score-bar">
                    <div
                      className="related-score-fill"
                      style={{ width: `${Math.min(100, rel.score * 200)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Notes organized by clusters */}
      <div className="note-list">
        {clusteredNotes.map((cluster, ci) => (
          <div key={ci} className="note-cluster">
            {cluster.length > 1 && (
              <div className="cluster-header">
                <span className="cluster-dot" style={{ background: cluster[0].color }} />
                <span className="cluster-label">{cluster.length} connected</span>
              </div>
            )}
            {cluster.map(note => (
              <NoteCard
                key={note.id}
                note={note}
                isActive={note.id === activeNoteId}
                onSelect={() => onSelectNote(note.id)}
                onDelete={() => onDeleteNote(note.id)}
              />
            ))}
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
