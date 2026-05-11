'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import type { DocumentStatus } from '@/types/document';

interface ProcessingStatusProps {
  documentId: string;
  onReady?: () => void;
}

const POLL_INTERVAL = 3000;

export function ProcessingStatus({ documentId, onReady }: ProcessingStatusProps) {
  const [status, setStatus] = useState<DocumentStatus>('pending');
  const [sceneCount, setSceneCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const res = await fetch(`/api/documents/${documentId}`);
        const data = await res.json();
        setStatus(data.status);
        if (data.scene_count) setSceneCount(data.scene_count);

        if (data.status === 'ready') {
          onReady?.();
          return;
        }
        if (data.status === 'failed') {
          setError(data.error_message ?? 'Processing failed.');
          return;
        }
        timer = setTimeout(poll, POLL_INTERVAL);
      } catch {
        timer = setTimeout(poll, POLL_INTERVAL * 2);
      }
    }

    poll();
    return () => clearTimeout(timer);
  }, [documentId, onReady]);

  const steps: { label: string; done: boolean; active: boolean }[] = [
    { label: 'Uploading document', done: true, active: false },
    { label: 'Extracting content', done: status !== 'pending', active: status === 'pending' },
    { label: 'Generating narration', done: status === 'ready', active: status === 'processing' },
    { label: 'Building RAG index', done: status === 'ready', active: status === 'processing' },
    { label: 'Ready', done: status === 'ready', active: false },
  ];

  if (status === 'failed') {
    return (
      <div className="flex items-start gap-3 px-4 py-3 border border-red-200 rounded-[4px] bg-red-50">
        <XCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-red-700">Processing failed</p>
          <p className="text-xs text-red-600 mt-0.5">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-3">
          {step.done ? (
            <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
          ) : step.active ? (
            <Loader2 className="h-4 w-4 text-neutral-400 shrink-0 animate-spin" />
          ) : (
            <div className="h-4 w-4 rounded-full border border-neutral-200 shrink-0" />
          )}
          <span className={`text-sm ${step.active ? 'text-neutral-700' : step.done ? 'text-neutral-500' : 'text-neutral-300'}`}>
            {step.label}
            {step.done && step.label === 'Ready' && sceneCount ? ` — ${sceneCount} scenes` : ''}
          </span>
        </div>
      ))}
    </div>
  );
}
