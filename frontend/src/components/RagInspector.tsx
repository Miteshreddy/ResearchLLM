'use client';

import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { api } from '@/lib/api';
import type { Evidence, ResearchRun } from '@/types/research';

export default function RagInspector({ run }: { run: ResearchRun }) {
  const [query, setQuery] = useState(run.plan?.subquestions[0]?.search_queries[0] || run.query);
  const [results, setResults] = useState<Evidence[]>([]);
  const [totalChunks, setTotalChunks] = useState(run.stats.chunks_indexed);
  const [isLoading, setIsLoading] = useState(false);

  const fetchResults = async (nextQuery: string) => {
    setIsLoading(true);
    try {
      const response = await api.ragSearch(nextQuery, 5, run.run_id);
      setResults(response.results);
      setTotalChunks(response.total_chunks);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchResults(query);
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-[34px] border border-white/8 bg-[rgba(10,12,17,0.72)] p-6 sm:p-8">
        <div className="eyebrow">Knowledge</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
            <div className="mono text-[11px] uppercase tracking-[0.14em] text-[var(--text-faint)]">Chunks</div>
            <div className="mt-3 text-2xl text-[var(--text-strong)]">{totalChunks}</div>
          </div>
          <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
            <div className="mono text-[11px] uppercase tracking-[0.14em] text-[var(--text-faint)]">Sources</div>
            <div className="mt-3 text-2xl text-[var(--text-strong)]">{run.sources.length}</div>
          </div>
          <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
            <div className="mono text-[11px] uppercase tracking-[0.14em] text-[var(--text-faint)]">Retrieved</div>
            <div className="mt-3 text-2xl text-[var(--text-strong)]">{results.length}</div>
          </div>
        </div>

        <div className="mt-6 rounded-[28px] border border-white/8 bg-white/[0.02] p-5">
          <label htmlFor="rag-query" className="mb-3 block text-sm text-[var(--text-muted)]">
            Retrieval query
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="rag-query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void fetchResults(query);
                }
              }}
              className="focus-ring w-full rounded-2xl border border-white/10 bg-[var(--bg-app-alt)] px-4 py-3 text-base text-[var(--text-main)] outline-none"
            />
            <button
              type="button"
              onClick={() => void fetchResults(query)}
              className="focus-ring inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm text-[var(--text-main)] transition hover:bg-white/[0.08]"
            >
              <Search className="h-4 w-4" />
              <span>{isLoading ? 'Searching' : 'Run retrieval'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="rounded-[30px] border border-white/8 bg-white/[0.03] p-5">
          <div className="eyebrow">Relationship</div>
          <div className="mt-4 rounded-[24px] border border-white/8 bg-[rgba(8,10,14,0.8)] p-4">
            <div className="text-sm text-[var(--text-strong)]">Query</div>
            <div className="mt-2 rounded-2xl border border-[rgba(111,124,255,0.28)] bg-[var(--accent-soft)] px-3 py-3 text-sm text-[var(--text-main)]">
              {query}
            </div>
            <div className="mt-4 space-y-3">
              {results.slice(0, 3).map((result, index) => (
                <div key={`${result.source_id}-${index}`} className="relative pl-6">
                  <div className="absolute left-2 top-0 h-full w-px bg-white/10" />
                  <div className="absolute left-0 top-3 h-2.5 w-2.5 rounded-full bg-[var(--accent-strong)]" />
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3 text-sm text-[var(--text-muted)]">
                    {result.source_title || 'Evidence'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-[30px] border border-white/8 bg-[rgba(10,12,17,0.72)]">
          <div className="border-b border-white/8 px-5 py-5">
            <div className="eyebrow">Retrieved chunks</div>
          </div>
          <div className="divide-y divide-white/8">
            {results.length ? results.map((result, index) => (
              <div key={`${result.source_id}-${index}`} className="px-5 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="mono text-[11px] uppercase tracking-[0.14em] text-[var(--text-faint)]">
                      {String(index + 1).padStart(2, '0')}
                    </div>
                    <div className="mt-2 text-base text-[var(--text-strong)]">{result.source_title || 'Untitled chunk'}</div>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-sm text-[var(--text-muted)]">
                    Similarity {result.similarity_score.toFixed(2)}
                  </div>
                </div>
                <div className="mt-4 text-base leading-8 text-[var(--text-muted)]">{result.chunk_text}</div>
              </div>
            )) : (
              <div className="px-5 py-8 text-base text-[var(--text-muted)]">
                No retrieval results yet. Run a query to inspect the indexed knowledge.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
