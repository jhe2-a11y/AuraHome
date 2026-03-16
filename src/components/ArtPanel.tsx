import { useState } from 'react';
import type { Note } from '../types/note';
import { ArtCanvas } from './ArtCanvas';

interface ArtPanelProps {
  note: Note;
}

type ArtMode = 'constellation' | 'watercolor' | 'mindmap';

const ART_MODES: { mode: ArtMode; label: string; icon: string; desc: string }[] = [
  { mode: 'constellation', label: 'Constellation', icon: '✨', desc: 'Words as stars in your universe' },
  { mode: 'watercolor', label: 'Watercolor', icon: '🎨', desc: 'Notes painted in flowing color' },
  { mode: 'mindmap', label: 'Mind Map', icon: '🧠', desc: 'Ideas branching from your core thought' },
];

export function ArtPanel({ note }: ArtPanelProps) {
  const [artMode, setArtMode] = useState<ArtMode>('constellation');
  const hasContent = note.rawText.trim().length > 0;

  return (
    <div className="art-panel">
      <div className="art-toolbar">
        <span className="art-toolbar-title">✦ Note Art</span>
        <div className="art-mode-switcher">
          {ART_MODES.map(m => (
            <button
              key={m.mode}
              className={`art-mode-btn ${artMode === m.mode ? 'active' : ''}`}
              onClick={() => setArtMode(m.mode)}
              title={m.desc}
            >
              <span>{m.icon}</span>
              <span className="art-mode-label">{m.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="art-stage">
        {hasContent ? (
          <ArtCanvas note={note} mode={artMode} />
        ) : (
          <div className="art-empty">
            <div className="art-empty-icon">🎨</div>
            <p>Start writing to see your notes transform into art</p>
          </div>
        )}
      </div>
      <div className="art-caption">
        {ART_MODES.find(m => m.mode === artMode)?.desc}
        <span className="art-hint"> · Move your mouse to interact</span>
      </div>
    </div>
  );
}
