'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, BarChart2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';
import { getAdminKey, setAdminKey } from '@/lib/session';
import type { DashboardData } from '@/types/analytics';

interface DocOption {
  id: string;
  title: string;
  status: string;
  scene_count: number | null;
}

export default function DashboardPage() {
  const [authed, setAuthed] = useState(() => typeof window !== 'undefined' && !!getAdminKey());
  const [keyInput, setKeyInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [docs, setDocs] = useState<DocOption[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [sessions, setSessions] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDocs = useCallback(async () => {
    const key = getAdminKey();
    if (!key) return;
    const res = await fetch('/api/documents', { headers: { 'X-Admin-Key': key } });
    if (res.ok) {
      const data = await res.json();
      setDocs((data.documents ?? []).filter((d: DocOption) => d.status === 'ready'));
    }
  }, []);

  useEffect(() => { if (authed) loadDocs(); }, [authed, loadDocs]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/documents', { headers: { 'X-Admin-Key': keyInput } });
    if (res.ok) {
      setAdminKey(keyInput);
      setAuthed(true);
      const data = await res.json();
      setDocs((data.documents ?? []).filter((d: DocOption) => d.status === 'ready'));
    } else {
      setAuthError('Invalid admin key.');
    }
  };

  const loadAnalytics = async (docId: string) => {
    const key = getAdminKey();
    if (!key) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/analytics/dashboard?document_id=${docId}`, { headers: { 'X-Admin-Key': key } });
      if (!res.ok) throw new Error('Failed to load analytics');
      const data = await res.json();
      setDashboard(data.dashboard);
      setSessions(data.sessions ?? []);
      setSelectedDocId(docId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (!authed) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen px-6">
        <div className="w-full max-w-sm space-y-6">
          <div>
            <Link href="/" className="text-sm text-neutral-400 hover:text-neutral-700 flex items-center gap-1 mb-6">
              <ArrowLeft className="h-3.5 w-3.5" /> Home
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-950">Analytics</h1>
            <p className="text-sm text-neutral-500 mt-1">Enter your admin key to continue.</p>
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
      <header className="border-b border-neutral-100 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-sm text-neutral-400 hover:text-neutral-700 flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" /> Home
        </Link>
        <div className="flex items-center gap-2">
          <BarChart2 className="h-4 w-4 text-neutral-400" />
          <span className="text-sm font-medium text-neutral-950">Analytics</span>
        </div>
        <Link href="/upload">
          <Button variant="ghost" size="sm">Upload</Button>
        </Link>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Document list */}
        <div className="w-60 border-r border-neutral-100 flex flex-col shrink-0">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-400 px-5 py-4 border-b border-neutral-100">Documents</p>
          <div className="flex-1 overflow-y-auto">
            {docs.length === 0 && (
              <p className="text-xs text-neutral-400 px-5 py-4">No ready documents.</p>
            )}
            {docs.map((doc) => (
              <button
                key={doc.id}
                onClick={() => loadAnalytics(doc.id)}
                className={`w-full text-left px-5 py-3 border-b border-neutral-50 hover:bg-neutral-50 transition-colors ${selectedDocId === doc.id ? 'bg-neutral-50' : ''}`}
              >
                <p className="text-sm text-neutral-700 truncate">{doc.title}</p>
                <p className="text-xs text-neutral-400 mt-0.5">{doc.scene_count} scenes</p>
              </button>
            ))}
          </div>
        </div>

        {/* Dashboard */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selectedDocId && (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-neutral-400">Select a document to view analytics.</p>
            </div>
          )}
          {loading && (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-neutral-400">Loading…</p>
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {dashboard && !loading && (
            <div className="max-w-4xl space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold tracking-tight text-neutral-950">
                  {docs.find((d) => d.id === selectedDocId)?.title}
                </h2>
                <Link href={`/view/${selectedDocId}`}>
                  <Button variant="outline" size="sm">View player →</Button>
                </Link>
              </div>
              <AnalyticsDashboard
                data={dashboard}
                sessions={sessions as Parameters<typeof AnalyticsDashboard>[0]['sessions']}
              />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
