import { useState, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Note, ViewMode } from '../types/note';
import { parseNotes, extractTitle, extractAllTags } from '../utils/noteParser';
import { api } from '../utils/api';
import { computeRelations, clusterNotes } from '../utils/relatedness';
import type { NoteRelation } from '../utils/relatedness';

const NOTE_EMOJIS = ['📓', '📔', '📒', '📕', '📗', '📘', '📙', '🗒️'];
const NOTE_COLORS = ['#6C5CE7', '#00B894', '#E17055', '#0984E3', '#FDCB6E', '#E84393', '#00CEC9'];

const STORAGE_KEY = 'aura-notebook-notes';

function loadLocalNotes(): Note[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveLocalNotes(notes: Note[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

export function useNotebook() {
  const [notes, setNotes] = useState<Note[]>(loadLocalNotes);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [searchQuery, setSearchQuery] = useState('');
  const serverRef = useRef(false);
  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Try to connect to backend on mount
  useEffect(() => {
    let cancelled = false;
    api.getNotes()
      .then(serverNotes => {
        if (cancelled) return;
        serverRef.current = true;
        const hydrated = serverNotes.map(n => ({
          ...n,
          blocks: parseNotes(n.rawText),
        }));
        const localNotes = loadLocalNotes();

        if (hydrated.length > 0) {
          // Merge: server notes win, but add any local-only notes to server
          const serverIds = new Set(hydrated.map(n => n.id));
          const localOnly = localNotes.filter(n => !serverIds.has(n.id));

          for (const n of localOnly) {
            api.createNote({
              id: n.id, title: n.title, rawText: n.rawText,
              tags: n.tags, linkedNoteIds: n.linkedNoteIds,
              color: n.color, emoji: n.emoji,
              createdAt: n.createdAt, updatedAt: n.updatedAt,
            }).catch(() => {});
          }

          const merged = [
            ...hydrated,
            ...localOnly.map(n => ({ ...n, blocks: parseNotes(n.rawText) })),
          ].sort((a, b) => b.updatedAt - a.updatedAt);

          setNotes(merged);
          saveLocalNotes(merged);
        } else if (localNotes.length > 0) {
          // Migrate all local notes to server
          for (const n of localNotes) {
            api.createNote({
              id: n.id, title: n.title, rawText: n.rawText,
              tags: n.tags, linkedNoteIds: n.linkedNoteIds,
              color: n.color, emoji: n.emoji,
              createdAt: n.createdAt, updatedAt: n.updatedAt,
            }).catch(() => {});
          }
        }
      })
      .catch(() => {
        serverRef.current = false;
      });

    return () => { cancelled = true; };
  }, []);

  // Flush pending saves on unload
  useEffect(() => {
    const flush = () => {
      for (const [id, timer] of saveTimers.current) {
        clearTimeout(timer);
        saveTimers.current.delete(id);
        // Use sendBeacon for reliability on page close
        const note = notes.find(n => n.id === id);
        if (note && serverRef.current) {
          navigator.sendBeacon('/api/notes/' + id, new Blob(
            [JSON.stringify({ title: note.title, rawText: note.rawText, tags: note.tags })],
            { type: 'application/json' }
          ));
        }
      }
    };
    window.addEventListener('beforeunload', flush);
    return () => window.removeEventListener('beforeunload', flush);
  }, [notes]);

  const activeNote = notes.find(n => n.id === activeNoteId) || null;

  const persist = useCallback((updatedNotes: Note[]) => {
    saveLocalNotes(updatedNotes);
  }, []);

  const debouncedServerSave = useCallback((id: string, data: Partial<Note>) => {
    const existing = saveTimers.current.get(id);
    if (existing) clearTimeout(existing);
    saveTimers.current.set(id, setTimeout(() => {
      api.updateNote(id, {
        title: data.title,
        rawText: data.rawText,
        tags: data.tags,
        linkedNoteIds: data.linkedNoteIds,
      }).catch(() => {});
      saveTimers.current.delete(id);
    }, 500));
  }, []);

  const cancelPendingSave = useCallback((id: string) => {
    const timer = saveTimers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      saveTimers.current.delete(id);
    }
  }, []);

  const updateNotes = useCallback((updater: (prev: Note[]) => Note[]) => {
    setNotes(prev => {
      const next = updater(prev);
      persist(next);
      return next;
    });
  }, [persist]);

  const createNote = useCallback(() => {
    const note: Note = {
      id: uuidv4(),
      title: 'Untitled Note',
      rawText: '',
      blocks: [],
      tags: [],
      linkedNoteIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      color: NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)],
      emoji: NOTE_EMOJIS[Math.floor(Math.random() * NOTE_EMOJIS.length)],
    };
    updateNotes(prev => [note, ...prev]);
    setActiveNoteId(note.id);

    if (serverRef.current) {
      api.createNote({
        id: note.id, title: note.title, rawText: note.rawText,
        tags: note.tags, linkedNoteIds: note.linkedNoteIds,
        color: note.color, emoji: note.emoji,
        createdAt: note.createdAt, updatedAt: note.updatedAt,
      }).catch(() => {});
    }

    return note;
  }, [updateNotes]);

  const updateNoteText = useCallback((id: string, rawText: string) => {
    const title = extractTitle(rawText);
    const tags = extractAllTags(rawText);
    const blocks = parseNotes(rawText);

    updateNotes(prev =>
      prev.map(n =>
        n.id === id
          ? { ...n, rawText, title, blocks, tags, updatedAt: Date.now() }
          : n
      )
    );

    if (serverRef.current) {
      debouncedServerSave(id, { title, rawText, tags });
    }
  }, [updateNotes, debouncedServerSave]);

  const deleteNote = useCallback((id: string) => {
    cancelPendingSave(id);
    updateNotes(prev => prev.filter(n => n.id !== id));
    if (activeNoteId === id) {
      setActiveNoteId(null);
    }
    if (serverRef.current) {
      api.deleteNote(id).catch(() => {});
    }
  }, [activeNoteId, updateNotes, cancelPendingSave]);

  const toggleCheckItem = useCallback((noteId: string, blockId: string) => {
    updateNotes(prev =>
      prev.map(n => {
        if (n.id !== noteId) return n;
        const updated = {
          ...n,
          blocks: n.blocks.map(b =>
            b.id === blockId ? { ...b, checked: !b.checked } : b
          ),
          updatedAt: Date.now(),
        };
        // Sync to server
        if (serverRef.current) {
          debouncedServerSave(noteId, {
            title: updated.title,
            rawText: updated.rawText,
            tags: updated.tags,
          });
        }
        return updated;
      })
    );
  }, [updateNotes, debouncedServerSave]);

  // Computed: related notes for active note
  const relatedNotes: NoteRelation[] = activeNote && notes.length > 1
    ? computeRelations(activeNote, notes).slice(0, 5)
    : [];

  // Computed: clustered notes for sidebar organization
  const clusteredNotes = clusterNotes(
    searchQuery
      ? notes.filter(n =>
          n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          n.rawText.toLowerCase().includes(searchQuery.toLowerCase()) ||
          n.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
        )
      : notes
  );

  const filteredNotes = searchQuery
    ? notes.filter(n =>
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.rawText.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : notes;

  const allTags = [...new Set(notes.flatMap(n => n.tags))];

  return {
    notes: filteredNotes,
    allNotes: notes,
    activeNote,
    activeNoteId,
    viewMode,
    searchQuery,
    allTags,
    useServer: serverRef.current,
    relatedNotes,
    clusteredNotes,
    setActiveNoteId,
    setViewMode,
    setSearchQuery,
    createNote,
    updateNoteText,
    deleteNote,
    toggleCheckItem,
  };
}
