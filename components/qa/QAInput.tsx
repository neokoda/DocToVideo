'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QAInputProps {
  onSubmit: (question: string) => void;
  disabled?: boolean;
}

export function QAInput({ onSubmit, disabled }: QAInputProps) {
  const [value, setValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    if (!q || disabled) return;
    onSubmit(q);
    setValue('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Ask about this document…"
        disabled={disabled}
        className="flex-1 text-sm px-3 py-2 border border-neutral-200 rounded-[4px] bg-white placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 disabled:opacity-50"
      />
      <Button type="submit" size="icon-sm" disabled={disabled || !value.trim()}>
        <Send className="h-3.5 w-3.5" />
      </Button>
    </form>
  );
}
