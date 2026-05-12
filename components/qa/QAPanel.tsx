'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QAMessage } from './QAMessage';
import { QAInput } from './QAInput';
import type { useQAChat } from '@/hooks/useQAChat';

interface QAPanelProps {
  open: boolean;
  onClose: () => void;
  qa: ReturnType<typeof useQAChat>;
  currentSceneIndex: number;
  currentSceneTitle: string;
  onQuestionAsked: (question: string) => void;
}

export function QAPanel({ open, onClose, qa, currentSceneIndex, currentSceneTitle, onQuestionAsked }: QAPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [qa.messages]);

  const handleSubmit = (question: string) => {
    onQuestionAsked(question);
    qa.sendMessage(question, currentSceneIndex, currentSceneTitle);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="absolute right-0 top-0 bottom-0 w-80 border-l border-neutral-100 bg-white flex flex-col z-20 shadow-lg"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 shrink-0">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-neutral-400" />
              <span className="text-sm font-medium text-neutral-950">Document Assistant</span>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {qa.messages.length === 0 && (
              <div className="text-center py-8">
                <Bot className="h-8 w-8 text-neutral-200 mx-auto mb-3" />
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Ask any question about this document.<br />
                  I'll only answer from the uploaded content.
                </p>
              </div>
            )}
            {qa.messages.map((msg) => (
              <QAMessage key={msg.id} message={msg} />
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-neutral-100 shrink-0">
            <QAInput onSubmit={handleSubmit} disabled={qa.isLoading} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
