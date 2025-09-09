"use client";
import React, { useEffect, useRef, useState } from "react";

export function TimelineBar() {
  const sliderRef = useRef<HTMLInputElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (!playing) {
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = null;
      return;
    }
    const step = () => {
      const el = sliderRef.current;
      if (!el) return;
      const v = (parseInt(el.value || "0") + 1) % 101;
      el.value = String(v);
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [playing]);

  return (
    <div className="absolute left-4 right-4 bottom-4 z-20">
      <div className="glass rounded-xl p-4">
        <div className="flex items-center space-x-4">
          <button className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 smooth-transition flex items-center justify-center" onClick={() => setPlaying((p) => !p)}>
            {playing ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" /></svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.5 3.5a1 1 0 011.58-.814l9 6.5a1 1 0 010 1.628l-9 6.5A1 1 0 014.5 16.5v-13z" clipRule="evenodd" /></svg>
            )}
          </button>
          <div className="flex-1">
            <input ref={sliderRef} type="range" min={0} max={100} defaultValue={0} className="w-full" />
          </div>
          <div className="flex items-center space-x-2 text-xs text-gray-400">
            <span>UTC</span>
            <span className="px-2 py-1 rounded bg-white/5">T-00:00</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TimelineBar;

