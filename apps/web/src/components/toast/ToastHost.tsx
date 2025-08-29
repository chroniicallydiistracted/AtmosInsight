'use client';
import { useState } from 'react';

export function ToastHost() {
  const [toasts] = useState<string[]>([]);
  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2">
      {toasts.map((t, i) => (
        <div key={i} className="card p-2">{t}</div>
      ))}
    </div>
  );
}
