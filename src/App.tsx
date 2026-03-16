import { Sidebar } from './components/Sidebar';
import { NoteEditor } from './components/NoteEditor';
import { NotebookView } from './components/NotebookView';
import { useNotebook } from './store/useNotebook';
import './App.css';

function App() {
  const {
    notes,
    activeNote,
    activeNoteId,
    viewMode,
    searchQuery,
    allTags,
    setActiveNoteId,
    setViewMode,
    setSearchQuery,
    createNote,
    updateNoteText,
    deleteNote,
    toggleCheckItem,
  } = useNotebook();

  return (
    <div className="app">
      <Sidebar
        notes={notes}
        activeNoteId={activeNoteId}
        viewMode={viewMode}
        searchQuery={searchQuery}
        allTags={allTags}
        onSelectNote={setActiveNoteId}
        onCreateNote={createNote}
        onDeleteNote={deleteNote}
        onSetViewMode={setViewMode}
        onSearch={setSearchQuery}
      />

      <main className={`main-content view-${viewMode}`}>
        {!activeNote ? (
          <div className="welcome">
            <div className="welcome-art">
              <div className="welcome-orb orb-1" />
              <div className="welcome-orb orb-2" />
              <div className="welcome-orb orb-3" />
              <span className="welcome-icon">✦</span>
            </div>
            <h2>Welcome to AuraHome</h2>
            <p>Your notes, beautifully connected.</p>
            <button className="btn-start" onClick={createNote}>
              Start a new note
            </button>
          </div>
        ) : (
          <div className="workspace">
            {(viewMode === 'editor' || viewMode === 'split') && (
              <div className="pane editor-pane">
                <NoteEditor
                  rawText={activeNote.rawText}
                  onChange={text => updateNoteText(activeNote.id, text)}
                />
              </div>
            )}
            {(viewMode === 'notebook' || viewMode === 'split') && (
              <div className="pane notebook-pane">
                <NotebookView
                  note={activeNote}
                  onToggleCheck={blockId => toggleCheckItem(activeNote.id, blockId)}
                />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
