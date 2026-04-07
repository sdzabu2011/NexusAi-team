'use client';
import React, { useEffect, useRef, useState } from 'react';
import MuxPlayer from '@mux/mux-player-react';

export function VideoBackground() {
  const [playbackId, setPlaybackId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/env')
      .then((r) => r.json())
      .then((d) => setPlaybackId(d.muxPlaybackId ?? 'GEpj38bbxKjkAo6Ij3qmxbYeNTQ011TTnl2eH9ftDTFM'))
      .catch(() => setPlaybackId('GEpj38bbxKjkAo6Ij3qmxbYeNTQ011TTnl2eH9ftDTFM'));
  }, []);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-nexus-bg pointer-events-none">
      {/* Mux video */}
      {playbackId && (
        <div
          className="absolute inset-0 transition-opacity duration-1000"
          style={{ opacity: loaded ? 1 : 0 }}
        >
          <MuxPlayer
            playbackId={playbackId}
            muted
            autoPlay
            loop
            playsInline
            onCanPlay={() => setLoaded(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            className="w-full h-full object-cover scale-110"
          />
        </div>
      )}

      {/* Dark overlay layers */}
      <div className="absolute inset-0 bg-nexus-bg/75" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(99,102,241,0.12),transparent)]" />

      {/* Grid pattern */}
      <div className="absolute inset-0 bg-grid opacity-60" />

      {/* Scan line */}
      <div className="scan-overlay" />

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-nexus-bg to-transparent" />
    </div>
  );
}
