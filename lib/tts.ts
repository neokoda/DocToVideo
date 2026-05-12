'use client';

export interface TTSOptions {
  rate?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
}

let currentAudio: HTMLAudioElement | null = null;
let currentBlobUrl: string | null = null;
let currentAbort: AbortController | null = null;
// True while we're fetching audio from the server (before audio element is ready)
let fetching = false;

function cleanupAudio() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.onplay = null;
    currentAudio.onended = null;
    currentAudio.ontimeupdate = null;
    currentAudio.onerror = null;
    currentAudio.src = '';
    currentAudio = null;
  }
  if (currentBlobUrl) {
    URL.revokeObjectURL(currentBlobUrl);
    currentBlobUrl = null;
  }
}

export function stop(): void {
  currentAbort?.abort();
  currentAbort = null;
  fetching = false;
  cleanupAudio();
}

export async function speak(text: string, options: TTSOptions = {}): Promise<void> {
  stop();

  const ctrl = new AbortController();
  currentAbort = ctrl;
  fetching = true;

  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, rate: options.rate ?? 1.0 }),
      signal: ctrl.signal,
    });

    fetching = false;
    if (!res.ok) throw new Error(`TTS API ${res.status}`);
    if (ctrl.signal.aborted) return;

    const blob = await res.blob();
    if (ctrl.signal.aborted) return;

    const blobUrl = URL.createObjectURL(blob);
    currentBlobUrl = blobUrl;
    currentAbort = null;

    const audio = new Audio(blobUrl);
    currentAudio = audio;

    audio.onplay = () => options.onStart?.();
    audio.ontimeupdate = () => {
      if (audio.duration) options.onTimeUpdate?.(audio.currentTime, audio.duration);
    };
    audio.onended = () => {
      cleanupAudio();
      options.onEnd?.();
    };
    audio.onerror = () => {
      cleanupAudio();
      options.onEnd?.();
    };

    await audio.play();
  } catch (err) {
    fetching = false;
    if ((err as Error)?.name === 'AbortError') return;
    console.warn('[tts] speak error:', err);
    options.onEnd?.();
  }
}

export function pause(): void {
  currentAudio?.pause();
}

export function resume(): void {
  currentAudio?.play().catch(() => {});
}

export function isSpeaking(): boolean {
  if (fetching) return true; // treat fetch phase as "speaking" so we don't double-start
  return !!(currentAudio && !currentAudio.paused && !currentAudio.ended);
}

export function isPaused(): boolean {
  return !!(currentAudio?.paused && !currentAudio.ended && currentAudio.currentTime > 0);
}
