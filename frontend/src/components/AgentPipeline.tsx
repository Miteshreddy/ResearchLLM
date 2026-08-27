'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles, Globe, FileText, Shield, Database,
  Layers, CheckCircle2, BarChart3, BookOpen, Loader2,
  Minus, XCircle, ChevronRight, Download
} from 'lucide-react';
import StatsCounter from './StatsCounter';
import type { AgentStage, StageStatus, ResearchRun } from '@/types/research';

interface AgentPipelineProps {
  stageStates: Record<string, { status: StageStatus; message: string }>;
  run: ResearchRun | null;
  onSelectStage: (stage: AgentStage) => void;
  onExport?: () => void;
}

const STAGES: { stage: AgentStage; label: string; icon: React.ReactNode }[] = [
  { stage: 'planner',            label: 'Research Planner',    icon: <Sparkles className="w-3.5 h-3.5" /> },
  { stage: 'research',           label: 'Source Discovery',    icon: <Globe className="w-3.5 h-3.5" /> },
  { stage: 'extraction',         label: 'Content Extraction',  icon: <FileText className="w-3.5 h-3.5" /> },
  { stage: 'evaluation',         label: 'Source Evaluation',   icon: <Shield className="w-3.5 h-3.5" /> },
  { stage: 'knowledge_indexing', label: 'Knowledge Indexing',  icon: <Database className="w-3.5 h-3.5" /> },
  { stage: 'claim_extraction',   label: 'Claim Extraction',    icon: <Layers className="w-3.5 h-3.5" /> },
  { stage: 'fact_checking',      label: 'Fact Checking',       icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  { stage: 'synthesis',          label: 'Synthesis',           icon: <BarChart3 className="w-3.5 h-3.5" /> },
  { stage: 'obsidian_export',    label: 'Obsidian Export',     icon: <BookOpen className="w-3.5 h-3.5" /> },
];

export default function AgentPipeline({
  stageStates,
  run,
  onSelectStage,
  onExport,
}: AgentPipelineProps) {
  const isCompleted = run?.status === 'completed';
  const isFailed = run?.status === 'failed';

  return (
    <aside className="w-full lg:w-[320px] shrink-0 border-t lg:border-t-0 lg:border-l border-[var(--border-default)] bg-[var(--bg-surface)] flex flex-col h-auto lg:h-[calc(100vh-56px)] lg:sticky lg:top-14 overflow-y-auto">
      {/* Pipeline Header */}
      <div className="p-5 pb-3 flex items-center justify-between border-b border-[var(--border-subtle)]">
        <div>
          <span className="section-kicker block">Orchestration Timeline</span>
          <p className="text-xs text-[var(--text-3)] mt-0.5">
            Click any agent to inspect activity
          </p>
        </div>
        {run?.status === 'running' && (
          <span className="flex items-center gap-1.5 text-[11px] text-indigo-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            LIVE
          </span>
        )}
      </div>

      {/* Spatial Timeline Steps */}
      <div className="p-5 space-y-1">
        {STAGES.map((item, idx) => {
          const state = stageStates[item.stage];
          const status: StageStatus = state?.status || 'queued';
          const isLast = idx === STAGES.length - 1;
          const isRunning = status === 'running';
          const isDone = status === 'completed';
          const isFail = status === 'failed';
          const isSkip = status === 'skipped';

          return (
            <div key={item.stage} className="relative flex items-start group">
              {/* Connecting vertical line */}
              {!isLast && (
                <div
                  className={`absolute left-[13px] top-[26px] bottom-[-6px] w-[2px] transition-colors duration-300 ${
                    isDone
                      ? 'bg-emerald-500/30'
                      : isRunning
                      ? 'bg-gradient-to-b from-indigo-500 to-[var(--border-default)]'
                      : 'bg-[var(--border-subtle)]'
                  }`}
                />
              )}

              {/* Step row button */}
              <button
                type="button"
                onClick={() => onSelectStage(item.stage)}
                className="w-full flex items-start gap-3 p-2 rounded-xl text-left hover:bg-[var(--bg-card)] transition-all cursor-pointer group"
              >
                {/* Node Icon */}
                <div
                  className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center shrink-0 border transition-all duration-300 ${
                    isRunning
                      ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.5)]'
                      : isDone
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                      : isFail
                      ? 'border-rose-500/40 bg-rose-500/10 text-rose-400'
                      : isSkip
                      ? 'border-[var(--border-default)] bg-[var(--bg-canvas)] text-[var(--text-3)]'
                      : 'border-[var(--border-default)] bg-[var(--bg-canvas)] text-[var(--text-3)] opacity-60'
                  }`}
                >
                  {isRunning ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                  ) : isDone ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : isFail ? (
                    <XCircle className="w-3.5 h-3.5 text-rose-400" />
                  ) : isSkip ? (
                    <Minus className="w-3 h-3 text-[var(--text-3)]" />
                  ) : (
                    item.icon
                  )}
                </div>

                {/* Text Content */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center justify-between gap-1">
                    <p
                      className={`text-xs font-semibold tracking-tight transition-colors ${
                        isRunning
                          ? 'text-indigo-300'
                          : isDone
                          ? 'text-[var(--text-1)]'
                          : isFail
                          ? 'text-rose-400'
                          : 'text-[var(--text-3)]'
                      }`}
                    >
                      {item.label}
                    </p>
                    <ChevronRight className="w-3 h-3 text-[var(--text-3)] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>

                  {/* Contextual message */}
                  {state?.message && status !== 'queued' ? (
                    <p className="text-[11px] text-[var(--text-3)] truncate mt-0.5">
                      {state.message}
                    </p>
                  ) : (
                    <p className="text-[10px] text-[var(--text-3)] opacity-50 mt-0.5">
                      {status === 'queued' ? 'Waiting in queue' : ''}
                    </p>
                  )}
                </div>
              </button>
            </div>
          );
        })}
      </div>

      {/* Statistics Section (When available) */}
      {run?.stats && (isCompleted || isFailed) && (
        <div className="p-5 border-t border-[var(--border-default)] bg-[var(--bg-surface-raised)]/40 mt-auto space-y-3">
          <span className="section-kicker block">Telemetry Metrics</span>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)]">
              <span className="text-[10px] text-[var(--text-3)] uppercase block">Sources Verified</span>
              <span className="mono text-base font-bold text-emerald-400">
                <StatsCounter value={run.stats.sources_accepted} />
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)]">
              <span className="text-[10px] text-[var(--text-3)] uppercase block">Vectors Indexed</span>
              <span className="mono text-base font-bold text-indigo-400">
                <StatsCounter value={run.stats.chunks_indexed} />
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)]">
              <span className="text-[10px] text-[var(--text-3)] uppercase block">Claims Verified</span>
              <span className="mono text-base font-bold text-cyan-400">
                <StatsCounter value={run.stats.claims_verified} />
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)]">
              <span className="text-[10px] text-[var(--text-3)] uppercase block">Duration</span>
              <span className="mono text-base font-bold text-[var(--text-2)]">
                {run.stats.duration_seconds?.toFixed(1)}s
              </span>
            </div>
          </div>

          {/* Quick Export Obsidian */}
          {isCompleted && onExport && (
            <button
              id="export-obsidian-sidebar"
              onClick={onExport}
              className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-xs font-semibold text-indigo-300 transition-colors cursor-pointer mt-2"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Export Obsidian Vault (.zip)</span>
            </button>
          )}
        </div>
      )}
    </aside>
  );
}
