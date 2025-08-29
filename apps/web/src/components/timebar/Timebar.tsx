'use client';
import { useViewStore } from '../../../lib/state/viewStore';

export function Timebar() {
  const timeISO = useViewStore((s) => s.timeISO);
  return (
    <div className="panel flex h-14 items-center justify-center text-xs">
      <span>{timeISO}</span>
    </div>
  );
}
