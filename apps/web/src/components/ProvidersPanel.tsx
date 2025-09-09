'use client';
import React, { useEffect, useMemo, useState } from 'react';

interface Provider {
  id: string;
  name: string;
  category: string;
  access: 's3';
  s3: { bucket: string; region: string; requesterPays: boolean; prefixExamples?: string[] };
  attribution?: string;
  costNote?: string;
}

export function ProvidersPanel({ onClose }: { onClose?: () => void }) {
  const apiBase = useMemo(() => process.env.NEXT_PUBLIC_API_BASE_URL || '', []);
  const api = useMemo(() => (apiBase ? `${apiBase}` : ''), [apiBase]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [active, setActive] = useState<Provider | null>(null);
  const [prefix, setPrefix] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [xml, setXml] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
  const res = await fetch(`${api}/api/providers`);
        const data = await res.json();
        if (!cancelled) setProviders(data.providers || []);
      } catch (e) {
        if (!cancelled) setError(String(e));
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [apiBase]);

  async function listObjects(p: Provider, px: string) {
    setLoading(true);
    setError(null);
    setXml('');
    try {
  const res = await fetch(`${api}/api/s3/${encodeURIComponent(p.id)}/list?prefix=${encodeURIComponent(px)}`);
      const text = await res.text();
      setXml(text);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <aside className="absolute left-4 top-24 bottom-24 w-[28rem] z-30 animate-slide-in-left">
      <div className="glass rounded-xl h-full flex flex-col">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-sm font-semibold">S3 Providers</h2>
          <button onClick={onClose} className="px-2 py-1 rounded hairline hover:bg-white/10 text-xs">Close</button>
        </div>
        <div className="flex-1 grid grid-cols-2 gap-0">
          <div className="border-r border-white/10 p-3 overflow-y-auto custom-scrollbar">
            {providers.map(p => (
              <button
                key={p.id}
                onClick={() => {
                  setActive(p);
                  const first = p.s3.prefixExamples?.[0] || '';
                  setPrefix(first);
                  if (first) listObjects(p, first);
                }}
                className={`w-full text-left p-2 rounded hover:bg-white/10 mb-2 ${active?.id === p.id ? 'bg-white/10' : ''}`}
              >
                <div className="text-sm font-medium">{p.name}</div>
                <div className="text-xs text-gray-400">{p.category} • {p.s3.bucket}</div>
              </button>
            ))}
          </div>
          <div className="p-3 flex flex-col">
            {active ? (
              <>
                <div className="mb-2">
                  <div className="text-sm font-medium">{active.name}</div>
                  <div className="text-xs text-gray-400">Bucket: {active.s3.bucket} • Region: {active.s3.region}</div>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    value={prefix}
                    onChange={e => setPrefix(e.target.value)}
                    placeholder="Prefix (e.g., ABI-L2-CMIPC/2025/09/08/)"
                    className="flex-1 px-3 py-2 rounded bg-white/5 border border-white/10 text-sm focus:outline-none"
                  />
                  <button
                    disabled={!prefix}
                    onClick={() => listObjects(active, prefix)}
                    className="px-3 py-2 rounded bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-sm disabled:opacity-50"
                  >
                    List
                  </button>
                </div>
                {loading && <div className="text-xs text-gray-400">Loading…</div>}
                {error && <div className="text-xs text-red-400">{error}</div>}
                {!loading && xml && (
                  <pre className="flex-1 overflow-auto custom-scrollbar text-xs bg-black/20 rounded p-2 whitespace-pre-wrap break-words">{xml}</pre>
                )}
              </>
            ) : (
              <div className="text-xs text-gray-400">Select a provider to view objects.</div>
            )}
          </div>
        </div>
        <div className="p-3 border-t border-white/10 text-[11px] text-gray-400">
          Tip: Use a provider’s example prefix to quickly enumerate the latest day/hour folders.
        </div>
      </div>
    </aside>
  );
}

export default ProvidersPanel;
