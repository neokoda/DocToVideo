'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { Scene } from '@/types/document';

// Split narration_script into sentence groups, each with a startPct threshold
function buildChunks(script: string, groupSize = 3) {
  const sentences = script
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const chunks: { text: string; startPct: number }[] = [];
  let charPos = 0;

  for (let i = 0; i < sentences.length; i += groupSize) {
    const group = sentences.slice(i, i + groupSize);
    const text = group.join(' ');
    // First chunk always visible; subsequent chunks appear when narration reaches them
    const startPct = i === 0 ? 0 : Math.min(98, (charPos / script.length) * 100);
    chunks.push({ text, startPct });
    charPos += group.join(' ').length + 1;
  }

  return chunks;
}

interface SceneRendererProps {
  scene: Scene;
  narrationProgress: number;
}

export function SceneRenderer({ scene, narrationProgress }: SceneRendererProps) {
  const [sourceOpen, setSourceOpen] = useState(false);

  const chunks = useMemo(() => buildChunks(scene.narration_script), [scene.narration_script]);

  // A chunk is visible if narrationProgress has reached its threshold.
  // Before playback (progress=0), only the first chunk shows.
  // At 100% all chunks show (scene completed / subtitles review).
  const visibleChunks = chunks.filter((c) => narrationProgress >= c.startPct);

  return (
    <div className="relative h-full flex flex-col gap-0 overflow-hidden">

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto px-8 pt-8 pb-4 flex flex-col gap-5">

        {/* Title */}
        <motion.h2
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="text-2xl font-semibold tracking-tight text-neutral-950 leading-tight shrink-0"
        >
          {scene.title}
        </motion.h2>

        {/* Progressive narration chunks */}
        <div className="flex flex-col gap-3 flex-1">
          <AnimatePresence initial={false}>
            {visibleChunks.map((chunk, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="rounded-lg bg-neutral-50 border border-neutral-100 px-5 py-4"
              >
                <p className="text-sm text-neutral-800 leading-relaxed">{chunk.text}</p>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Ghost cards — hint that more content is coming */}
          {visibleChunks.length < chunks.length && narrationProgress > 0 && (
            <div className="rounded-lg border border-dashed border-neutral-200 px-5 py-4 opacity-40">
              <div className="h-3 w-3/4 bg-neutral-200 rounded-full" />
              <div className="h-3 w-1/2 bg-neutral-200 rounded-full mt-2" />
            </div>
          )}
        </div>
      </div>

      {/* Source text accordion — pinned at the bottom */}
      <div className="shrink-0 border-t border-neutral-100 px-8 pt-3 pb-4">
        <button
          onClick={() => setSourceOpen((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
        >
          {sourceOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {sourceOpen ? 'Hide source text' : 'View source text'}
        </button>

        {sourceOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.2 }}
            className="mt-3 overflow-hidden"
          >
            <div className="rounded-lg bg-neutral-50 border border-neutral-200 px-4 py-3 max-h-40 overflow-y-auto">
              <p className="text-xs text-neutral-500 leading-relaxed whitespace-pre-wrap">
                {scene.raw_content}
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
