'use client';

import React, { useCallback, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, X, FileCode2, Image as ImageIcon,
  FileArchive, File, CheckCircle,
} from 'lucide-react';

interface UploadedFile {
  file:    File;
  preview?: string;
  type:    'image' | 'code' | 'zip' | 'other';
}

interface FileUploadProps {
  onUpload:  (file: UploadedFile) => void;
  accept?:   string;
  maxSizeMB?: number;
  className?: string;
}

function getFileType(file: File): UploadedFile['type'] {
  const name = file.name.toLowerCase();
  if (name.match(/\.(png|jpg|jpeg|gif|webp|svg|bmp)$/)) return 'image';
  if (name.endsWith('.zip')) return 'zip';
  if (name.match(/\.(ts|tsx|js|jsx|py|rs|go|java|cs|cpp|c|rb|php|lua|luau|sql|yaml|yml|json|toml|md|txt|sh|html|css|scss|prisma|graphql)$/)) return 'code';
  return 'other';
}

const TYPE_ICONS = {
  image: ImageIcon,
  code:  FileCode2,
  zip:   FileArchive,
  other: File,
};

const TYPE_COLORS = {
  image: '#f472b6',
  code:  '#818cf8',
  zip:   '#fb923c',
  other: '#64748b',
};

export function FileUpload({
  onUpload,
  accept = '*/*',
  maxSizeMB = 10,
  className = '',
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploaded,   setUploaded]   = useState<UploadedFile | null>(null);
  const [error,      setError]      = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File) => {
    setError('');

    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`Fayl ${maxSizeMB}MB dan katta bo'lmasin`);
      return;
    }

    const type = getFileType(file);
    const uploadedFile: UploadedFile = { file, type };

    if (type === 'image') {
      const reader = new FileReader();
      reader.onload = (e) => {
        uploadedFile.preview = e.target?.result as string;
        setUploaded(uploadedFile);
        onUpload(uploadedFile);
      };
      reader.readAsDataURL(file);
    } else {
      setUploaded(uploadedFile);
      onUpload(uploadedFile);
    }
  }, [maxSizeMB, onUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const clear = useCallback(() => {
    setUploaded(null);
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  if (uploaded) {
    const Icon  = TYPE_ICONS[uploaded.type];
    const color = TYPE_COLORS[uploaded.type];

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`relative rounded-xl border p-3 flex items-center gap-3 ${className}`}
        style={{ borderColor: color + '40', background: color + '10' }}
      >
        {uploaded.type === 'image' && uploaded.preview ? (
          <img
            src={uploaded.preview}
            alt="preview"
            className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
          />
        ) : (
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: color + '20' }}
          >
            <Icon className="w-6 h-6" style={{ color }} />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-xs font-mono text-slate-300 truncate">
            {uploaded.file.name}
          </p>
          <p className="text-[10px] font-mono text-slate-600">
            {(uploaded.file.size / 1024).toFixed(1)} KB · {uploaded.type}
          </p>
        </div>

        <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />

        <button
          onClick={clear}
          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-800 border border-white/20 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      </motion.div>
    );
  }

  return (
    <div className={className}>
      <motion.div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        animate={{
          borderColor: isDragging ? '#818cf8' : 'rgba(255,255,255,0.1)',
          background:  isDragging ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.02)',
        }}
        className="rounded-xl border-2 border-dashed p-4 cursor-pointer transition-colors text-center"
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
        />

        <AnimatePresence mode="wait">
          {isDragging ? (
            <motion.div
              key="drag"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Upload className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
              <p className="text-xs font-mono text-indigo-400">
                Tashlang!
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Upload className="w-6 h-6 text-slate-600 mx-auto mb-2" />
              <p className="text-[11px] font-mono text-slate-500">
                Drag & drop yoki bosing
              </p>
              <p className="text-[9px] font-mono text-slate-700 mt-1">
                Rasm, kod, ZIP · max {maxSizeMB}MB
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {error && (
        <p className="text-[10px] font-mono text-red-400 mt-1 px-1">
          ⚠ {error}
        </p>
      )}
    </div>
  );
}