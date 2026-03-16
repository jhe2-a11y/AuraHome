import { useState, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Note, ViewMode } from '../types/note';
import { parseNotes, extractTitle, extractAllTags } from '../utils/noteParser';
import { api } from '../utils/api';

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
  const [useServer, setUseServer] = useState(false);
  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Try to connect to backend on mount
  useEffect(() => {
    api.getNotes()
      .then(serverNotes => {
        setUseServer(true);
        const hydrated = serverNotes.map(n => ({
          ...n,
          blocks: parseNotes(n.rawText),
        }));
        if (hydrated.length > 0) {
          setNotes(hydrated);
        } else {
          // Migrate local notes to server
          const localNotes = loadLocalNotes();
          for (const n of localNotes) {
            api.createNote({
              id: n.id,
              title: n.title,
              rawText: n.rawText,
              tags: n.tags,
              linkedNoteIds: n.linkedNoteIds,
              color: n.color,
              emoji: n.emoji,
              createdAt: n.createdAt,
              updatedAt: n.updatedAt,
            }).catch(() => {});
          }
        }
      })
      .catch(() => {
        // Backend not available, use localStorage
        setUseServer(false);
      });
  }, []);

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

    if (useServer) {
      api.createNote({
        id: note.id,
        title: note.title,
        rawText: note.rawText,
        tags: note.tags,
        linkedNoteIds: note.linkedNoteIds,
        color: note.color,
        emoji: note.emoji,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
      }).catch(() => {});
    }

    return note;
  }, [updateNotes, useServer]);

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

    if (useServer) {
      debouncedServerSave(id, { title, rawText, tags });
    }
  }, [updateNotes, useServer, debouncedServerSave]);

  const deleteNote = useCallback((id: string) => {
    updateNotes(prev => prev.filter(n => n.id !== id));
    if (activeNoteId === id) {
      setActiveNoteId(null);
    }
    if (useServer) {
      api.deleteNote(id).catch(() => {});
    }
  }, [activeNoteId, updateNotes, useServer]);

  const toggleCheckItem = useCallback((noteId: string, blockId: string) => {
    updateNotes(prev =>
      prev.map(n => {
        if (n.id !== noteId) return n;
        return {
          ...n,
          blocks: n.blocks.map(b =>
            b.id === blockId ? { ...b, checked: !b.checked } : b
          ),
          updatedAt: Date.now(),
        };
      })
    );
  }, [updateNotes]);

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
    useServer,
    setActiveNoteId,
    setViewMode,
    setSearchQuery,
    createNote,
    updateNoteText,
    deleteNote,
    toggleCheckItem,
  };
}
