"use client";

import React, { useEffect, useState } from 'react';
import MuxPlayer from '@mux/mux-player-react';

export default function VideoBackground() {
  const [playbackId, setPlaybackId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/env').then(res => res.json()).then(data => {
      setPlaybackId(data.muxPlaybackId);
    }).catch(e => {
      setPlaybackId('GEpj38bbxKjkAo6Ij3qmxbYeNTQ011TTnl2eH9ftDTFM');
    });
  }, []);

  if (!playbackId) return <div className="fixed inset-0 z-[-1] bg-black" />;

  return (
    <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden bg-black">
      <MuxPlayer
        playbackId={playbackId}
        metadata={{ video_title: 'Nexus AI Background' }}
        muted
        autoPlay
        loop
        className="object-cover w-full h-full absolute scale-150 transform-gpu opacity-40 blur-[4px] mix-blend-screen"
        style={{ width: '100vw', height: '100vh', objectFit: 'cover' }}
      />
      {/* Vignette overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-black/50 to-black pointer-events-none" />
      <div className="absolute inset-0 bg-blue-900/10 pointer-events-none mix-blend-overlay" />
    </div>
  );
}
