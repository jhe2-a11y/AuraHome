import express from 'express';
import cors from 'cors';
import path from 'path';
import { queries, rowToNote } from './db.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve static frontend
app.use(express.static(path.join(process.cwd(), 'dist')));

// ─── API Routes ───────────────────────────────────────

// GET all notes
app.get('/api/notes', (_req, res) => {
  try {
    const rows = queries.getAll.all();
    res.json(rows.map(rowToNote));
  } catch (err) {
    console.error('GET /api/notes error:', err);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// GET single note
app.get('/api/notes/:id', (req, res) => {
  try {
    const row = queries.getById.get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Note not found' });
    res.json(rowToNote(row));
  } catch (err) {
    console.error('GET /api/notes/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch note' });
  }
});

// POST create note
app.post('/api/notes', (req, res) => {
  try {
    const { id, title, rawText, tags, linkedNoteIds, color, emoji, createdAt, updatedAt } = req.body;
    if (!id) return res.status(400).json({ error: 'Note ID is required' });
    queries.insert.run(
      id,
      title || 'Untitled Note',
      rawText || '',
      JSON.stringify(tags || []),
      JSON.stringify(linkedNoteIds || []),
      color || '#7c5cff',
      emoji || '📓',
      createdAt || Date.now(),
      updatedAt || Date.now()
    );
    res.status(201).json({ id });
  } catch (err) {
    console.error('POST /api/notes error:', err);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// PUT update note
app.put('/api/notes/:id', (req, res) => {
  try {
    const existing = queries.getById.get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Note not found' });

    const { title, rawText, tags, linkedNoteIds } = req.body;
    const now = Date.now();
    queries.update.run(
      title ?? existing.title,
      rawText ?? existing.raw_text,
      tags ? JSON.stringify(tags) : existing.tags,
      linkedNoteIds ? JSON.stringify(linkedNoteIds) : existing.linked_note_ids,
      now,
      req.params.id
    );
    res.json({ id: req.params.id, updatedAt: now });
  } catch (err) {
    console.error('PUT /api/notes/:id error:', err);
    res.status(500).json({ error: 'Failed to update note' });
  }
});

// DELETE note
app.delete('/api/notes/:id', (req, res) => {
  try {
    const existing = queries.exists.get(req.params.id);
    if (!existing || existing.count === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }
    queries.delete.run(req.params.id);
    res.json({ deleted: true });
  } catch (err) {
    console.error('DELETE /api/notes/:id error:', err);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

// SPA fallback — must come after API routes
app.use((_req, res) => {
  res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n  ✦ AuraHome server running at http://localhost:${PORT}\n`);
});
