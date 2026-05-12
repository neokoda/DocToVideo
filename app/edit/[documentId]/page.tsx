'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScriptEditor } from '@/components/editor/ScriptEditor';
import { getAdminKey, setAdminKey } from '@/lib/session';
import type { DocumentWithScenes, NarratedSection } from '@/types/document';

export default function EditPage() {
  const params = useParams<{ documentId: string }>();
  const documentId = params.documentId;

  const [authed, setAuthed] = useState(() => typeof window !== 'undefined' && !!getAdminKey());
  const [keyInput, setKeyInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [doc, setDoc] = useState<DocumentWithScenes | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDocument = useCallback(async () => {
    const key = getAdminKey();
    if (!key) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${documentId}`, { headers: { 'X-Admin-Key': key } });
      if (!res.ok) throw new Error('Failed to load document');
      const data = await res.json();
      setDoc(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => { if (authed) loadDocument(); }, [authed, loadDocument]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/documents', { headers: { 'X-Admin-Key': keyInput } });
    if (res.ok) {
      setAdminKey(keyInput);
      setAuthed(true);
    } else {
      setAuthError('Invalid admin key.');
    }
  };

  const handleSceneSaved = (sceneId: string, newScript: string, newSections: NarratedSection[]) => {
    setDoc((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        scenes: prev.scenes.map((s) =>
          s.id === sceneId ? { ...s, narration_script: newScript, sections: newSections } : s
        ),
      };
    });
  };

  if (!authed) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen px-6">
        <div className="w-full max-w-sm space-y-6">
          <Link href="/upload" className="text-sm text-neutral-400 hover:text-neutral-700 flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" /> Upload
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-950">Admin access</h1>
            <p className="text-sm text-neutral-500 mt-1">Enter your admin key to edit scripts.</p>
          </div>
          <form onSubmit={handleAuth} className="space-y-4">
            <input
              type="password"
              placeholder="Admin key"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              className="w-full text-sm px-3 py-2 border border-neutral-200 rounded-[4px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950"
            />
            {authError && <p className="text-xs text-red-600">{authError}</p>}
            <Button type="submit" className="w-full">Continue</Button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-col min-h-screen">
      <header className="border-b border-neutral-100 px-6 py-4 flex items-center justify-between shrink-0">
        <Link href="/upload" className="text-sm text-neutral-400 hover:text-neutral-700 flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" /> Upload
        </Link>
        <span className="text-sm font-medium text-neutral-950 truncate max-w-xs">
          {doc?.title ?? 'Edit scripts'}
        </span>
        {doc && (
          <Link href={`/view/${doc.id}`}>
            <Button variant="outline" size="sm" className="gap-1.5">
              View player <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </Link>
        )}
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-8">
        {loading && <p className="text-sm text-neutral-400 text-center mt-16">Loading…</p>}
        {error && <p className="text-sm text-red-600 text-center mt-16">{error}</p>}
        {doc && (
          <div className="max-w-2xl mx-auto space-y-6">
            <p className="text-xs text-neutral-400">
              Select text in any script and describe how to change it — or edit directly and save.
              Saving regenerates the on-screen sections automatically.
            </p>
            {doc.scenes.map((scene) => (
              <div key={scene.id} className="border border-neutral-200 rounded-lg p-5">
                <ScriptEditor
                  sceneId={scene.id}
                  sceneTitle={scene.title}
                  initialSections={scene.sections ?? []}
                  onSaved={(newScript, newSections) => handleSceneSaved(scene.id, newScript, newSections)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
