'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, CheckCircle2, AlertCircle, XCircle, Info,
  ExternalLink, ChevronDown, ChevronUp, Quote, Link as LinkIcon
} from 'lucide-react';
import type { Claim, FactCheckResult, Source, VerificationStatus } from '@/types/research';

interface EvidenceInspectorProps {
  claims: Claim[];
  factChecks: FactCheckResult[];
  sources: Source[];
  selectedSourceId?: string | null;
  onNavigateToSource?: (sourceId: string) => void;
}

export function VerificationBadge({ status }: { status?: VerificationStatus }) {
  const map: Record<VerificationStatus, { cls: string; label: string; icon: React.ReactNode }> = {
    supported: {
      cls: 'badge-green',
      label: 'Supported by Evidence',
      icon: <CheckCircle2 className="w-3 h-3 text-emerald-400" />,
    },
    partially_supported: {
      cls: 'badge-amber',
      label: 'Partially Supported',
      icon: <AlertCircle className="w-3 h-3 text-amber-400" />,
    },
    contradicted: {
      cls: 'badge-red',
      label: 'Contradicted in Literature',
      icon: <XCircle className="w-3 h-3 text-rose-400" />,
    },
    insufficient_evidence: {
      cls: 'badge-neutral',
      label: 'Insufficient Evidence',
      icon: <Info className="w-3 h-3 text-[var(--text-3)]" />,
    },
  };

  const c = status && map[status] ? map[status] : map.insufficient_evidence;
  return (
    <span className={`badge-tag ${c.cls}`}>
      {c.icon}
      <span>{c.label}</span>
    </span>
  );
}

export default function EvidenceInspector({
  claims,
  factChecks,
  sources,
  selectedSourceId,
  onNavigateToSource,
}: EvidenceInspectorProps) {
  const [expandedClaims, setExpandedClaims] = useState<Set<string>>(new Set([claims?.[0]?.claim_id]));

  const toggleClaim = (claimId: string) => {
    setExpandedClaims((prev) => {
      const next = new Set(prev);
      if (next.has(claimId)) next.delete(claimId);
      else next.add(claimId);
      return next;
    });
  };

  if (!claims || claims.length === 0) {
    return (
      <div className="p-12 text-center border border-[var(--border-default)] rounded-2xl bg-[var(--bg-surface-raised)]/30 space-y-2">
        <Shield className="w-8 h-8 mx-auto text-[var(--text-3)] opacity-60" />
        <h3 className="text-sm font-semibold text-[var(--text-1)]">No Claims Extracted Yet</h3>
        <p className="text-xs text-[var(--text-3)] max-w-sm mx-auto">
          Claims and propositions are extracted during Stage 6 of the research pipeline.
        </p>
      </div>
    );
  }

  // Create source lookup map
  const sourceMap = new Map<string, Source>();
  sources?.forEach((s) => sourceMap.set(s.source_id, s));

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-1)]">
            Fact-Checked Claims & Source Grounding
          </h2>
          <p className="text-xs text-[var(--text-3)] mt-0.5">
            Every claim is isolated, verified against vector chunks, and linked to verbatim excerpts.
          </p>
        </div>
        <span className="badge-tag badge-violet font-mono text-xs">
          {claims.length} Extracted Claims
        </span>
      </div>

      <div className="space-y-3">
        {claims.map((claim, idx) => {
          const fc = factChecks?.find((f) => f.claim_id === claim.claim_id);
          const isExpanded = expandedClaims.has(claim.claim_id);
          const sourceObj = sourceMap.get(claim.source_id);
          const isHighlighted = selectedSourceId === claim.source_id;

          return (
            <motion.div
              key={claim.claim_id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.04 }}
              className={`rounded-xl border transition-all overflow-hidden ${
                isHighlighted
                  ? 'border-indigo-500/80 bg-indigo-500/5 shadow-md shadow-indigo-500/10'
                  : 'border-[var(--border-default)] hover:border-[var(--border-strong)] bg-[var(--bg-surface-raised)]/60'
              }`}
            >
              {/* Claim Header Row */}
              <button
                type="button"
                onClick={() => toggleClaim(claim.claim_id)}
                className="w-full p-4 flex items-start justify-between gap-3 text-left cursor-pointer hover:bg-[var(--bg-card)] transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <span className="mono text-xs font-bold text-indigo-400 mt-0.5 shrink-0">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-medium text-[var(--text-1)] leading-relaxed">
                      {claim.claim_text}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      <VerificationBadge status={fc?.verification_status} />
                      {claim.topic && (
                        <span className="badge-tag badge-neutral text-[10px]">
                          {claim.topic}
                        </span>
                      )}
                      <span className="text-[11px] text-[var(--text-3)] font-mono">
                        Confidence: {(claim.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-1 text-[var(--text-3)] shrink-0">
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {/* Expanded Excerpt & Evaluation Panel */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t border-[var(--border-subtle)] p-4 pt-3 bg-[var(--bg-card)]/70 space-y-3"
                  >
                    {/* Verbatim Excerpt */}
                    {claim.evidence_excerpt && (
                      <div className="p-3 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] space-y-1.5">
                        <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-[var(--text-3)]">
                          <Quote className="w-3 h-3 text-indigo-400" />
                          Verbatim Source Excerpt
                        </div>
                        <p className="text-xs text-[var(--text-2)] italic leading-relaxed pl-2 border-l-2 border-indigo-500/40">
                          &ldquo;{claim.evidence_excerpt}&rdquo;
                        </p>
                      </div>
                    )}

                    {/* Verification Assessment Reasoning */}
                    {fc?.reasoning && (
                      <div className="p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-1">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400/90 block">
                          Model Verification Assessment
                        </span>
                        <p className="text-xs text-[var(--text-2)] leading-relaxed">
                          {fc.reasoning}
                        </p>
                      </div>
                    )}

                    {/* Source Link & Attribution */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-[var(--text-3)]">Source:</span>
                        {sourceObj ? (
                          <button
                            type="button"
                            onClick={() => onNavigateToSource?.(sourceObj.source_id)}
                            className="text-xs text-indigo-300 hover:text-indigo-200 font-medium underline underline-offset-2 flex items-center gap-1 cursor-pointer"
                          >
                            <span>{sourceObj.title || sourceObj.domain}</span>
                            <span className="badge-tag badge-neutral text-[9px] uppercase font-mono py-0">
                              {sourceObj.source_type}
                            </span>
                          </button>
                        ) : (
                          <span className="mono text-[var(--text-2)]">{claim.source_id}</span>
                        )}
                      </div>

                      {sourceObj?.url?.startsWith('http') && (
                        <a
                          href={sourceObj.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-[var(--text-3)] hover:text-white transition-colors"
                        >
                          <span>Open External</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
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
