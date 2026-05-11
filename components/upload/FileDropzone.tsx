'use client';

import { useCallback, useState } from 'react';
import { Upload, FileText, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const ACCEPTED_TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
};
const ACCEPTED_EXTENSIONS = ['.pdf', '.pptx', '.docx'];
const MAX_SIZE_MB = 25;

interface FileDropzoneProps {
  onFile: (file: File) => void;
  disabled?: boolean;
}

export function FileDropzone({ onFile, disabled }: FileDropzoneProps) {
  const [dragging, setDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validate = (file: File): string | null => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) return `Unsupported file type. Accepted: ${ACCEPTED_EXTENSIONS.join(', ')}`;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) return `File too large. Max ${MAX_SIZE_MB}MB.`;
    return null;
  };

  const handleFile = useCallback(
    (file: File) => {
      const err = validate(file);
      if (err) { setError(err); return; }
      setError(null);
      setSelectedFile(file);
      onFile(file);
    },
    [onFile]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile, disabled]
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const clear = () => {
    setSelectedFile(null);
    setError(null);
  };

  if (selectedFile) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 border border-neutral-200 rounded-[4px] bg-neutral-50">
        <FileText className="h-5 w-5 text-neutral-400 shrink-0" />
        <span className="text-sm text-neutral-700 truncate flex-1">{selectedFile.name}</span>
        <span className="text-xs text-neutral-400 shrink-0">
          {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
        </span>
        <button
          onClick={clear}
          disabled={disabled}
          className="text-neutral-400 hover:text-neutral-700 disabled:opacity-40 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'flex flex-col items-center justify-center gap-3 px-6 py-10 border-2 border-dashed rounded-[4px] cursor-pointer transition-colors',
          dragging && !disabled ? 'border-neutral-400 bg-neutral-50' : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <Upload className="h-6 w-6 text-neutral-400" />
        <div className="text-center">
          <p className="text-sm font-medium text-neutral-700">Drop file here or click to browse</p>
          <p className="text-xs text-neutral-400 mt-1">PDF, PPTX, DOCX — max {MAX_SIZE_MB}MB</p>
        </div>
        <input
          type="file"
          className="sr-only"
          accept={Object.keys(ACCEPTED_TYPES).join(',')}
          onChange={onInputChange}
          disabled={disabled}
        />
      </label>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
