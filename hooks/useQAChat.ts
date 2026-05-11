'use client';

import { useState, useCallback, useRef } from 'react';
import type { QAMessage } from '@/types/qa';

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

        if (!res.ok || !res.body) throw new Error('Failed to get response');

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') break;
              fullText += data;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsg.id ? { ...m, content: fullText } : m
                )
              );
            }
          }
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id ? { ...m, is_streaming: false } : m
          )
        );
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsg.id
                ? { ...m, content: 'Something went wrong. Please try again.', is_streaming: false }
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
