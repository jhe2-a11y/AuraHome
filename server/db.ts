import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'aurahome.db');

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT 'Untitled Note',
    raw_text TEXT NOT NULL DEFAULT '',
    tags TEXT NOT NULL DEFAULT '[]',
    linked_note_ids TEXT NOT NULL DEFAULT '[]',
    color TEXT NOT NULL DEFAULT '#7c5cff',
    emoji TEXT NOT NULL DEFAULT '📓',
    created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
  );

  CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes(updated_at DESC);
`);

export interface NoteRow {
  id: string;
  title: string;
  raw_text: string;
  tags: string;
  linked_note_ids: string;
  color: string;
  emoji: string;
  created_at: number;
  updated_at: number;
}

export const queries = {
  getAll: db.prepare<[], NoteRow>('SELECT * FROM notes ORDER BY updated_at DESC'),

  getById: db.prepare<[string], NoteRow>('SELECT * FROM notes WHERE id = ?'),

  insert: db.prepare<[string, string, string, string, string, string, string, number, number]>(
    `INSERT INTO notes (id, title, raw_text, tags, linked_note_ids, color, emoji, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ),

  update: db.prepare<[string, string, string, string, number, string]>(
    `UPDATE notes SET title = ?, raw_text = ?, tags = ?, linked_note_ids = ?, updated_at = ? WHERE id = ?`
  ),

  delete: db.prepare<[string]>('DELETE FROM notes WHERE id = ?'),
};

export default db;
