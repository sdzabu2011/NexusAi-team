'use client';
import { useEffect, useRef } from 'react';
import { useModelStore } from '@/store/modelStore';

export function useModels() {
  const { models, count, lastSync, isFetching, setModels, setFetching } = useModelStore();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchModels = async () => {
    setFetching(true);
    try {
      const res = await fetch('/api/models');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setModels(data.models ?? []);
    } catch (err) {
      console.error('[useModels]', err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchModels();
    timerRef.current = setInterval(fetchModels, 60_000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { models, count, lastSync, isFetching };
}
