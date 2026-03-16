import { useState, useRef, useEffect } from 'react';
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
  const [transitioning, setTransitioning] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const hasContent = note.rawText.trim().length > 0;

  const switchMode = (newMode: ArtMode) => {
    if (newMode === artMode) return;
    setTransitioning(true);
    // Brief fade-out, then switch, then fade-in
    setTimeout(() => {
      setArtMode(newMode);
      setTimeout(() => setTransitioning(false), 50);
    }, 200);
  };

  // Reset transition state if note changes
  useEffect(() => {
    setTransitioning(false);
  }, [note.id]);

  return (
    <div className="art-panel">
      <div className="art-toolbar">
        <span className="art-toolbar-title">✦ Note Art</span>
        <div className="art-mode-switcher">
          {ART_MODES.map(m => (
            <button
              key={m.mode}
              className={`art-mode-btn ${artMode === m.mode ? 'active' : ''}`}
              onClick={() => switchMode(m.mode)}
              title={m.desc}
            >
              <span>{m.icon}</span>
              <span className="art-mode-label">{m.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div
        ref={stageRef}
        className={`art-stage ${transitioning ? 'art-transitioning' : ''}`}
      >
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
