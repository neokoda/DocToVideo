'use client';

import type { SceneAnalytics } from '@/types/analytics';

interface WatchTimeChartProps {
  scenes: SceneAnalytics[];
}

export function WatchTimeChart({ scenes }: WatchTimeChartProps) {
  if (scenes.length === 0) return <p className="text-xs text-neutral-400">No data yet.</p>;

  const max = Math.max(...scenes.map((s) => s.avg_watch_time_s), 1);

  return (
    <div className="space-y-2">
      {scenes.map((scene) => (
        <div key={scene.scene_index} className="flex items-center gap-3">
          <span className="text-xs text-neutral-400 w-6 shrink-0 text-right">{scene.scene_index + 1}</span>
          <div className="flex-1 h-5 bg-neutral-100 rounded-[2px] overflow-hidden relative">
            <div
              className="h-full bg-neutral-950 rounded-[2px] transition-all"
              style={{ width: `${(scene.avg_watch_time_s / max) * 100}%` }}
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-neutral-500">
              {scene.avg_watch_time_s}s avg
            </span>
          </div>
          <span className="text-xs text-neutral-400 w-20 shrink-0 truncate" title={scene.title}>
            {scene.title}
          </span>
        </div>
      ))}
    </div>
  );
}
