'use client';

import { useState, useCallback, useRef } from 'react';
import type { QAMessage, QACitation } from '@/types/qa';

export function useQAChat(documentId: string, sessionId: string) {
  const [messages, setMessages] = useState<QAMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (question: string, sceneIndex: number, sceneTitle: string) => {
      if (isLoading || !question.trim()) return;

      abortRef.current?.abort();
      const abort = new AbortController();
      abortRef.current = abort;

      const userMsg: QAMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: question,
        created_at: new Date().toISOString(),
      };

      const assistantMsg: QAMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        citations: [],
        is_streaming: true,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsLoading(true);

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ document_id: documentId, question, session_id: sessionId, scene_index: sceneIndex, scene_title: sceneTitle }),
          signal: abort.signal,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Request failed' }));
          throw new Error(err.error ?? 'Request failed');
        }

        const data: { answer: string; citations: QACitation[] } = await res.json();

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id
              ? { ...m, content: data.answer, citations: data.citations ?? [], is_streaming: false }
              : m
          )
        );
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsg.id
                ? { ...m, content: 'Something went wrong. Please try again.', citations: [], is_streaming: false }
                : m
            )
          );
        }
      } finally {
        setIsLoading(false);
      }
    },
    [documentId, sessionId, isLoading]
  );

  const clearMessages = useCallback(() => setMessages([]), []);

  return { messages, isLoading, sendMessage, clearMessages };
}
