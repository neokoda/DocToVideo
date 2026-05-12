'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { QAMessage as QAMessageType } from '@/types/qa';

interface QAMessageProps {
  message: QAMessageType;
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-[3px] h-4">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="block w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.8s' }}
        />
      ))}
    </span>
  );
}

function CitationBlock({ citations }: { citations: QAMessageType['citations'] }) {
  const [open, setOpen] = useState(false);
  const items = citations ?? [];

  return (
    <div className="border-t border-neutral-200">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50 transition-colors"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        Sources ({items.length})
      </button>
      {open && (
        <div className="px-3 pb-2 space-y-1.5">
          {items.map((cite, i) => (
            <div key={i} className="border-l-2 border-neutral-300 pl-2">
              <p className="text-[11px] text-neutral-600 italic leading-snug">{cite.quote}</p>
              <p className="text-[10px] text-neutral-400 mt-0.5">{cite.scene_title}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function QAMessage({ message }: QAMessageProps) {
  const isUser = message.role === 'user';
  const isWaiting = !isUser && message.is_streaming;

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] px-3 py-2 rounded-[4px] text-sm leading-relaxed bg-neutral-950 text-white">
          {message.content}
        </div>
      </div>
    );
  }

  const citations = message.citations ?? [];

  return (
    <div className="flex justify-start">
      <div className={cn('max-w-[85%] rounded-[4px] text-sm leading-relaxed overflow-hidden bg-neutral-100')}>
        <div className="px-3 py-2 text-neutral-700">
          {isWaiting ? <TypingDots /> : message.content}
        </div>

        {!isWaiting && citations.length > 0 && <CitationBlock citations={citations} />}
      </div>
    </div>
  );
}
