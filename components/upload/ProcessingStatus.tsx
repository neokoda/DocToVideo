'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import type { DocumentStatus } from '@/types/document';

interface ProcessingStatusProps {
  documentId: string;
  onReady?: () => void;
}

const POLL_INTERVAL = 2500;

export function ProcessingStatus({ documentId, onReady }: ProcessingStatusProps) {
  const [status, setStatus] = useState<DocumentStatus>('pending');
  const [sceneCount, setSceneCount] = useState<number | null>(null);
  const [pipelineStep, setPipelineStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const res = await fetch(`/api/documents/${documentId}`);
        const data = await res.json();
        setStatus(data.status);
        if (data.scene_count) setSceneCount(data.scene_count);
        if (data.pipeline_step) setPipelineStep(data.pipeline_step);

        if (data.status === 'ready') { onReady?.(); return; }
        if (data.status === 'failed') { setError(data.error_message ?? 'Processing failed.'); return; }
        timer = setTimeout(poll, POLL_INTERVAL);
      } catch {
        timer = setTimeout(poll, POLL_INTERVAL * 2);
      }
    }

    poll();
    return () => clearTimeout(timer);
  }, [documentId, onReady]);

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

  if (status === 'ready') {
    return (
      <div className="flex items-center gap-3">
        <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
        <span className="text-sm text-neutral-700">
          Done — {sceneCount} scene{sceneCount !== 1 ? 's' : ''} ready
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Active step */}
      <div className="flex items-center gap-3">
        <Loader2 className="h-4 w-4 text-neutral-400 shrink-0 animate-spin" />
        <span className="text-sm text-neutral-700">
          {pipelineStep ?? 'Starting…'}
        </span>
      </div>

      {/* Completed milestones */}
      <div className="pl-7 space-y-2 border-l border-neutral-100 ml-2">
        <MilestoneRow label="File uploaded" done />
        <MilestoneRow label="Text extracted" done={status === 'processing' && !!pipelineStep && !pipelineStep.startsWith('Extracting')} />
        <MilestoneRow label="Scenes segmented" done={!!pipelineStep && (pipelineStep.startsWith('Narrating') || pipelineStep.startsWith('Saving') || pipelineStep.startsWith('Building'))} />
        <MilestoneRow label="Narration written" done={!!pipelineStep && (pipelineStep.startsWith('Saving') || pipelineStep.startsWith('Building'))} />
        <MilestoneRow label="Search index built" done={false} />
      </div>
    </div>
  );
}

function MilestoneRow({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {done ? (
        <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
      ) : (
        <div className="h-3.5 w-3.5 rounded-full border border-neutral-200 shrink-0" />
      )}
      <span className={`text-xs ${done ? 'text-neutral-500' : 'text-neutral-300'}`}>{label}</span>
    </div>
  );
}
