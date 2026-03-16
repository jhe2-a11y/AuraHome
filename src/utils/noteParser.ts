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
  if (lower.includes('important') || lower.includes('!!' )) return ICONS.important;
  if (lower.includes('?') && lower.length < 120) return ICONS.question;
  if (lower.includes('idea') || lower.includes('💡')) return ICONS.idea;
  if (lower.includes('warn') || lower.includes('careful')) return ICONS.warning;
  if (lower.includes('define') || lower.includes('definition') || lower.includes(' means ') || lower.includes(' is ')) return ICONS.definition;
  if (lower.includes('key') || lower.includes('remember')) return ICONS.key;
  if (lower.includes('link') || lower.includes('http')) return ICONS.link;
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

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      // Empty line becomes a subtle divider
      blocks.push({
        id: uuidv4(),
        type: 'divider',
        content: '',
        indent: 0,
        tags: [],
      });
      continue;
    }

    const indent = measureIndent(line);
    const tags = extractTags(trimmed);
    const icon = detectIcon(trimmed);

    // Heading detection: lines starting with # or ALL CAPS short lines
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

    if (trimmed === trimmed.toUpperCase() && trimmed.length < 60 && trimmed.length > 1 && /[A-Z]/.test(trimmed)) {
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

    // Checklist detection: lines starting with [ ], [x], - [ ], - [x], TODO, DONE
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

    // Quote detection: lines starting with > or "
    if (trimmed.startsWith('>') || (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
      const content = trimmed.replace(/^>\s*/, '').replace(/^"|"$/g, '');
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

    // Highlight detection: lines wrapped in ** or !! prefix
    if ((trimmed.startsWith('**') && trimmed.endsWith('**')) || trimmed.startsWith('!!')) {
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

    // Definition detection: lines with " - ", " : ", " = " pattern
    if (/^.{1,40}\s*[-:=]\s+.+/.test(trimmed) && (trimmed.includes(' - ') || trimmed.includes(': ') || trimmed.includes(' = '))) {
      const separator = trimmed.includes(' - ') ? ' - ' : trimmed.includes(': ') ? ': ' : ' = ';
      const parts = trimmed.split(separator);
      if (parts.length >= 2 && parts[0].length < 40) {
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

    // Default: bullet point
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
