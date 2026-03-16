const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export interface NotePayload {
  id: string;
  title: string;
  rawText: string;
  tags: string[];
  linkedNoteIds: string[];
  color: string;
  emoji: string;
  createdAt: number;
  updatedAt: number;
}

export const api = {
  getNotes: () => request<NotePayload[]>('/notes'),
  getNote: (id: string) => request<NotePayload>(`/notes/${id}`),
  createNote: (note: NotePayload) =>
    request<{ id: string }>('/notes', {
      method: 'POST',
      body: JSON.stringify(note),
    }),
  updateNote: (id: string, data: Partial<NotePayload>) =>
    request<{ id: string; updatedAt: number }>(`/notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteNote: (id: string) =>
    request<{ deleted: boolean }>(`/notes/${id}`, { method: 'DELETE' }),
};
