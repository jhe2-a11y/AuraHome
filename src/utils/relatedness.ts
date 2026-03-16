import type { Note } from '../types/note';

// Stop words for TF-IDF
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'to', 'of', 'in', 'for',
  'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'and',
  'but', 'or', 'nor', 'not', 'so', 'yet', 'it', 'its', 'this', 'that',
  'these', 'those', 'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he',
  'she', 'they', 'them', 'his', 'her', 'their', 'what', 'which', 'who',
  'when', 'where', 'how', 'all', 'each', 'every', 'both', 'few', 'more',
  'most', 'other', 'some', 'such', 'no', 'only', 'own', 'same', 'than',
  'too', 'very', 'just', 'because', 'about', 'also', 'then', 'here',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

function termFrequency(tokens: string[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const t of tokens) {
    freq.set(t, (freq.get(t) || 0) + 1);
  }
  // Normalize by document length
  const len = tokens.length || 1;
  for (const [k, v] of freq) {
    freq.set(k, v / len);
  }
  return freq;
}

function inverseDocumentFrequency(docs: string[][]): Map<string, number> {
  const docCount = docs.length || 1;
  const df = new Map<string, number>();
  for (const tokens of docs) {
    const unique = new Set(tokens);
    for (const t of unique) {
      df.set(t, (df.get(t) || 0) + 1);
    }
  }
  const idf = new Map<string, number>();
  for (const [term, count] of df) {
    idf.set(term, Math.log(docCount / count));
  }
  return idf;
}

function tfidfVector(tf: Map<string, number>, idf: Map<string, number>): Map<string, number> {
  const vec = new Map<string, number>();
  for (const [term, freq] of tf) {
    vec.set(term, freq * (idf.get(term) || 0));
  }
  return vec;
}

function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (const [term, val] of a) {
    magA += val * val;
    const bVal = b.get(term);
    if (bVal !== undefined) {
      dot += val * bVal;
    }
  }
  for (const [, val] of b) {
    magB += val * val;
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

function tagOverlap(tagsA: string[], tagsB: string[]): number {
  if (tagsA.length === 0 && tagsB.length === 0) return 0;
  const setA = new Set(tagsA);
  const setB = new Set(tagsB);
  let intersection = 0;
  for (const t of setA) {
    if (setB.has(t)) intersection++;
  }
  const union = new Set([...tagsA, ...tagsB]).size;
  return union === 0 ? 0 : intersection / union; // Jaccard coefficient
}

export interface NoteRelation {
  noteId: string;
  score: number;
  sharedTags: string[];
  reason: string;
}

/**
 * Compute relatedness scores between a target note and all other notes.
 * Uses a weighted combination of:
 * - TF-IDF cosine similarity (content overlap) — 50%
 * - Tag Jaccard overlap — 35%
 * - Temporal proximity bonus — 15%
 */
export function computeRelations(targetNote: Note, allNotes: Note[]): NoteRelation[] {
  const others = allNotes.filter(n => n.id !== targetNote.id);
  if (others.length === 0) return [];

  // Tokenize all documents
  const allDocs = allNotes.map(n => tokenize(n.rawText));
  const targetTokens = tokenize(targetNote.rawText);

  // Compute IDF across all documents
  const idf = inverseDocumentFrequency(allDocs);

  // Compute TF-IDF vector for target
  const targetTF = termFrequency(targetTokens);
  const targetVec = tfidfVector(targetTF, idf);

  const DAY_MS = 86400000;

  const relations: NoteRelation[] = others.map(other => {
    // Content similarity via TF-IDF cosine
    const otherTokens = tokenize(other.rawText);
    const otherTF = termFrequency(otherTokens);
    const otherVec = tfidfVector(otherTF, idf);
    const contentScore = cosineSimilarity(targetVec, otherVec);

    // Tag overlap via Jaccard
    const tagScore = tagOverlap(targetNote.tags, other.tags);
    const sharedTags = targetNote.tags.filter(t => other.tags.includes(t));

    // Temporal proximity: notes edited around the same time are likely related
    const timeDiff = Math.abs(targetNote.updatedAt - other.updatedAt);
    const temporalScore = Math.max(0, 1 - timeDiff / (7 * DAY_MS)); // Decays over a week

    // Weighted combination
    const score = contentScore * 0.50 + tagScore * 0.35 + temporalScore * 0.15;

    // Determine primary reason
    let reason = '';
    if (tagScore > 0.3 && tagScore >= contentScore) {
      reason = `Shares tags: ${sharedTags.map(t => '#' + t).join(', ')}`;
    } else if (contentScore > 0.1) {
      reason = 'Similar content';
    } else if (temporalScore > 0.5) {
      reason = 'Edited around the same time';
    } else if (sharedTags.length > 0) {
      reason = `Shares: ${sharedTags.map(t => '#' + t).join(', ')}`;
    } else {
      reason = 'Loosely related';
    }

    return { noteId: other.id, score, sharedTags, reason };
  });

  return relations
    .filter(r => r.score > 0.02)
    .sort((a, b) => b.score - a.score);
}

/**
 * Group notes into clusters based on mutual relatedness.
 * Returns groups sorted by recency of their most recent note.
 */
export function clusterNotes(notes: Note[]): Note[][] {
  if (notes.length === 0) return [];

  // Build adjacency: two notes are "connected" if relatedness > threshold
  const threshold = 0.08;
  const adjacency = new Map<string, Set<string>>();

  for (const note of notes) {
    adjacency.set(note.id, new Set());
  }

  for (let i = 0; i < notes.length; i++) {
    const relations = computeRelations(notes[i], notes);
    for (const rel of relations) {
      if (rel.score >= threshold) {
        adjacency.get(notes[i].id)!.add(rel.noteId);
        adjacency.get(rel.noteId)?.add(notes[i].id);
      }
    }
  }

  // BFS to find connected components
  const visited = new Set<string>();
  const clusters: Note[][] = [];
  const noteMap = new Map(notes.map(n => [n.id, n]));

  for (const note of notes) {
    if (visited.has(note.id)) continue;
    const cluster: Note[] = [];
    const queue = [note.id];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      cluster.push(noteMap.get(current)!);
      for (const neighbor of adjacency.get(current) || []) {
        if (!visited.has(neighbor)) {
          queue.push(neighbor);
        }
      }
    }
    // Sort within cluster by recency
    cluster.sort((a, b) => b.updatedAt - a.updatedAt);
    clusters.push(cluster);
  }

  // Sort clusters by most recent note in each
  clusters.sort((a, b) => b[0].updatedAt - a[0].updatedAt);

  return clusters;
}
