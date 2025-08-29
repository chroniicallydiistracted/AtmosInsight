'use client';
import { useState } from 'react';

export function CommandMenu() {
  const [open] = useState(false);
  if (!open) return null;
  return <div className="panel w-[720px] p-4">Command</div>;
}
