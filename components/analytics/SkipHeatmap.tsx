'use client';

import { cn } from '@/lib/utils';
import type { SceneAnalytics } from '@/types/analytics';

interface SkipHeatmapProps {
  scenes: SceneAnalytics[];
}

export function SkipHeatmap({ scenes }: SkipHeatmapProps) {
  if (scenes.length === 0) return <p className="text-xs text-neutral-400">No data yet.</p>;

  const max = Math.max(...scenes.map((s) => s.skip_count), 1);

  const intensity = (count: number) => {
    const ratio = count / max;
    if (ratio === 0) return 'bg-neutral-100';
    if (ratio < 0.25) return 'bg-neutral-200';
    if (ratio < 0.5) return 'bg-neutral-400';
    if (ratio < 0.75) return 'bg-neutral-600';
    return 'bg-neutral-950';
  };

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        {scenes.map((scene) => (
          <div
            key={scene.scene_index}
            title={`Scene ${scene.scene_index + 1}: ${scene.skip_count} skips`}
            className={cn('w-8 h-8 rounded-[2px] flex items-center justify-center cursor-default transition-colors', intensity(scene.skip_count))}
          >
            <span className={cn(
              'text-xs font-mono',
              scene.skip_count / max > 0.5 ? 'text-white' : 'text-neutral-600'
            )}>
              {scene.scene_index + 1}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 pt-1">
        <span className="text-xs text-neutral-400">Low</span>
        {['bg-neutral-100','bg-neutral-200','bg-neutral-400','bg-neutral-600','bg-neutral-950'].map((c) => (
          <div key={c} className={cn('w-4 h-2 rounded-[1px]', c)} />
        ))}
        <span className="text-xs text-neutral-400">High skips</span>
      </div>
    </div>
  );
}
