'use client';

import { useEffect, useCallback, useRef } from 'react';
import { initAnalytics, destroyAnalytics, track } from '@/lib/analytics';
import { getOrCreateSessionId, hasSeenDocument, markDocumentSeen } from '@/lib/session';
import type { AnalyticsEvent } from '@/types/analytics';

export function useAnalytics(documentId: string) {
  const sessionIdRef = useRef<string>('');

  useEffect(() => {
    initAnalytics();
    sessionIdRef.current = getOrCreateSessionId();

    const isReturn = hasSeenDocument(documentId);
    markDocumentSeen(documentId);

    const ua = navigator.userAgent;
    const uaClass = /Mobi|Android/i.test(ua)
      ? 'mobile'
      : /Tablet|iPad/i.test(ua)
      ? 'tablet'
      : 'desktop';

    trackEvent({
      event_type: 'session_start',
      scene_index: null,
      payload: { is_return_visit: isReturn, user_agent_class: uaClass },
    });

    trackEvent({
      event_type: 'document_opened',
      scene_index: null,
      payload: { referrer: document.referrer || '' },
    });

    return () => {
      destroyAnalytics();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  const trackEvent = useCallback(
    (partial: Omit<AnalyticsEvent, 'document_id' | 'session_id' | 'client_ts'>) => {
      track({
        ...partial,
        document_id: documentId,
        session_id: sessionIdRef.current,
        client_ts: new Date().toISOString(),
      } as AnalyticsEvent);
    },
    [documentId]
  );

  return { trackEvent };
}
