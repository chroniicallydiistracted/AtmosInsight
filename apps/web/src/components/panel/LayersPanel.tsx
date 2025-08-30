'use client';
import { useState } from 'react';

export function LayersPanel() {
  const [search, setSearch] = useState('');
  return (
    <div className="panel w-64 overflow-y-auto p-4 text-sm">
      <input
        className="hairline w-full rounded px-2 py-1 focus:outline-none focus:hairline-teal"
        placeholder="Search layers"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      <div className="mt-4 opacity-70">No layers</div>
    </div>
  );
}
