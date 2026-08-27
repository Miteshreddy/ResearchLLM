'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Sparkles, Globe, FileText, Shield, Database,
  Layers, CheckCircle2, BarChart3, BookOpen, AlertCircle
} from 'lucide-react';
import type { AgentStage, ResearchRun } from '@/types/research';

interface AgentDetailDrawerProps {
  stage: AgentStage | null;
  run: ResearchRun | null;
  onClose: () => void;
}

const STAGE_TITLES: Record<AgentStage, { title: string; desc: string; icon: React.ReactNode }> = {
  planner: {
    title: 'Research Planner Agent',
    desc: 'Decomposes high-level query into targeted sub-questions & search vectors',
    icon: <Sparkles className="w-4 h-4 text-indigo-400" />,
  },
  research: {
    title: 'Source Discovery Agent',
    desc: 'Executes concurrent multi-source queries via Tavily and ingest pipelines',
    icon: <Globe className="w-4 h-4 text-cyan-400" />,
  },
  extraction: {
    title: 'Content Extraction Agent',
    desc: 'Extracts, normalizes, and cleans full text from web pages & documents',
    icon: <FileText className="w-4 h-4 text-purple-400" />,
  },
  evaluation: {
    title: 'Source Evaluation Agent',
    desc: 'Assesses relevance, credibility, source authority, and potential bias',
    icon: <Shield className="w-4 h-4 text-emerald-400" />,
  },
  knowledge_indexing: {
    title: 'Knowledge Indexing (RAG)',
    desc: 'Chunks passages and embeds vectors into Qdrant vector database',
    icon: <Database className="w-4 h-4 text-indigo-400" />,
  },
  claim_extraction: {
    title: 'Claim Extraction Agent',
    desc: 'Extracts core factual propositions and verbatim evidence excerpts',
    icon: <Layers className="w-4 h-4 text-violet-400" />,
  },
  fact_checking: {
    title: 'Fact Checking & Verification',
    desc: 'Cross-verifies claims against RAG vector store and flags contradictions',
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
  },
  synthesis: {
    title: 'Synthesis & Editorial Agent',
    desc: 'Generates structured report with inline citations and limitations',
    icon: <BarChart3 className="w-4 h-4 text-amber-400" />,
  },
  obsidian_export: {
    title: 'Obsidian Vault Exporter',
    desc: 'Compiles interconnected markdown knowledge base with YAML frontmatter',
    icon: <BookOpen className="w-4 h-4 text-cyan-400" />,
  },
};

export default function AgentDetailDrawer({ stage, run, onClose }: AgentDetailDrawerProps) {
  if (!stage) return null;

  const info = STAGE_TITLES[stage] || {
    title: stage,
    desc: 'Agent execution details',
    icon: <Sparkles className="w-4 h-4" />,
  };

  // Find events related to this stage
  const stageEvents = run?.events?.filter((e) => e.stage === stage) || [];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
        />

        {/* Slide-in drawer */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          className="relative z-10 w-full max-w-md h-full bg-[var(--bg-surface)] border-l border-[var(--border-default)] shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Drawer Header */}
          <div className="p-4 sm:p-5 border-b border-[var(--border-default)] bg-[var(--bg-surface-raised)] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)]">
                {info.icon}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-1)]">
                  {info.title}
                </h3>
                <p className="text-[11px] text-[var(--text-3)] line-clamp-1">
                  {info.desc}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[var(--text-3)] hover:text-white hover:bg-[var(--bg-card)] cursor-pointer transition-colors"
              aria-label="Close panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Drawer Body - Real Backend Data Only */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {/* Event log snippet */}
            {stageEvents.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-3)] block">
                  Live Agent Telemetry
                </span>
                <div className="space-y-1.5">
                  {stageEvents.map((evt, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] flex items-start gap-2 text-xs"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                      <div className="space-y-0.5 flex-1">
                        <p className="text-[var(--text-2)]">{evt.message}</p>
                        <span className="text-[10px] text-[var(--text-3)] font-mono">
                          {new Date(evt.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Specific Stage Content */}
            {stage === 'planner' && run?.plan && (
              <div className="space-y-3">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-3)] block">
                  Generated Search Vectors
                </span>
                <div className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-2">
                  <p className="text-xs font-medium text-[var(--text-1)]">
                    Target: {run.plan.objective}
                  </p>
                  <div className="space-y-1.5 pt-1">
                    {run.plan.subquestions.map((sq, i) => (
                      <div key={i} className="text-xs text-[var(--text-2)] pl-2 border-l border-indigo-500/40">
                        <p className="font-medium text-[var(--text-1)]">{sq.question}</p>
                        {sq.search_queries.map((q, qi) => (
                          <span key={qi} className="inline-block mono text-[10px] text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded mr-1 mt-1">
                            {q}
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {stage === 'research' && run?.sources && (
              <div className="space-y-3">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-3)] block">
                  Discovered Sources ({run.sources.length})
                </span>
                <div className="space-y-2">
                  {run.sources.map((s, i) => (
                    <div key={i} className="p-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-[var(--text-1)] truncate max-w-[240px]">{s.title || s.domain}</span>
                        <span className="badge-tag badge-neutral text-[9px] uppercase font-mono">{s.source_type}</span>
                      </div>
                      <p className="text-[10px] text-[var(--text-3)] font-mono truncate">{s.url}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {stage === 'extraction' && run?.sources && (
              <div className="space-y-3">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-3)] block">
                  Extraction Results
                </span>
                <div className="space-y-2">
                  {run.sources.map((s, i) => (
                    <div key={i} className="p-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs flex justify-between items-center">
                      <span className="text-[var(--text-1)] truncate max-w-[220px]">{s.title || s.domain}</span>
                      <span className={`text-[10px] font-mono ${s.extraction_success ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {s.extraction_success ? `${s.content_length} chars ✓` : 'Failed'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {stage === 'evaluation' && run?.evaluations && (
              <div className="space-y-3">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-3)] block">
                  AI Source Evaluations
                </span>
                <div className="space-y-2">
                  {run.evaluations.map((ev, i) => (
                    <div key={i} className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="font-mono text-[11px] text-indigo-400">{ev.source_id}</span>
                        <span className={`badge-tag ${ev.accepted ? 'badge-green' : 'badge-red'} text-[9px]`}>
                          {ev.accepted ? 'Accepted' : 'Rejected'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div>Relevance: <strong className="text-white mono">{(ev.relevance_score * 100).toFixed(0)}%</strong></div>
                        <div>Credibility: <strong className="text-white mono">{(ev.credibility_score * 100).toFixed(0)}%</strong></div>
                      </div>
                      {ev.reasoning && (
                        <p className="text-[11px] text-[var(--text-3)] italic">{ev.reasoning}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {stage === 'knowledge_indexing' && run?.stats && (
              <div className="space-y-3">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-3)] block">
                  Vector Database Status
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-center">
                    <span className="mono text-xl font-bold text-indigo-400 block">{run.stats.chunks_indexed}</span>
                    <span className="text-[10px] text-[var(--text-3)] uppercase">Chunks Indexed</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-center">
                    <span className="mono text-xl font-bold text-cyan-400 block">{run.stats.chunks_retrieved}</span>
                    <span className="text-[10px] text-[var(--text-3)] uppercase">Chunks Retrieved</span>
                  </div>
                </div>
                <p className="text-[11px] text-[var(--text-3)]">
                  Collection: <code className="mono text-[var(--text-2)]">research_knowledge</code> (BAAI/bge-small-en-v1.5)
                </p>
              </div>
            )}

            {stage === 'claim_extraction' && run?.claims && (
              <div className="space-y-3">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-3)] block">
                  Extracted Propositions ({run.claims.length})
                </span>
                <div className="space-y-2">
                  {run.claims.map((c, i) => (
                    <div key={i} className="p-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs space-y-1">
                      <p className="text-[var(--text-1)] font-medium">{c.claim_text}</p>
                      <div className="flex justify-between items-center text-[10px] text-[var(--text-3)]">
                        <span>Source: <span className="mono">{c.source_id}</span></span>
                        <span>Confidence: <strong className="text-white mono">{(c.confidence * 100).toFixed(0)}%</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {stage === 'fact_checking' && run?.fact_checks && (
              <div className="space-y-3">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-3)] block">
                  Verification Records ({run.fact_checks.length})
                </span>
                <div className="space-y-2">
                  {run.fact_checks.map((fc, i) => (
                    <div key={i} className="p-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-mono text-[10px] text-[var(--text-3)]">{fc.claim_id}</span>
                        <span className="badge-tag badge-neutral text-[9px] uppercase">{fc.verification_status}</span>
                      </div>
                      <p className="text-[11px] text-[var(--text-2)]">{fc.reasoning || fc.claim_text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {stage === 'synthesis' && run?.synthesis && (
              <div className="space-y-3">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-3)] block">
                  Synthesis Findings
                </span>
                <p className="text-xs text-[var(--text-2)] leading-relaxed">
                  Generated {run.synthesis.key_findings.length} key findings with full inline source grounding.
                </p>
              </div>
            )}

            {stage === 'obsidian_export' && (
              <div className="space-y-3">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-3)] block">
                  Knowledge Vault Status
                </span>
                <p className="text-xs text-[var(--text-2)] leading-relaxed">
                  Export pipeline ready for download. Produces 00 - Index.md, Research/, Topics/, and Sources/ folders.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
