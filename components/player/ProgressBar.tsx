'use client';

import { useCallback } from 'react';

interface ProgressBarProps {
  current: number;
  total: number;
  narrationProgress: number;
  /** estimated_duration_s for every scene, in order */
  sceneDurations: number[];
  onSeek: (index: number) => void;
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export function ProgressBar({ current, total, narrationProgress, sceneDurations, onSeek }: ProgressBarProps) {
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      const sceneIndex = Math.min(total - 1, Math.floor(pct * total));
      onSeek(sceneIndex);
    },
    [total, onSeek]
  );

  const totalDurationS = sceneDurations.reduce((acc, d) => acc + (d ?? 60), 0);
  const elapsedBeforeS = sceneDurations.slice(0, current).reduce((acc, d) => acc + (d ?? 60), 0);
  const currentSceneDuration = sceneDurations[current] ?? 60;
  const currentElapsedS = Math.round((narrationProgress / 100) * currentSceneDuration);
  const totalElapsedS = elapsedBeforeS + currentElapsedS;

  // Fill width: fraction of total timeline
  const fillPct = totalDurationS > 0
    ? ((elapsedBeforeS + currentElapsedS) / totalDurationS) * 100
    : ((current + narrationProgress / 100) / total) * 100;

  // Compute scene boundary positions as % of the total timeline
  const boundaryPcts: number[] = [];
  let acc = 0;
  for (let i = 0; i < sceneDurations.length - 1; i++) {
    acc += sceneDurations[i] ?? 60;
    boundaryPcts.push((acc / totalDurationS) * 100);
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-neutral-400 tabular-nums w-10 text-right shrink-0">{fmt(totalElapsedS)}</span>

      <div
        className="relative flex-1 h-1.5 bg-neutral-200 rounded-full cursor-pointer group"
        onClick={handleClick}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={total - 1}
        aria-valuenow={current}
      >
        {/* Filled portion */}
        <div
          className="absolute left-0 top-0 h-full bg-neutral-950 rounded-full transition-all"
          style={{ width: `${fillPct}%` }}
        />

        {/* Scene boundary markers — visible on both filled and unfilled segments */}
        {boundaryPcts.map((pct, i) => (
          <div
            key={i}
            className="absolute top-0 h-full w-px z-10"
            style={{
              left: `${pct}%`,
              background: 'white',
              boxShadow: '0 0 0 0.5px rgba(0,0,0,0.2)',
            }}
          />
        ))}

        {/* Scrub thumb */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-neutral-950 rounded-full border-2 border-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ left: `calc(${fillPct}% - 6px)` }}
        />
      </div>

      <span className="text-xs text-neutral-400 tabular-nums w-10 shrink-0">{fmt(totalDurationS)}</span>
    </div>
  );
}
