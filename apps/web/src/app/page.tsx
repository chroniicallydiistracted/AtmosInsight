"use client";
import React, { useState } from 'react';
import { Navigation } from '@/components/redesign/Navigation';
import { LayersPanel } from '@/components/redesign/LayersPanel';
import { InfoPanel } from '@/components/redesign/InfoPanel';
import { MapCanvas } from '@/components/redesign/MapCanvas';
import { TimelineBar } from '@/components/redesign/TimelineBar';

export default function Home() {
  const [loc, setLoc] = useState<{ lat: number; lon: number }>();
  return (
    <main className="relative w-full h-dvh overflow-hidden bg-[#0f172a] text-[var(--text-primary)]">
      <MapCanvas onClickLocation={(p) => setLoc({ lat: p.lat, lon: p.lon })} />
      <Navigation />
      <LayersPanel onToggle={(id, active) => { /* TODO: add AWS S3/Lambda-backed layers */ }} />
      <InfoPanel location={loc} />
      <TimelineBar />
      <div className="absolute bottom-0 left-0 right-0 z-20 p-2 text-[11px] text-gray-400 flex justify-between pointer-events-none">
        <span className="pointer-events-auto glass rounded px-2 py-1">AWS • S3-backed providers • Lambda proxy</span>
        {loc && <span className="glass rounded px-2 py-1 pointer-events-auto">{loc.lat.toFixed(4)}, {loc.lon.toFixed(4)}</span>}
      </div>
    </main>
  );
}

