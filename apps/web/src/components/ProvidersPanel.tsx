'use client';
import React, { useEffect, useMemo, useState } from 'react';

interface Provider {
  id: string;
  name: string;
  category: string;
  access: 's3';
  s3: { bucket: string; region: string; requesterPays: boolean; prefixExamples?: string[] | null };
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
  const [keyCount, setKeyCount] = useState<number | null>(null);
  const [isTruncated, setIsTruncated] = useState<boolean | null>(null);
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [respHeaders, setRespHeaders] = useState<{ providerId?: string; costNote?: string; cacheControl?: string }>({});

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
    const res = await fetch(`${api}/api/providers`);
    const data = await res.json();
    const all = Array.isArray(data?.providers) ? data.providers : [];
    const onlyS3 = (all as unknown[]).filter((p): p is Provider => {
      const pp = p as Partial<Provider> & { s3?: Partial<Provider['s3']> };
      return !!pp && pp.access === 's3' && !!pp.s3 && typeof pp.s3.bucket === 'string' && typeof pp.id === 'string' && typeof pp.name === 'string' && typeof pp.category === 'string';
    });
    if (!cancelled) setProviders(onlyS3);
      } catch (e) {
        if (!cancelled) setError(String(e));
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [api]);

  async function listObjects(p: Provider, px: string, opts?: { continuationToken?: string }) {
    setLoading(true);
    setError(null);
    setXml('');
    setKeyCount(null);
    setIsTruncated(null);
    setNextToken(null);
    setRespHeaders({});
    try {
      const url = new URL(`${api}/api/s3/${encodeURIComponent(p.id)}/list`, typeof window === 'undefined' ? 'http://localhost' : window.location.href);
      url.searchParams.set('prefix', px);
      if (opts?.continuationToken) url.searchParams.set('continuation-token', opts.continuationToken);
      const res = await fetch(url.toString());
      const text = await res.text();
      // surface headers
      setRespHeaders({
        providerId: res.headers.get('x-provider-id') || undefined,
        costNote: res.headers.get('x-cost-note') || undefined,
        cacheControl: res.headers.get('cache-control') || undefined,
      });
      // parse a few fields from XML
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'application/xml');
        const kc = doc.querySelector('KeyCount');
        const it = doc.querySelector('IsTruncated');
        const nt = doc.querySelector('NextContinuationToken');
        if (kc?.textContent) setKeyCount(Number(kc.textContent));
        if (it?.textContent) setIsTruncated(it.textContent.trim().toLowerCase() === 'true');
        if (nt?.textContent) setNextToken(nt.textContent.trim());
      } catch {}
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
          <h2 data-testid="providers-header" className="text-sm font-semibold">S3 Providers</h2>
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
        <div className="text-xs text-gray-400">{p.category} • {p.s3?.bucket}</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {p.costNote && (
                    <span className={`${p.costNote.includes('cross') ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/15 text-emerald-300'} text-[10px] px-2 py-[2px] rounded border border-white/10`}>{p.costNote}</span>
                  )}
                  {p.s3?.requesterPays && (
                    <span className="bg-pink-500/20 text-pink-300 text-[10px] px-2 py-[2px] rounded border border-white/10">requester-pays</span>
                  )}
                </div>
              </button>
            ))}
          </div>
          <div className="p-3 flex flex-col">
            {active ? (
              <>
                <div className="mb-2">
                  <div className="text-sm font-medium">{active.name}</div>
                  <div className="text-xs text-gray-400">Bucket: {active.s3.bucket} • Region: {active.s3.region}</div>
                  <div className="mt-1 flex gap-2">
                    {active.costNote && (
                      <span className={`${active.costNote.includes('cross') ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/15 text-emerald-300'} text-[10px] px-2 py-[2px] rounded border border-white/10`}>{active.costNote}</span>
                    )}
                    {active.s3.requesterPays && (
                      <span className="bg-pink-500/20 text-pink-300 text-[10px] px-2 py-[2px] rounded border border-white/10">requester-pays</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    value={prefix}
                    onChange={e => setPrefix(e.target.value)}
                    placeholder="Prefix (e.g., ABI-L2-CMIPC/2025/251/)"
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
                {(respHeaders.providerId || respHeaders.costNote || respHeaders.cacheControl) && (
                  <div className="text-[11px] text-gray-300/90 mb-2 flex flex-wrap gap-2">
                    {respHeaders.providerId && <span className="px-2 py-[2px] rounded bg-white/5 border border-white/10">id: {respHeaders.providerId}</span>}
                    {respHeaders.costNote && <span className="px-2 py-[2px] rounded bg-white/5 border border-white/10">cost: {respHeaders.costNote}</span>}
                    {respHeaders.cacheControl && <span className="px-2 py-[2px] rounded bg-white/5 border border-white/10">cache: {respHeaders.cacheControl}</span>}
                  </div>
                )}
                {(keyCount !== null || isTruncated !== null) && (
                  <div className="text-[11px] text-gray-300/80 mb-2 flex items-center gap-3">
                    {keyCount !== null && <span>Keys: {keyCount}</span>}
                    {isTruncated !== null && <span>Truncated: {isTruncated ? 'yes' : 'no'}</span>}
                    {isTruncated && nextToken && (
                      <button
                        onClick={() => listObjects(active, prefix, { continuationToken: nextToken })}
                        className="px-2 py-[2px] rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-[11px]"
                      >
                        Next page
                      </button>
                    )}
                  </div>
                )}
                {loading && <div className="text-xs text-gray-400">Loading…</div>}
                {error && <div className="text-xs text-red-400">{error}</div>}
                {!loading && active?.s3?.prefixExamples === null && (
                  <div className="text-[11px] text-yellow-300/90 bg-yellow-500/10 border border-yellow-500/20 rounded p-2 mb-2">
                    Listing may be disabled for this bucket. Enter a known object key or use an external index.
                  </div>
                )}
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
