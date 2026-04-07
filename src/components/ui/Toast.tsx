'use client';
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast { id: string; message: string; type: ToastType; }

let addToastFn: ((msg: string, type?: ToastType) => void) | null = null;

export function toast(message: string, type: ToastType = 'info') {
  addToastFn?.(message, type);
}

export function ToastProvider() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    addToastFn = (message, type = 'info') => {
      const id = Math.random().toString(36).slice(2);
      setToasts((t) => [...t, { id, message, type }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
    };
    return () => { addToastFn = null; };
  }, []);

  const icons = { success: CheckCircle, error: AlertCircle, info: Info };
  const colors = { success: 'text-emerald-400', error: 'text-red-400', info: 'text-cyan-400' };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => {
          const Icon = icons[t.type];
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}
              className="flex items-center gap-3 glass px-4 py-3 rounded-xl shadow-xl text-sm"
            >
              <Icon className={`w-4 h-4 ${colors[t.type]}`} />
              <span className="text-white">{t.message}</span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
