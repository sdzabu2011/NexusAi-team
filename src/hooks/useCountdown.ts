'use client';
import { useEffect, useState } from 'react';
import { useModelStore } from '@/store/modelStore';

export function useCountdown() {
  const lastSync = useModelStore((s) => s.lastSync);
  const [secs, setSecs] = useState(60);
  useEffect(() => { setSecs(60); }, [lastSync]);
  useEffect(() => {
    const id = setInterval(() => setSecs((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);
  return secs;
}
