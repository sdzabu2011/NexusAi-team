import React from 'react';
import { useAppStore } from '@/store/appStore';
import { useModelStore } from '@/store/modelStore';

export function StatsBar() {
  const { generatedFiles, codeLog, progress } = useAppStore();
  const { count } = useModelStore();

  const stats = [
    { label: 'Files',   value: generatedFiles.length, color: '#60a5fa' },
    { label: 'Actions', value: codeLog.length,         color: '#c084fc' },
    { label: 'Models',  value: count,                  color: '#00d4ff' },
    { label: 'Progress',value: `${progress}%`,         color: '#4ade80' },
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {stats.map((s) => (
        <div key={s.label} className="flex flex-col items-center px-3 py-2 rounded-xl bg-white/[0.03] border border-white/5">
          <span className="text-lg font-title font-black" style={{ color: s.color }}>{s.value}</span>
          <span className="text-[9px] text-slate-600 font-mono tracking-widest uppercase">{s.label}</span>
        </div>
      ))}
    </div>
  );
}
