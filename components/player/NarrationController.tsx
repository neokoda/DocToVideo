'use client';

import { useNarration } from '@/hooks/useNarration';
import type { PlayerState, PlaybackSpeed } from '@/hooks/useDocumentPlayer';

interface NarrationControllerProps {
  script: string;
  playerState: PlayerState;
  speed: PlaybackSpeed;
  narrationEnabled: boolean;
  onProgress: (pct: number) => void;
  onEnd: () => void;
}

export function NarrationController(props: NarrationControllerProps) {
  useNarration(props);
  return null;
}
