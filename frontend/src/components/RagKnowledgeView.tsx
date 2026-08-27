'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database, Search, Sparkles, Layers, ArrowDown,
  Cpu, ExternalLink, RefreshCw, CheckCircle2, Shield
} from 'lucide-react';
import { api } from '@/lib/api';
import StatsCounter from './StatsCounter';
import type { Evidence, ResearchRun } from '@/types/research';

interface RagKnowledgeViewProps {
  run: ResearchRun;
}

export default function RagKnowledgeView({ run }: RagKnowledgeViewProps) {
  const [queryInput, setQueryInput] = useState(run.query || '');
  const [isSearching, setIsSearching] = useState(false);
  const [ragData, setRagData] = useState<{ results: Evidence[]; total_chunks: number } | null>(null);
  const [searchedQuery, setSearchedQuery] = useState(run.query || '');

  // Auto-fetch default query retrieval on mount
  useEffect(() => {
    if (run.query && !ragData) {
      setIsSearching(true);
      api.ragSearch(run.query, 6, run.run_id)
        .then((res) => {
          setRagData(res);
          setIsSearching(false);
        })
        .catch(() => setIsSearching(false));
    }
  }, [run.query, run.run_id, ragData]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = queryInput.trim();
    if (!clean) return;

    setIsSearching(true);
    setSearchedQuery(clean);
    try {
      const res = await api.ragSearch(clean, 6, run.run_id);
      setRagData(res);
    } catch (err) {
      console.error('RAG query failed:', err);
    }
    setIsSearching(false);
  };

  return (
    <div className="space-y-6 max-w-3xl animate-fade-in">
      {/* ── Knowledge Base High-Level Stat Stack ─────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="section-kicker">Qdrant Vector Knowledge Space</span>
          <span className="badge-tag badge-teal text-[10px] font-mono">BAAI/bge-small-en-v1.5</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface-raised)]/60 text-center space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-3)] block">
              Indexed Chunks
            </span>
            <span className="mono text-2xl font-bold text-indigo-400">
              <StatsCounter value={run.stats?.chunks_indexed || 0} />
            </span>
          </div>

          <div className="p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface-raised)]/60 text-center space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-3)] block">
              Grounded Sources
            </span>
            <span className="mono text-2xl font-bold text-emerald-400">
              <StatsCounter value={run.stats?.sources_accepted || 0} />
            </span>
          </div>

          <div className="p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface-raised)]/60 text-center space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-3)] block">
              RAG Retrieved Chunks
            </span>
            <span className="mono text-2xl font-bold text-cyan-400">
              <StatsCounter value={run.stats?.chunks_retrieved || 0} />
            </span>
          </div>

          <div className="p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface-raised)]/60 text-center space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-3)] block">
              Total Points in DB
            </span>
            <span className="mono text-2xl font-bold text-purple-400">
              <StatsCounter value={ragData?.total_chunks || run.stats?.chunks_indexed || 0} />
            </span>
          </div>
        </div>
      </div>

      {/* ── Interactive Vector Tester ───────────────────────────── */}
      <form onSubmit={handleSearch} className="space-y-2">
        <span className="section-kicker block">Interactive Vector Retrieval Query</span>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-3)]" />
            <input
              type="text"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Query vector space (e.g. enterprise latency, prompt engineering)..."
              className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-default)] focus:border-indigo-500 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-[var(--text-3)] outline-none transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching || !queryInput.trim()}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-xs font-semibold text-white disabled:opacity-40 transition-all cursor-pointer shadow-md shadow-indigo-600/20"
          >
            {isSearching ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Cpu className="w-3.5 h-3.5" />
            )}
            <span>{isSearching ? 'Querying...' : 'Vector Query'}</span>
          </button>
        </div>
      </form>

      {/* ── Visual Retrieval Moment (Query -> Vector Flow) ────────── */}
      <div className="space-y-4 pt-2">
        {/* Origin Flow Card */}
        <div className="p-3.5 rounded-xl border border-indigo-500/30 bg-indigo-500/5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-md bg-indigo-500/20 text-indigo-400 shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 block">
                Embedding Inquiry Vector
              </span>
              <p className="text-xs text-[var(--text-1)] font-mono truncate">
                &ldquo;{searchedQuery}&rdquo;
              </p>
            </div>
          </div>
          <span className="badge-tag badge-violet text-[10px] font-mono shrink-0">
            Top {ragData?.results?.length || 0} Nearest Chunks
          </span>
        </div>

        {/* Vertical Connecting Pulse Line */}
        <div className="flex justify-center -my-2">
          <div className="w-px h-6 bg-gradient-to-b from-indigo-500 via-cyan-400 to-transparent" />
        </div>

        {/* Retrieved Chunks Stack */}
        {ragData?.results && ragData.results.length > 0 ? (
          <div className="space-y-3">
            {ragData.results.map((evidence, i) => {
              const simScore = evidence.similarity_score;
              const simPercent = (simScore * 100).toFixed(1);

              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.05 }}
                  className="rounded-xl border border-[var(--border-default)] hover:border-indigo-500/40 bg-[var(--bg-surface-raised)]/60 hover:bg-[var(--bg-card)] transition-all p-4 sm:p-5 space-y-3 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className="mono text-xs font-bold text-indigo-400 shrink-0">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-semibold text-white truncate">
                          {evidence.source_title || 'Indexed Passage Chunk'}
                        </h4>
                        {evidence.source_url && (
                          <p className="text-[11px] text-[var(--text-3)] font-mono truncate">
                            {evidence.source_url}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Real Qdrant Cosine Similarity Badge */}
                    <div className="text-right shrink-0">
                      <span className="badge-tag badge-violet font-mono text-[11px] font-semibold">
                        Cosine {simScore.toFixed(4)} ({simPercent}%)
                      </span>
                    </div>
                  </div>

                  {/* Passage Chunk Excerpt */}
                  <p className="text-xs text-[var(--text-2)] leading-relaxed font-mono bg-[var(--bg-canvas)]/80 p-3 rounded-lg border border-[var(--border-subtle)]">
                    {evidence.chunk_text}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-[var(--text-3)] pt-0.5">
                    <span>Source ID: <code className="mono text-[var(--text-2)]">{evidence.source_id || 'corpus'}</code></span>
                    {evidence.source_url?.startsWith('http') && (
                      <a
                        href={evidence.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 hover:text-white transition-colors"
                      >
                        <span>Open Document</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center border border-[var(--border-default)] rounded-xl bg-[var(--bg-surface-raised)]/30 text-xs text-[var(--text-3)]">
            No chunks returned for query. Try a broader search keyword.
          </div>
        )}
      </div>
    </div>
  );
}
