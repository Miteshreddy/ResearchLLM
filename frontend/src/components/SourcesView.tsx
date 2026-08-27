'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe, FileText, Link as LinkIcon, ExternalLink,
  ChevronDown, ChevronUp, CheckCircle2, XCircle, Info,
  Search, Shield, ArrowRight
} from 'lucide-react';
import type { Source, SourceEvaluation } from '@/types/research';

interface SourcesViewProps {
  sources: Source[];
  evaluations?: SourceEvaluation[];
  onNavigateToEvidence?: (sourceId: string) => void;
}

export function SourceBadge({ source }: { source: Source }) {
  const format = source.document_format?.toUpperCase();
  const stype = source.source_type?.toLowerCase() || 'web';

  if (stype === 'document' || format === 'PDF' || format === 'DOCX' || format === 'TXT' || format === 'MD' || format === 'CSV') {
    return <span className="badge-tag badge-purple text-[10px] font-mono">DOC: {format || 'FILE'}</span>;
  }
  if (stype === 'url' || format === 'URL') {
    return <span className="badge-tag badge-teal text-[10px] font-mono">DIRECT URL</span>;
  }
  if (stype === 'academic') return <span className="badge-tag badge-violet text-[10px] font-mono">ACADEMIC</span>;
  if (stype === 'official_docs' || stype === 'official') return <span className="badge-tag badge-teal text-[10px] font-mono">OFFICIAL DOCS</span>;
  if (stype === 'government') return <span className="badge-tag badge-green text-[10px] font-mono">GOVERNMENT</span>;
  if (stype === 'news') return <span className="badge-tag badge-amber text-[10px] font-mono">NEWS</span>;
  return <span className="badge-tag badge-neutral text-[10px] font-mono">WEB</span>;
}

export default function SourcesView({
  sources,
  evaluations,
  onNavigateToEvidence,
}: SourcesViewProps) {
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());

  const evalMap = useMemo(() => {
    const map = new Map<string, SourceEvaluation>();
    evaluations?.forEach((e) => map.set(e.source_id, e));
    return map;
  }, [evaluations]);

  // Derive available filter types from actual data
  const filterOptions = useMemo(() => {
    const types = new Set<string>(['all']);
    sources?.forEach((s) => {
      const st = s.source_type?.toLowerCase() || 'web';
      if (st === 'document' || s.document_format) types.add('documents');
      else if (st === 'url') types.add('urls');
      else if (st === 'academic') types.add('academic');
      else if (st === 'official_docs' || st === 'official') types.add('official');
      else if (st === 'news') types.add('news');
      else types.add('web');
    });

    const labels: Record<string, string> = {
      all: 'All Sources',
      web: 'Web Discovery',
      documents: 'Documents',
      urls: 'Custom URLs',
      academic: 'Academic',
      official: 'Official Docs',
      news: 'News',
    };

    return Array.from(types).map((t) => ({
      value: t,
      label: labels[t] || t.toUpperCase(),
    }));
  }, [sources]);

  // Filter sources
  const filteredSources = useMemo(() => {
    if (!sources) return [];
    if (activeFilter === 'all') return sources;
    return sources.filter((s) => {
      const st = s.source_type?.toLowerCase() || 'web';
      if (activeFilter === 'documents') return st === 'document' || Boolean(s.document_format);
      if (activeFilter === 'urls') return st === 'url';
      if (activeFilter === 'academic') return st === 'academic';
      if (activeFilter === 'official') return st === 'official' || st === 'official_docs';
      if (activeFilter === 'news') return st === 'news';
      if (activeFilter === 'web') return st === 'web';
      return true;
    });
  }, [sources, activeFilter]);

  const toggleExpand = (sourceId: string) => {
    setExpandedSources((prev) => {
      const next = new Set(prev);
      if (next.has(sourceId)) next.delete(sourceId);
      else next.add(sourceId);
      return next;
    });
  };

  if (!sources || sources.length === 0) {
    return (
      <div className="p-12 text-center border border-[var(--border-default)] rounded-2xl bg-[var(--bg-surface-raised)]/30 space-y-2">
        <Globe className="w-8 h-8 mx-auto text-[var(--text-3)] opacity-60" />
        <h3 className="text-sm font-semibold text-[var(--text-1)]">No Sources Ingested Yet</h3>
        <p className="text-xs text-[var(--text-3)] max-w-sm mx-auto">
          Sources will populate automatically as the Discovery and Extraction agents execute.
        </p>
      </div>
    );
  }

  const acceptedCount = sources.filter((s) => s.extraction_success).length;

  return (
    <div className="space-y-4 max-w-3xl">
      {/* ── Header & Filter Row ──────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[var(--border-default)]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-[var(--text-1)]">
              Processed Evidence Sources
            </h2>
            <span className="badge-tag badge-green font-mono text-xs">
              {acceptedCount} Ingested
            </span>
          </div>
          <p className="text-xs text-[var(--text-3)] mt-0.5">
            Full text extraction, AI credibility appraisal, and vector embedding.
          </p>
        </div>

        {/* Filter Chips */}
        {filterOptions.length > 2 && (
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-lg bg-[var(--bg-surface-raised)] border border-[var(--border-default)]">
            {filterOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setActiveFilter(opt.value)}
                className={`relative px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  activeFilter === opt.value
                    ? 'text-white'
                    : 'text-[var(--text-3)] hover:text-[var(--text-2)]'
                }`}
              >
                {activeFilter === opt.value && (
                  <motion.div
                    layoutId="source-filter-pill"
                    className="absolute inset-0 rounded-md bg-[var(--bg-card)] border border-[var(--border-strong)]"
                    transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{opt.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Source Cards List ────────────────────────────────────── */}
      <div className="space-y-3">
        {filteredSources.map((source, i) => {
          const eval_ = evalMap.get(source.source_id) || source.evaluation;
          const isExpanded = expandedSources.has(source.source_id);

          return (
            <motion.div
              key={source.source_id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: i * 0.04 }}
              className="rounded-xl border border-[var(--border-default)] hover:border-[var(--border-strong)] bg-[var(--bg-surface-raised)]/60 hover:bg-[var(--bg-card)] transition-all overflow-hidden shadow-sm"
            >
              {/* Main Source Header */}
              <div className="p-4 sm:p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <span className="mono text-xs font-bold text-indigo-400 mt-0.5 shrink-0">
                      [{String(i + 1).padStart(2, '0')}]
                    </span>

                    <div className="space-y-1 min-w-0 flex-1">
                      {/* Prominent Title */}
                      <h3 className="text-sm sm:text-[15px] font-semibold text-white leading-snug">
                        {source.title || source.domain || 'Untitled Source'}
                      </h3>

                      {/* Domain & Author meta */}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-3)] font-mono">
                        <span>{source.domain || 'document-store'}</span>
                        {source.published_date && <span>• {source.published_date}</span>}
                        {source.author && source.author !== 'Unknown' && <span>• {source.author}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Top-Right Badges & Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <SourceBadge source={source} />

                    {source.url?.startsWith('http') && (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg text-[var(--text-3)] hover:text-white hover:bg-[var(--bg-card)] transition-colors"
                        title="Open external link"
                        aria-label="Open source link in new tab"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => toggleExpand(source.source_id)}
                      className="p-1.5 rounded-lg text-[var(--text-3)] hover:text-white hover:bg-[var(--bg-card)] cursor-pointer transition-colors"
                      aria-label="Toggle details"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Score Meters (Dual Relevance & Credibility) */}
                {eval_ && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-[var(--text-3)]">Query Relevance</span>
                        <span className="mono font-semibold text-indigo-400">
                          {(eval_.relevance_score * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="score-track">
                        <div
                          className="score-bar bg-gradient-to-r from-indigo-500 to-indigo-400"
                          style={{ width: `${eval_.relevance_score * 100}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-[var(--text-3)]">AI Credibility Rating</span>
                        <span className="mono font-semibold text-emerald-400">
                          {(eval_.credibility_score * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="score-track">
                        <div
                          className="score-bar bg-gradient-to-r from-emerald-600 to-emerald-400"
                          style={{ width: `${eval_.credibility_score * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Expandable Excerpt & AI Reasoning */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t border-[var(--border-subtle)] p-4 sm:p-5 bg-[var(--bg-canvas)]/70 space-y-3"
                  >
                    {/* Assessment Note */}
                    {eval_?.reasoning && (
                      <div className="p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-indigo-400">
                          <Shield className="w-3 h-3" />
                          AI Evaluation Assessment
                        </div>
                        <p className="text-xs text-[var(--text-2)] leading-relaxed">
                          {eval_.reasoning}
                        </p>
                        {eval_.potential_bias && (
                          <p className="text-[11px] text-amber-400/90 pt-0.5">
                            <strong>Potential Bias:</strong> {eval_.potential_bias}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Extracted Content Excerpt */}
                    {source.content && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider text-[var(--text-3)]">
                          <span>Extracted Source Corpus ({source.content_length} characters)</span>
                          <span className="font-mono">{source.extraction_success ? 'Success' : 'Partial'}</span>
                        </div>
                        <div className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] max-h-48 overflow-y-auto text-xs text-[var(--text-2)] leading-relaxed font-mono">
                          {source.content.slice(0, 2000)}
                          {source.content.length > 2000 && (
                            <span className="text-[var(--text-3)] block mt-2">
                              ... [Truncated for preview. Full note exported to Obsidian]
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Navigate to Evidence Button */}
                    {onNavigateToEvidence && (
                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => onNavigateToEvidence(source.source_id)}
                          className="inline-flex items-center gap-1.5 text-xs text-indigo-300 hover:text-indigo-200 font-semibold cursor-pointer"
                        >
                          <span>View Extracted Claims</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
