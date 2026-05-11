'use client';

import { cn } from '@/lib/utils';
import type { Scene } from '@/types/document';

interface SceneThumbnailRailProps {
  scenes: Scene[];
  currentIndex: number;
  onSelect: (index: number) => void;
}

export function SceneThumbnailRail({ scenes, currentIndex, onSelect }: SceneThumbnailRailProps) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {scenes.map((scene, i) => (
        <button
          key={scene.id}
          onClick={() => onSelect(i)}
          title={scene.title}
          className={cn(
            'h-1.5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950',
            i === currentIndex
              ? 'w-6 bg-neutral-950'
              : 'w-1.5 bg-neutral-300 hover:bg-neutral-500'
          )}
        />
      ))}
    </div>
  );
}
