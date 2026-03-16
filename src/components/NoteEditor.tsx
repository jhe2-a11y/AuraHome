import { useRef, useEffect } from 'react';

interface NoteEditorProps {
  rawText: string;
  onChange: (text: string) => void;
}

export function NoteEditor({ rawText, onChange }: NoteEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [rawText]);

  return (
    <div className="note-editor">
      <div className="editor-header">
        <span className="editor-icon">✏️</span>
        <span className="editor-title">Jot it down</span>
        <span className="editor-hint">Just type — we'll make it beautiful</span>
      </div>
      <textarea
        ref={textareaRef}
        className="editor-textarea"
        value={rawText}
        onChange={e => onChange(e.target.value)}
        placeholder={`Start jotting your notes here...\n\n# Use headings with #\n- Bullet points with - or *\n!! Highlight important stuff\n[ ] Create checklists\n> Add quotes\n#tag to tag your notes\nterm: definition for key terms`}
        spellCheck={false}
        autoFocus
      />
      <div className="editor-footer">
        <span className="line-count">{rawText.split('\n').filter(l => l.trim()).length} lines</span>
        <span className="char-count">{rawText.length} chars</span>
      </div>
    </div>
  );
}
