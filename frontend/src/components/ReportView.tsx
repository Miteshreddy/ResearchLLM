'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, AlertCircle, Info, Minus, CheckCircle2,
  ChevronDown, ChevronUp, Quote, Sparkles, BookOpen
} from 'lucide-react';
import type { Synthesis, ResearchStats, Source } from '@/types/research';

interface ReportViewProps {
  synthesis: Synthesis;
  stats?: ResearchStats;
  sources?: Source[];
  onCitationClick?: (sourceId: string) => void;
  onExportVault?: () => void;
}

export default function ReportView({
  synthesis,
  stats,
  sources,
  onCitationClick,
  onExportVault,
}: ReportViewProps) {
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);

  if (!synthesis) return null;

  // Source number lookup map
  const sourceIndexMap = new Map<string, number>();
  sources?.forEach((s, idx) => {
    sourceIndexMap.set(s.source_id, idx + 1);
  });

  const isLongSummary = synthesis.executive_summary && synthesis.executive_summary.length > 500;
  const displaySummary = isLongSummary && !isSummaryExpanded
    ? synthesis.executive_summary.slice(0, 480) + '...'
    : synthesis.executive_summary;

  return (
    <article className="max-w-3xl space-y-8 animate-fade-in text-[var(--text-1)]">
      {/* ── Report Header & Metadata ──────────────────────────────── */}
      <header className="space-y-4 pb-6 border-b border-[var(--border-default)]">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="badge-tag badge-violet text-[10px] uppercase tracking-wider font-mono">
              Synthesis Report
            </span>
            <span className="text-xs text-[var(--text-3)] font-mono">
              Grounded via Qdrant RAG
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-tight">
            {synthesis.research_question || 'Research Synthesis'}
          </h1>
        </div>

        {/* Compact metadata metrics */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--text-2)] font-mono">
          {stats && (
            <>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>{stats.sources_accepted} sources verified</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                <span>{synthesis.key_findings?.length || 0} key findings</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                <span>{stats.claims_verified} verified claims</span>
              </div>
              <div className="flex items-center gap-1.5 text-[var(--text-3)]">
                <span>{stats.duration_seconds?.toFixed(1)}s elapsed</span>
              </div>
            </>
          )}
        </div>
      </header>

      {/* ── Executive Summary ─────────────────────────────────────── */}
      {synthesis.executive_summary && (
        <section className="space-y-3">
          <span className="section-kicker block">Executive Summary</span>
          <div className="relative pl-5 border-l-2 border-indigo-500/70 bg-gradient-to-r from-indigo-500/5 to-transparent py-2 rounded-r-xl">
            <p className="text-sm sm:text-[15px] text-[var(--text-1)] leading-[1.8] font-normal">
              {displaySummary}
            </p>

            {isLongSummary && (
              <button
                type="button"
                onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
                className="mt-2 text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer transition-colors"
              >
                {isSummaryExpanded ? (
                  <>Show less <ChevronUp className="w-3.5 h-3.5" /></>
                ) : (
                  <>Read full summary <ChevronDown className="w-3.5 h-3.5" /></>
                )}
              </button>
            )}
          </div>
        </section>
      )}

      {/* ── Evidence-Backed Key Findings ──────────────────────────── */}
      {synthesis.key_findings && synthesis.key_findings.length > 0 && (
        <section className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <span className="section-kicker">Evidence-Backed Key Findings</span>
            <span className="text-[11px] text-[var(--text-3)]">Click citation tags to inspect sources</span>
          </div>

          <div className="space-y-3">
            {synthesis.key_findings.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.05 }}
                className="group p-4 sm:p-5 rounded-xl border border-[var(--border-default)] hover:border-[var(--border-strong)] bg-[var(--bg-surface-raised)]/50 hover:bg-[var(--bg-card)] transition-all flex gap-3 sm:gap-4 shadow-sm"
              >
                <span className="mono text-xs font-bold text-indigo-400 shrink-0 mt-0.5">
                  {String(i + 1).padStart(2, '0')}
                </span>

                <div className="space-y-2 flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-[var(--text-1)] leading-relaxed font-normal">
                    {f.finding}

                    {/* Inline citation badges */}
                    {f.supporting_sources && f.supporting_sources.length > 0 && (
                      <span className="inline-flex items-center ml-1.5 flex-wrap gap-1">
                        {f.supporting_sources.map((sid) => {
                          const sNum = sourceIndexMap.get(sid) || sid;
                          return (
                            <button
                              key={sid}
                              type="button"
                              onClick={() => onCitationClick?.(sid)}
                              title={`Inspect Source [${sNum}]`}
                              className="citation-link"
                            >
                              [{sNum}]
                            </button>
                          );
                        })}
                      </span>
                    )}
                  </p>

                  <div className="flex items-center gap-2 pt-1">
                    <span
                      className={`badge-tag ${
                        f.confidence === 'high'
                          ? 'badge-green'
                          : f.confidence === 'moderate'
                          ? 'badge-amber'
                          : 'badge-neutral'
                      } text-[10px] font-mono`}
                    >
                      {f.confidence} confidence
                    </span>

                    {f.supporting_sources && f.supporting_sources.length > 0 && (
                      <span className="text-[11px] text-[var(--text-3)]">
                        {f.supporting_sources.length} grounding source{f.supporting_sources.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* ── Evidence Analysis ─────────────────────────────────────── */}
      {synthesis.evidence_summary && (
        <section className="space-y-3 pt-2">
          <span className="section-kicker block">Evidence Analysis & Methodology</span>
          <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-raised)]/30 text-xs sm:text-sm text-[var(--text-2)] leading-[1.75]">
            {synthesis.evidence_summary}
          </div>
        </section>
      )}

      {/* ── Contradictions & Disagreements ────────────────────────── */}
      {synthesis.contradictions && synthesis.contradictions.length > 0 && (
        <section className="space-y-4 pt-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <span className="section-kicker text-amber-400/90">Identified Disagreements in Literature</span>
          </div>

          <div className="space-y-3">
            {synthesis.contradictions.map((c, i) => (
              <div
                key={i}
                className="p-4 sm:p-5 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-3"
              >
                <p className="text-xs sm:text-sm font-semibold text-white">
                  {c.claim_text}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 space-y-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 block">
                      Position A
                    </span>
                    <p className="text-xs text-[var(--text-2)] leading-relaxed">
                      {c.source_a_position}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg border border-rose-500/20 bg-rose-500/5 space-y-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-rose-400 block">
                      Position B
                    </span>
                    <p className="text-xs text-[var(--text-2)] leading-relaxed">
                      {c.source_b_position}
                    </p>
                  </div>
                </div>

                {c.conclusion && (
                  <div className="pt-1 text-xs text-amber-300 font-medium">
                    <strong className="text-[10px] uppercase tracking-wider text-amber-400/80 mr-1">Synthesis:</strong>
                    {c.conclusion}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Limitations & Open Questions (Editorial Grid) ─────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        {synthesis.limitations && synthesis.limitations.length > 0 && (
          <section className="space-y-3 p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface-raised)]/30">
            <span className="section-kicker block">Research Limitations</span>
            <ul className="space-y-2">
              {synthesis.limitations.map((lim, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-[var(--text-2)] leading-relaxed">
                  <Minus className="w-3.5 h-3.5 text-[var(--text-3)] shrink-0 mt-0.5" />
                  <span>{lim}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {synthesis.open_questions && synthesis.open_questions.length > 0 && (
          <section className="space-y-3 p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface-raised)]/30">
            <span className="section-kicker block">Unresolved Vectors</span>
            <ul className="space-y-2">
              {synthesis.open_questions.map((q, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-[var(--text-2)] leading-relaxed">
                  <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                  <span>{q}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* ── Conclusion ────────────────────────────────────────────── */}
      {synthesis.conclusion && (
        <section className="space-y-3 pt-4 border-t border-[var(--border-default)]">
          <span className="section-kicker block">Synthesis Conclusion</span>
          <p className="text-sm text-[var(--text-1)] leading-[1.8] pl-4 border-l-2 border-indigo-400 italic">
            &ldquo;{synthesis.conclusion}&rdquo;
          </p>
        </section>
      )}

      {/* Bottom Obsidian export action */}
      {onExportVault && (
        <div className="pt-6 border-t border-[var(--border-subtle)] flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-white">Save to Obsidian Knowledge Base</p>
            <p className="text-[11px] text-[var(--text-3)]">Export connected notes, frontmatter tags, and graph links.</p>
          </div>
          <button
            onClick={onExportVault}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-98 transition-all cursor-pointer shadow-md shadow-indigo-600/20"
          >
            <BookOpen className="w-4 h-4" />
            <span>Export Vault (.zip)</span>
          </button>
        </div>
      )}
    </article>
  );
}
