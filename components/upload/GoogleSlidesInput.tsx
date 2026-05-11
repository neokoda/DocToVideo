'use client';

import { useState } from 'react';
import { Link } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface GoogleSlidesInputProps {
  onUrl: (url: string) => void;
  disabled?: boolean;
}

const SLIDES_PATTERN = /^https:\/\/docs\.google\.com\/presentation\//;

export function GoogleSlidesInput({ onUrl, disabled }: GoogleSlidesInputProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.trim();
    setValue(v);
    if (!v) { setError(null); return; }
    if (!SLIDES_PATTERN.test(v)) {
      setError('Must be a Google Slides URL (docs.google.com/presentation/...)');
    } else {
      setError(null);
      onUrl(v);
    }
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
        <Input
          type="url"
          placeholder="https://docs.google.com/presentation/d/..."
          value={value}
          onChange={handleChange}
          disabled={disabled}
          className="pl-9"
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
