'use client';
import { useState, useCallback } from 'react';

interface Props {
  onChange?: (percent: number) => void;
}

export function Divider({ onChange }: Props) {
  const [pos, setPos] = useState(50);
  const startDrag = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const onMove = (ev: MouseEvent) => {
      const parent = (e.currentTarget.parentElement?.parentElement) as HTMLElement;
      const rect = parent.getBoundingClientRect();
      const pct = Math.min(100, Math.max(0, ((ev.clientX - rect.left) / rect.width) * 100));
      setPos(pct);
      onChange?.(pct);
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [onChange]);

  return (
    <div className="absolute inset-y-0" style={{ left: `${pos}%` }}>
      <div className="hairline-teal h-full w-px" />
      <button
        aria-label="Compare divider"
        className="absolute -left-3 top-1/2 -mt-3 h-7 w-7 rounded-full hairline-teal bg-transparent"
        onMouseDown={startDrag}
      />
    </div>
  );
}
