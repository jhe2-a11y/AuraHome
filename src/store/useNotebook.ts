import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Note, ViewMode } from '../types/note';
import { parseNotes, extractTitle, extractAllTags } from '../utils/noteParser';

const NOTE_EMOJIS = ['📓', '📔', '📒', '📕', '📗', '📘', '📙', '🗒️'];
const NOTE_COLORS = ['#6C5CE7', '#00B894', '#E17055', '#0984E3', '#FDCB6E', '#E84393', '#00CEC9'];

const STORAGE_KEY = 'aura-notebook-notes';

function loadNotes(): Note[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveNotes(notes: Note[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

export function useNotebook() {
  const [notes, setNotes] = useState<Note[]>(loadNotes);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [searchQuery, setSearchQuery] = useState('');

  const activeNote = notes.find(n => n.id === activeNoteId) || null;

  const updateNotes = useCallback((updater: (prev: Note[]) => Note[]) => {
    setNotes(prev => {
      const next = updater(prev);
      saveNotes(next);
      return next;
    });
  }, []);

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
    return note;
  }, [updateNotes]);

  const updateNoteText = useCallback((id: string, rawText: string) => {
    updateNotes(prev =>
      prev.map(n =>
        n.id === id
          ? {
              ...n,
              rawText,
              title: extractTitle(rawText),
              blocks: parseNotes(rawText),
              tags: extractAllTags(rawText),
              updatedAt: Date.now(),
            }
          : n
      )
    );
  }, [updateNotes]);

  const deleteNote = useCallback((id: string) => {
    updateNotes(prev => prev.filter(n => n.id !== id));
    if (activeNoteId === id) {
      setActiveNoteId(null);
    }
  }, [activeNoteId, updateNotes]);

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
    setActiveNoteId,
    setViewMode,
    setSearchQuery,
    createNote,
    updateNoteText,
    deleteNote,
    toggleCheckItem,
  };
}
