'use client';

import { useEffect, useRef } from 'react';
import * as tts from '@/lib/tts';
import type { PlayerState, PlaybackSpeed } from './useDocumentPlayer';

interface UseNarrationProps {
  script: string;
  playerState: PlayerState;
  speed: PlaybackSpeed;
  narrationEnabled: boolean;
  onProgress: (pct: number) => void;
  onEnd: () => void;
}

export function useNarration({
  script,
  playerState,
  speed,
  narrationEnabled,
  onProgress,
  onEnd,
}: UseNarrationProps) {
  // Keep callbacks in refs so we never stale-close over them
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;

  // Track the "key" for the currently playing utterance (script + speed).
  // When this changes we know we need a fresh speak() call.
  const playingKeyRef = useRef<string>('');

  const startSpeaking = (text: string, rate: PlaybackSpeed) => {
    const key = `${text}|${rate}`;
    playingKeyRef.current = key;
    tts.speak(text, {
      rate,
      onBoundary: (charIndex, total) =>
        onProgressRef.current(Math.round((charIndex / total) * 100)),
      onEnd: () => {
        playingKeyRef.current = '';
        onEndRef.current();
      },
    });
  };

  // --- Handle play / pause / stop / mute transitions ---
  useEffect(() => {
    if (!narrationEnabled) {
      // Mute: pause (not stop) so unmuting can resume from the same position.
      // Only pause if there's an active utterance; otherwise no-op.
      if (tts.isSpeaking()) tts.pause();
      return;
    }

    if (playerState === 'playing') {
      if (tts.isPaused()) {
        // Covers both: player-pause→resume AND unmute-while-playing
        tts.resume();
      } else if (!tts.isSpeaking()) {
        // Fresh start or previous utterance finished
        startSpeaking(script, speed);
      }
      // isSpeaking() && !isPaused() → already running, do nothing
    } else if (playerState === 'paused') {
      tts.pause();
    } else {
      // transitioning / idle / completed → stop
      tts.stop();
      playingKeyRef.current = '';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerState, narrationEnabled]);

  // --- Restart when script (scene) or speed changes ---
  useEffect(() => {
    if (!narrationEnabled) return;
    if (playerState !== 'playing') return;
    // Script or speed changed while playing → start fresh utterance
    startSpeaking(script, speed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [script, speed]);

  // Stop on unmount
  useEffect(() => {
    return () => {
      tts.stop();
      playingKeyRef.current = '';
    };
  }, []);
}
