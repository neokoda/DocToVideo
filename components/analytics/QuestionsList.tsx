'use client';

import type { QuestionFrequency } from '@/types/analytics';

interface QuestionsListProps {
  questions: QuestionFrequency[];
}

export function QuestionsList({ questions }: QuestionsListProps) {
  if (questions.length === 0) return <p className="text-xs text-neutral-400">No questions asked yet.</p>;

  return (
    <ol className="space-y-2">
      {questions.slice(0, 10).map((q, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="text-xs text-neutral-400 w-5 shrink-0 text-right mt-0.5">{i + 1}.</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-neutral-700 leading-snug">{q.question}</p>
            <p className="text-xs text-neutral-400 mt-0.5">
              Asked {q.count} {q.count === 1 ? 'time' : 'times'}
              {q.scene_index !== null ? ` · Scene ${q.scene_index + 1}` : ''}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
