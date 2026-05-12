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
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;

  const playingKeyRef = useRef<string>('');

  const startSpeaking = (text: string, rate: PlaybackSpeed) => {
    const key = `${text}|${rate}`;
    playingKeyRef.current = key;

    tts.speak(text, {
      rate,
      onTimeUpdate: (currentTime, duration) => {
        onProgressRef.current(Math.round((currentTime / duration) * 100));
      },
      onEnd: () => {
        playingKeyRef.current = '';
        onEndRef.current();
      },
    }).catch((err) => {
      if (err?.name !== 'AbortError') console.warn('[useNarration] speak error:', err);
    });
  };

  useEffect(() => {
    if (!narrationEnabled) {
      if (tts.isSpeaking()) tts.pause();
      return;
    }

    if (playerState === 'playing') {
      if (tts.isPaused()) {
        tts.resume();
      } else if (!tts.isSpeaking()) {
        startSpeaking(script, speed);
      }
    } else if (playerState === 'paused') {
      tts.pause();
    } else {
      tts.stop();
      playingKeyRef.current = '';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerState, narrationEnabled]);

  useEffect(() => {
    if (!narrationEnabled) return;
    if (playerState !== 'playing') return;
    startSpeaking(script, speed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [script, speed]);

  useEffect(() => {
    return () => {
      tts.stop();
      playingKeyRef.current = '';
    };
  }, []);
}
