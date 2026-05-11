'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { Callout, CalloutType } from '@/types/document';

const calloutStyles: Record<CalloutType, string> = {
  emphasis: 'bg-neutral-950 text-white',
  definition: 'bg-neutral-100 text-neutral-700 border border-neutral-200',
  example: 'bg-neutral-50 text-neutral-600 border border-neutral-200',
  warning: 'bg-amber-50 text-amber-800 border border-amber-200',
};

interface CalloutOverlayProps {
  callouts: Callout[];
  elapsedSeconds: number;
  active: boolean;
}

export function CalloutOverlay({ callouts, elapsedSeconds, active }: CalloutOverlayProps) {
  const [visible, setVisible] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!active) { setVisible(new Set()); return; }
    const toShow = callouts
      .map((c, i) => ({ ...c, i }))
      .filter((c) => c.delay_s <= elapsedSeconds)
      .map((c) => c.i);
    setVisible(new Set(toShow));
  }, [elapsedSeconds, callouts, active]);

  return (
    <div className="absolute bottom-4 right-4 flex flex-col gap-2 items-end max-w-[260px] pointer-events-none z-10">
      <AnimatePresence>
        {callouts.map((callout, i) =>
          visible.has(i) ? (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 12, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className={cn(
                'px-3 py-1.5 rounded-[4px] text-xs font-medium leading-snug',
                calloutStyles[callout.callout_type]
              )}
            >
              {callout.text}
            </motion.div>
          ) : null
        )}
      </AnimatePresence>
    </div>
  );
}
