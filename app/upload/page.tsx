'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, Plus, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FileDropzone } from '@/components/upload/FileDropzone';
import { GoogleSlidesInput } from '@/components/upload/GoogleSlidesInput';
import { ProcessingStatus } from '@/components/upload/ProcessingStatus';
import { getAdminKey, setAdminKey } from '@/lib/session';

type UploadMode = 'file' | 'slides';
type PageState = 'auth' | 'upload' | 'processing' | 'done';

export default function UploadPage() {
  const [pageState, setPageState] = useState<PageState>(() =>
    typeof window !== 'undefined' && getAdminKey() ? 'upload' : 'auth'
  );
  const [adminKeyInput, setAdminKeyInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [mode, setMode] = useState<UploadMode>('file');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [slidesUrl, setSlidesUrl] = useState('');
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Array<{ id: string; title: string; status: string; created_at: string }>>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/documents', {
      headers: { 'X-Admin-Key': adminKeyInput },
    });
    if (res.ok) {
      setAdminKey(adminKeyInput);
      const data = await res.json();
      setDocuments(data.documents ?? []);
      setPageState('upload');
    } else if (res.status === 401) {
      setAuthError('Invalid admin key. Please try again.');
    } else {
      setAuthError(`Server error (${res.status}). Check that Supabase migrations have been run.`);
    }
  };

  const loadDocuments = useCallback(async () => {
    const key = getAdminKey();
    if (!key) return;
    setLoadingDocs(true);
    try {
      const res = await fetch('/api/documents', { headers: { 'X-Admin-Key': key } });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents ?? []);
      }
    } finally {
      setLoadingDocs(false);
    }
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const key = getAdminKey();
    if (!key) return;

    if (mode === 'file' && !file) { setUploadError('Please select a file.'); return; }
    if (mode === 'slides' && !slidesUrl) { setUploadError('Please enter a Google Slides URL.'); return; }

    setUploading(true);
    setUploadError(null);

    const fd = new FormData();
    fd.append('title', title || (file?.name ?? 'Untitled'));
    if (mode === 'file' && file) fd.append('file', file);
    if (mode === 'slides') fd.append('slides_url', slidesUrl);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'X-Admin-Key': key },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Upload failed');
      setDocumentId(data.document_id);
      setPageState('processing');
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (pageState === 'auth') {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen px-6">
        <div className="w-full max-w-sm space-y-6">
          <div>
            <Link href="/" className="text-sm text-neutral-400 hover:text-neutral-700 flex items-center gap-1 mb-6">
              <ArrowLeft className="h-3.5 w-3.5" /> Home
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-950">Admin access</h1>
            <p className="text-sm text-neutral-500 mt-1">Enter your admin key to upload documents.</p>
          </div>
          <form onSubmit={handleAuth} className="space-y-4">
            <input
              type="password"
              placeholder="Admin key"
              value={adminKeyInput}
              onChange={(e) => setAdminKeyInput(e.target.value)}
              className="w-full text-sm px-3 py-2 border border-neutral-200 rounded-[4px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950"
            />
            {authError && <p className="text-xs text-red-600">{authError}</p>}
            <Button type="submit" className="w-full">Continue</Button>
          </form>
        </div>
      </main>
    );
  }

  if (pageState === 'processing' && documentId) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen px-6">
        <div className="w-full max-w-sm space-y-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-950">Processing…</h1>
            <p className="text-sm text-neutral-500 mt-1">Your document is being converted. This usually takes 30–90 seconds.</p>
          </div>
          <ProcessingStatus
            documentId={documentId}
            onReady={() => {
              setPageState('done');
              loadDocuments();
            }}
          />
        </div>
      </main>
    );
  }

  if (pageState === 'done' && documentId) {
    const viewUrl = `/view/${documentId}`;
    return (
      <main className="flex flex-col items-center justify-center min-h-screen px-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-neutral-950 flex items-center justify-center">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-950">Ready!</h1>
          </div>
          <div className="border border-neutral-200 rounded-[4px] p-4 space-y-3">
            <p className="text-sm text-neutral-500">Share this link with your viewers:</p>
            <div className="flex items-center gap-2">
              <code className="text-xs text-neutral-700 bg-neutral-50 border border-neutral-200 rounded-[4px] px-2 py-1.5 flex-1 break-all">
                {typeof window !== 'undefined' ? window.location.origin : ''}{viewUrl}
              </code>
              <Button variant="outline" size="icon-sm" onClick={() => navigator.clipboard.writeText(`${window.location.origin}${viewUrl}`)}>
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              </Button>
            </div>
          </div>
          <div className="flex gap-3">
            <Link href={viewUrl} className="flex-1">
              <Button className="w-full gap-2">Open player <ExternalLink className="h-3.5 w-3.5" /></Button>
            </Link>
            <Link href={`/edit/${documentId}`}>
              <Button variant="outline" className="gap-1.5">
                <Pencil className="h-3.5 w-3.5" /> Edit scripts
              </Button>
            </Link>
            <Button variant="outline" onClick={() => { setDocumentId(null); setFile(null); setSlidesUrl(''); setTitle(''); setPageState('upload'); }}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // Upload form
  return (
    <main className="flex flex-col min-h-screen">
      <header className="border-b border-neutral-100 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-sm text-neutral-400 hover:text-neutral-700 flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" /> Home
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">Analytics</Button>
          </Link>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Upload form */}
        <div className="flex-1 flex items-start justify-center px-6 py-12 overflow-y-auto">
          <div className="w-full max-w-md space-y-8">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-neutral-950">Upload document</h1>
              <p className="text-sm text-neutral-500 mt-1">PDF, PowerPoint, Word, or a Google Slides link.</p>
            </div>

            <form onSubmit={handleUpload} className="space-y-6">
              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wider text-neutral-400">Title</label>
                <input
                  type="text"
                  placeholder="Auto-detected from filename"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-neutral-200 rounded-[4px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 placeholder:text-neutral-300"
                />
              </div>

              {/* Mode tabs */}
              <div className="space-y-3">
                <div className="flex border border-neutral-200 rounded-[4px] p-0.5">
                  {(['file', 'slides'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      className={`flex-1 py-1.5 text-sm rounded-[3px] transition-colors ${mode === m ? 'bg-neutral-950 text-white' : 'text-neutral-500 hover:text-neutral-700'}`}
                    >
                      {m === 'file' ? 'File upload' : 'Google Slides'}
                    </button>
                  ))}
                </div>

                {mode === 'file' ? (
                  <FileDropzone onFile={setFile} disabled={uploading} />
                ) : (
                  <GoogleSlidesInput onUrl={setSlidesUrl} disabled={uploading} />
                )}
              </div>

              {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}

              <Button type="submit" className="w-full" disabled={uploading}>
                {uploading ? 'Uploading…' : 'Upload & process'}
              </Button>
            </form>
          </div>
        </div>

        {/* Document list */}
        <div className="hidden md:flex w-72 border-l border-neutral-100 flex-col">
          <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">Documents</p>
            <button onClick={loadDocuments} disabled={loadingDocs} className="text-xs text-neutral-400 hover:text-neutral-700">
              {loadingDocs ? 'Loading…' : 'Refresh'}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {documents.length === 0 ? (
              <p className="text-xs text-neutral-400 px-5 py-4">No documents yet.</p>
            ) : (
              documents.map((doc) => (
                <Link key={doc.id} href={doc.status === 'ready' ? `/view/${doc.id}` : '#'} className="block px-5 py-3 border-b border-neutral-50 hover:bg-neutral-50 transition-colors">
                  <p className="text-sm text-neutral-700 truncate">{doc.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-xs ${doc.status === 'ready' ? 'text-green-600' : doc.status === 'failed' ? 'text-red-500' : 'text-neutral-400'}`}>
                      {doc.status}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
