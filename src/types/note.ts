export interface NoteBlock {
  id: string;
  type: 'bullet' | 'heading' | 'highlight' | 'definition' | 'checklist' | 'quote' | 'divider';
  content: string;
  indent: number;
  tags: string[];
  color?: string;
  icon?: string;
  checked?: boolean;
}

export interface Note {
  id: string;
  title: string;
  rawText: string;
  blocks: NoteBlock[];
  tags: string[];
  linkedNoteIds: string[];
  createdAt: number;
  updatedAt: number;
  color: string;
  emoji: string;
}

export type ViewMode = 'editor' | 'notebook' | 'split' | 'art';
