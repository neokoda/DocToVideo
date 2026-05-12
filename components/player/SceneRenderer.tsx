'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Scene, NarratedSection } from '@/types/document';

interface EnrichedSection extends NarratedSection {
  startPct: number; // narrationProgress % at which this section appears
}

// Strip **markers** to get the plain text length that maps to narration_script chars
function stripBold(text: string): string {
  return text.replace(/\*\*/g, '');
}

function buildEnrichedSections(sections: NarratedSection[], script: string): EnrichedSection[] {
  const source = sections.length > 0 ? sections : [{ title: '', content: script }];
  const scriptLen = script.length || 1;
  let charPos = 0;
  return source.map((sec, i) => {
    const startPct = i === 0 ? 0 : Math.min(99, (charPos / scriptLen) * 100);
    charPos += stripBold(sec.content).length + 1; // +1 for the space between sections
    return { ...sec, startPct };
  });
}

// Render text with **bold** markers as <strong> nodes and \n as <br>
function renderContent(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**') ? (
          <strong key={i} className="font-semibold text-neutral-950">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>
            {part.split('\n').map((line, j, arr) => (
              <span key={j}>{line}{j < arr.length - 1 && <br />}</span>
            ))}
          </span>
        )
      )}
    </>
  );
}

interface SceneRendererProps {
  scene: Scene;
  narrationProgress: number;
}

export function SceneRenderer({ scene, narrationProgress }: SceneRendererProps) {
  const enriched = useMemo(
    () => buildEnrichedSections(scene.sections ?? [], scene.narration_script),
    [scene.sections, scene.narration_script]
  );

  // A section appears as a whole when narrationProgress crosses its startPct
  const visibleSections = enriched.filter((s) => narrationProgress >= s.startPct);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-8 pt-8 pb-6 flex flex-col gap-0">

        {/* Scene title */}
        <motion.h2
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="text-2xl font-semibold tracking-tight text-neutral-950 leading-tight shrink-0 mb-7"
        >
          {scene.title}
        </motion.h2>

        {/* Sections */}
        <div className="flex flex-col">
          <AnimatePresence initial={false}>
            {visibleSections.map((sec, idx) => (
              <motion.div
                key={sec.startPct}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="flex flex-col"
              >
                {/* Section separator + title */}
                {sec.title ? (
                  <div className={`flex items-center gap-3 ${idx > 0 ? 'mt-8' : ''} mb-3`}>
                    <div className="h-[1.5px] flex-1 bg-neutral-300 rounded-full" />
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-500 shrink-0 px-1">
                      {sec.title}
                    </p>
                    <div className="h-[1.5px] flex-1 bg-neutral-300 rounded-full" />
                  </div>
                ) : (
                  idx > 0 && <div className="mt-8" />
                )}

                <p className="text-sm text-neutral-700 leading-relaxed">
                  {renderContent(sec.content)}
                </p>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Ghost — hint that more is coming */}
          {visibleSections.length < enriched.length && narrationProgress > 0 && (
            <div className="mt-6 flex flex-col gap-2 opacity-25">
              <div className="h-px w-full bg-neutral-300" />
              <div className="h-2.5 w-28 bg-neutral-200 rounded-full mt-1" />
              <div className="h-3 w-3/4 bg-neutral-200 rounded-full" />
              <div className="h-3 w-1/2 bg-neutral-200 rounded-full" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
