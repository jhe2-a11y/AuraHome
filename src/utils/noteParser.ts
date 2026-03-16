import { v4 as uuidv4 } from 'uuid';
import type { NoteBlock } from '../types/note';

const PALETTE = [
  '#6C5CE7', '#00B894', '#E17055', '#0984E3',
  '#FDCB6E', '#E84393', '#00CEC9', '#FF7675',
];

const ICONS: Record<string, string> = {
  important: '⚡',
  question: '❓',
  idea: '💡',
  todo: '☐',
  done: '✓',
  warning: '⚠️',
  star: '⭐',
  note: '📝',
  link: '🔗',
  key: '🔑',
  definition: '📖',
};

function pickColor(index: number): string {
  return PALETTE[index % PALETTE.length];
}

function extractTags(line: string): string[] {
  const tagMatch = line.match(/#(\w+)/g);
  return tagMatch ? tagMatch.map(t => t.slice(1)) : [];
}

function detectIcon(line: string): string | undefined {
  const lower = line.toLowerCase();
  if (lower.includes('important') || lower.startsWith('!!')) return ICONS.important;
  if (lower.includes('?') && lower.length < 80) return ICONS.question;
  if (lower.includes('idea') || lower.includes('💡')) return ICONS.idea;
  if (lower.includes('warning') || lower.includes('careful')) return ICONS.warning;
  if (lower.startsWith('def') || lower.includes('definition')) return ICONS.definition;
  if (lower.includes('remember')) return ICONS.key;
  if (/https?:\/\//.test(lower)) return ICONS.link;
  return undefined;
}

function measureIndent(line: string): number {
  const match = line.match(/^(\s*)/);
  if (!match) return 0;
  const spaces = match[1].replace(/\t/g, '    ').length;
  return Math.floor(spaces / 2);
}

export function parseNotes(rawText: string): NoteBlock[] {
  const lines = rawText.split('\n');
  const blocks: NoteBlock[] = [];
  let colorIndex = 0;
  let lastWasDivider = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Collapse consecutive empty lines into a single divider
    if (!trimmed) {
      if (!lastWasDivider && blocks.length > 0) {
        blocks.push({
          id: uuidv4(),
          type: 'divider',
          content: '',
          indent: 0,
          tags: [],
        });
        lastWasDivider = true;
      }
      continue;
    }
    lastWasDivider = false;

    const indent = measureIndent(line);
    const tags = extractTags(trimmed);
    const icon = detectIcon(trimmed);

    // Heading: lines starting with #
    if (trimmed.startsWith('#')) {
      const content = trimmed.replace(/^#+\s*/, '');
      blocks.push({
        id: uuidv4(),
        type: 'heading',
        content,
        indent: 0,
        tags,
        color: pickColor(colorIndex++),
        icon: icon || '📌',
      });
      continue;
    }

    // Heading: ALL CAPS lines (require 3+ chars and at least 2 alpha chars)
    if (
      trimmed === trimmed.toUpperCase() &&
      trimmed.length >= 3 &&
      trimmed.length < 60 &&
      (trimmed.match(/[A-Z]/g) || []).length >= 2
    ) {
      blocks.push({
        id: uuidv4(),
        type: 'heading',
        content: trimmed.charAt(0) + trimmed.slice(1).toLowerCase(),
        indent: 0,
        tags,
        color: pickColor(colorIndex++),
        icon: icon || '📌',
      });
      continue;
    }

    // Checklist: [ ], [x], TODO:, DONE:
    if (/^(-\s*)?\[[ x]\]/i.test(trimmed) || /^(TODO|DONE):/i.test(trimmed)) {
      const checked = /\[x\]/i.test(trimmed) || /^DONE:/i.test(trimmed);
      const content = trimmed
        .replace(/^(-\s*)?\[[ x]\]\s*/i, '')
        .replace(/^(TODO|DONE):\s*/i, '');
      blocks.push({
        id: uuidv4(),
        type: 'checklist',
        content,
        indent,
        tags,
        icon: checked ? ICONS.done : ICONS.todo,
        checked,
      });
      continue;
    }

    // Quote: lines starting with >
    if (trimmed.startsWith('>')) {
      const content = trimmed.replace(/^>\s*/, '');
      blocks.push({
        id: uuidv4(),
        type: 'quote',
        content,
        indent,
        tags,
        icon: '💬',
        color: '#636e72',
      });
      continue;
    }

    // Quote: wrapped in double quotes
    if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length > 2) {
      const content = trimmed.slice(1, -1);
      blocks.push({
        id: uuidv4(),
        type: 'quote',
        content,
        indent,
        tags,
        icon: '💬',
        color: '#636e72',
      });
      continue;
    }

    // Highlight: !! prefix or **wrapped**
    if (trimmed.startsWith('!!') || (trimmed.startsWith('**') && trimmed.endsWith('**') && trimmed.length > 4)) {
      const content = trimmed.replace(/^\*\*|\*\*$/g, '').replace(/^!!\s*/, '');
      blocks.push({
        id: uuidv4(),
        type: 'highlight',
        content,
        indent,
        tags,
        color: pickColor(colorIndex++),
        icon: icon || ICONS.important,
      });
      continue;
    }

    // Definition: "term: definition" or "term - definition"
    // Term must be 1-4 words (no more than 35 chars), followed by separator
    const defMatch = trimmed.match(/^([A-Za-z][A-Za-z0-9 ]{0,34}?)\s*(?::\s+|-\s+|=\s+)(.+)/);
    if (defMatch) {
      const term = defMatch[1].trim();
      const termWords = term.split(/\s+/).length;
      if (termWords <= 4 && defMatch[2].length > 0) {
        blocks.push({
          id: uuidv4(),
          type: 'definition',
          content: trimmed,
          indent,
          tags,
          icon: icon || ICONS.definition,
          color: pickColor(colorIndex++),
        });
        continue;
      }
    }

    // Default: bullet
    const content = trimmed.replace(/^[-*•]\s*/, '');
    blocks.push({
      id: uuidv4(),
      type: 'bullet',
      content,
      indent,
      tags,
      icon,
      color: pickColor(colorIndex++),
    });
  }

  return blocks;
}

export function extractTitle(rawText: string): string {
  const firstLine = rawText.split('\n').find(l => l.trim().length > 0);
  if (!firstLine) return 'Untitled Note';
  const clean = firstLine.trim().replace(/^#+\s*/, '').replace(/^[-*•]\s*/, '');
  return clean.length > 50 ? clean.slice(0, 50) + '…' : clean;
}

export function extractAllTags(rawText: string): string[] {
  const matches = rawText.match(/#(\w+)/g);
  if (!matches) return [];
  return [...new Set(matches.map(t => t.slice(1)))];
}
