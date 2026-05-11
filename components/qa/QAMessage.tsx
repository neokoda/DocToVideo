'use client';

import { cn } from '@/lib/utils';
import type { QAMessage as QAMessageType } from '@/types/qa';

interface QAMessageProps {
  message: QAMessageType;
}

export function QAMessage({ message }: QAMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] px-3 py-2 rounded-[4px] text-sm leading-relaxed',
          isUser
            ? 'bg-neutral-950 text-white'
            : 'bg-neutral-100 text-neutral-700'
        )}
      >
        {message.content}
        {message.is_streaming && (
          <span className="inline-block w-1 h-3.5 bg-neutral-400 ml-0.5 animate-pulse align-text-bottom" />
        )}
      </div>
    </div>
  );
}
