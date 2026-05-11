'use client';

export interface TTSOptions {
  rate?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onBoundary?: (charIndex: number, totalLength: number) => void;
}

let currentUtterance: SpeechSynthesisUtterance | null = null;

export function isSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function speak(text: string, options: TTSOptions = {}): void {
  if (!isSupported()) return;
  stop();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = options.rate ?? 1.0;
  utterance.lang = 'en-US';

  utterance.onstart = () => options.onStart?.();
  utterance.onend = () => {
    currentUtterance = null;
    options.onEnd?.();
  };
  utterance.onboundary = (event) => {
    options.onBoundary?.(event.charIndex, text.length);
  };

  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

export function pause(): void {
  if (isSupported()) window.speechSynthesis.pause();
}

export function resume(): void {
  if (isSupported()) window.speechSynthesis.resume();
}

export function stop(): void {
  if (isSupported()) {
    window.speechSynthesis.cancel();
    currentUtterance = null;
  }
}

export function isSpeaking(): boolean {
  return isSupported() && window.speechSynthesis.speaking;
}

export function isPaused(): boolean {
  return isSupported() && window.speechSynthesis.paused;
}
