'use client';

import type { AnalyticsEvent } from '@/types/analytics';

const FLUSH_INTERVAL_MS = 10_000;
let queue: AnalyticsEvent[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;
let initialized = false;

function flush() {
  if (queue.length === 0) return;
  const batch = [...queue];
  queue = [];

  const url = '/api/analytics';
  const body = JSON.stringify({ events: batch });

  if (navigator.sendBeacon) {
    navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
  } else {
    fetch(url, { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => {});
  }
}

export function initAnalytics() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  flushTimer = setInterval(flush, FLUSH_INTERVAL_MS);
  window.addEventListener('pagehide', flush);
  window.addEventListener('beforeunload', flush);
}

export function destroyAnalytics() {
  if (flushTimer) clearInterval(flushTimer);
  flush();
  initialized = false;
}

export function track(event: AnalyticsEvent) {
  queue.push(event);
}
