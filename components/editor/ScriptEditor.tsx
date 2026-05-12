'use client';

import { useRef, useState, useCallback } from 'react';
import { Wand2, Check, X, Save, Bold } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getAdminKey } from '@/lib/session';
import type { NarratedSection } from '@/types/document';

interface ScriptEditorProps {
  sceneId: string;
  sceneTitle: string;
  initialSections: NarratedSection[];
  onSaved?: (newScript: string, newSections: NarratedSection[]) => void;
}

interface SelectionState {
  sectionIndex: number;
  start: number;
  end: number;
  text: string;
}

function renderBoldPreview(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <mark key={i} className="bg-amber-100 text-amber-900 font-semibold px-0.5 rounded">
        {part.slice(2, -2)}
      </mark>
    ) : (
      <span key={i}>
        {part.split('\n').map((line, j, arr) => (
          <span key={j}>{line}{j < arr.length - 1 && <br />}</span>
        ))}
      </span>
    )
  );
}

function SectionEditor({
  section,
  index,
  onChange,
  selection,
  onSelect,
  aiInstruction,
  onAiInstructionChange,
  onRewrite,
  onDismissAI,
  rewriting,
  rewriteError,
}: {
  section: NarratedSection;
  index: number;
  onChange: (s: NarratedSection) => void;
  selection: SelectionState | null;
  onSelect: (sel: SelectionState | null) => void;
  aiInstruction: string;
  onAiInstructionChange: (v: string) => void;
  onRewrite: () => void;
  onDismissAI: () => void;
  rewriting: boolean;
  rewriteError: string | null;
}) {
  const taRef = useRef<HTMLTextAreaElement>(null);

  const readSelection = useCallback(() => {
    const ta = taRef.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e } = ta;
    if (s !== e) {
      onSelect({ sectionIndex: index, start: s, end: e, text: ta.value.slice(s, e) });
    } else {
      onSelect(null);
    }
  }, [index, onSelect]);

  const wrapBold = () => {
    const ta = taRef.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e } = ta;
    if (s === e) return;
    const selected = ta.value.slice(s, e);
    const wrapped = selected.startsWith('**') && selected.endsWith('**')
      ? selected.slice(2, -2)
      : `**${selected}**`;
    const newContent = ta.value.slice(0, s) + wrapped + ta.value.slice(e);
    onChange({ ...section, content: newContent });
  };

  const isActiveSection = selection?.sectionIndex === index;

  return (
    <div className="space-y-2 pb-4 border-b border-neutral-100 last:border-0 last:pb-0">
      {/* Title row */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 w-10 shrink-0">
          § {index + 1}
        </span>
        <input
          type="text"
          value={section.title}
          onChange={(e) => onChange({ ...section, title: e.target.value })}
          placeholder="Section title"
          className="flex-1 text-xs px-2 py-1 border border-neutral-200 rounded-[4px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-950 text-neutral-700 placeholder:text-neutral-300"
        />
      </div>

      {/* Content textarea */}
      <div className="pl-12 space-y-1.5">
        <div className="relative">
          <textarea
            ref={taRef}
            value={section.content}
            onChange={(e) => onChange({ ...section, content: e.target.value })}
            onSelect={readSelection}
            onMouseUp={readSelection}
            onKeyUp={readSelection}
            rows={4}
            spellCheck
            className="w-full text-sm text-neutral-800 leading-relaxed px-3 py-2.5 pr-9 border border-neutral-200 rounded-[4px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 resize-y font-[inherit]"
          />
          <button
            type="button"
            onClick={wrapBold}
            title="Wrap selection in **bold** (toggle)"
            className="absolute top-2 right-2 p-1 rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            <Bold className="h-3 w-3" />
          </button>
        </div>

        {/* Live bold preview */}
        <p className="text-[11px] text-neutral-500 leading-relaxed">
          {renderBoldPreview(section.content)}
        </p>

        {/* AI rewrite toolbar — shown when text is selected in this section */}
        {isActiveSection && selection && (
          <div className="flex items-center gap-2 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-[4px]">
            <Wand2 className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
            <input
              type="text"
              placeholder={`Rewrite "${selection.text.slice(0, 35)}${selection.text.length > 35 ? '…' : ''}"…`}
              value={aiInstruction}
              onChange={(e) => onAiInstructionChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onRewrite(); } }}
              className="flex-1 min-w-0 text-sm bg-transparent outline-none placeholder:text-neutral-400"
              autoFocus
            />
            {rewriteError && <span className="text-xs text-red-500 shrink-0">{rewriteError}</span>}
            <Button size="sm" onClick={onRewrite} disabled={!aiInstruction.trim() || rewriting} className="shrink-0">
              {rewriting ? 'Rewriting…' : 'Rewrite'}
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={onDismissAI} className="shrink-0">
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function ScriptEditor({ sceneId, sceneTitle, initialSections, onSaved }: ScriptEditorProps) {
  const [sections, setSections] = useState<NarratedSection[]>(
    initialSections.length > 0 ? initialSections : [{ title: '', content: '' }]
  );
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [aiInstruction, setAiInstruction] = useState('');
  const [rewriting, setRewriting] = useState(false);
  const [rewriteError, setRewriteError] = useState<string | null>(null);

  const handleSectionChange = (index: number, updated: NarratedSection) => {
    setSections((prev) => prev.map((s, i) => i === index ? updated : s));
    setIsDirty(true);
    setSavedOk(false);
    // If user edits the active section's content, clear stale selection
    if (selection?.sectionIndex === index) setSelection(null);
  };

  const handleSave = async () => {
    const key = getAdminKey();
    if (!key) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/scenes/${sceneId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': key },
        body: JSON.stringify({ sections }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setIsDirty(false);
      setSavedOk(true);
      onSaved?.(data.narration_script ?? '', data.sections ?? sections);
      setTimeout(() => setSavedOk(false), 2500);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleRewrite = async () => {
    if (!selection || !aiInstruction.trim()) return;
    const key = getAdminKey();
    if (!key) return;
    setRewriting(true);
    setRewriteError(null);

    // Full script for context (derived from all sections, no **)
    const fullScript = sections.map(s => s.content.replace(/\*\*/g, '')).join(' ');

    try {
      const res = await fetch(`/api/scenes/${sceneId}/rewrite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': key },
        body: JSON.stringify({
          fullScript,
          selectedText: selection.text,
          instruction: aiInstruction,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Replace the selected range in the section's content
      const { sectionIndex: si, start, end } = selection;
      setSections((prev) => prev.map((s, i) => {
        if (i !== si) return s;
        return { ...s, content: s.content.slice(0, start) + data.rewritten + s.content.slice(end) };
      }));
      setIsDirty(true);
      setSavedOk(false);
      setSelection(null);
      setAiInstruction('');
    } catch (err) {
      setRewriteError(err instanceof Error ? err.message : 'Rewrite failed');
    } finally {
      setRewriting(false);
    }
  };

  const handleSelect = (sel: SelectionState | null) => {
    setSelection(sel);
    if (!sel) {
      setAiInstruction('');
      setRewriteError(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 truncate pr-4">
          {sceneTitle}
        </p>
        <div className="flex items-center gap-2 shrink-0">
          {savedOk && (
            <span className="text-xs text-green-600 flex items-center gap-1">
              <Check className="h-3 w-3" /> Saved
            </span>
          )}
          {saveError && <span className="text-xs text-red-500">{saveError}</span>}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={!isDirty || saving}
            className="gap-1.5"
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {sections.map((sec, i) => (
          <SectionEditor
            key={i}
            section={sec}
            index={i}
            onChange={(updated) => handleSectionChange(i, updated)}
            selection={selection}
            onSelect={handleSelect}
            aiInstruction={aiInstruction}
            onAiInstructionChange={setAiInstruction}
            onRewrite={handleRewrite}
            onDismissAI={() => handleSelect(null)}
            rewriting={rewriting}
            rewriteError={rewriteError}
          />
        ))}
      </div>

      <p className="text-xs text-neutral-400">
        Select text in any section to rewrite it with AI. Use <Bold className="h-3 w-3 inline" /> or type <code className="bg-neutral-100 px-0.5 rounded text-[10px]">**word**</code> to highlight key terms.
        Saving derives the narration script automatically.
      </p>
    </div>
  );
}
