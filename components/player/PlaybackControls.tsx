'use client';

import { SkipBack, SkipForward, Play, Pause, Volume2, VolumeX, Subtitles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PlayerState, PlaybackSpeed } from '@/hooks/useDocumentPlayer';

const SPEEDS: PlaybackSpeed[] = [0.75, 1.0, 1.25, 1.5, 2.0];

interface PlaybackControlsProps {
  playerState: PlayerState;
  narrationEnabled: boolean;
  speed: PlaybackSpeed;
  canPrev: boolean;
  canNext: boolean;
  showSubtitles: boolean;
  onPlay: () => void;
  onPause: () => void;
  onResume: () => void;
  onNext: () => void;
  onPrev: () => void;
  onToggleNarration: () => void;
  onSetSpeed: (speed: PlaybackSpeed) => void;
  onToggleSubtitles: () => void;
}

export function PlaybackControls({
  playerState,
  narrationEnabled,
  speed,
  canPrev,
  canNext,
  showSubtitles,
  onPlay,
  onPause,
  onResume,
  onNext,
  onPrev,
  onToggleNarration,
  onSetSpeed,
  onToggleSubtitles,
}: PlaybackControlsProps) {
  const isPlaying = playerState === 'playing' || playerState === 'transitioning';

  const handlePlayPause = () => {
    if (isPlaying) onPause();
    else if (playerState === 'paused') onResume();
    else onPlay();
  };

  const nextSpeed = () => {
    const idx = SPEEDS.indexOf(speed);
    onSetSpeed(SPEEDS[(idx + 1) % SPEEDS.length]);
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon-sm" onClick={onPrev} disabled={!canPrev}>
        <SkipBack className="h-4 w-4" />
      </Button>

      <Button variant="default" size="icon" onClick={handlePlayPause}>
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>

      <Button variant="ghost" size="icon-sm" onClick={onNext} disabled={!canNext}>
        <SkipForward className="h-4 w-4" />
      </Button>

      <div className="w-px h-4 bg-neutral-200 mx-1" />

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onToggleNarration}
        title={narrationEnabled ? 'Disable narration' : 'Enable narration'}
      >
        {narrationEnabled ? (
          <Volume2 className="h-4 w-4" />
        ) : (
          <VolumeX className="h-4 w-4 text-neutral-400" />
        )}
      </Button>

      <button
        onClick={nextSpeed}
        className="text-xs font-mono text-neutral-500 hover:text-neutral-900 transition-colors px-1.5 py-1 rounded-[4px] hover:bg-neutral-100 w-12 text-center"
        title="Playback speed"
      >
        {speed}x
      </button>

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onToggleSubtitles}
        title={showSubtitles ? 'Hide subtitles' : 'Show subtitles'}
        className={cn(showSubtitles && 'bg-neutral-100 text-neutral-900')}
      >
        <Subtitles className="h-4 w-4" />
      </Button>
    </div>
  );
}
