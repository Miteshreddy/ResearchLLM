'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Compass, ChevronDown, ChevronUp, Search, ListChecks } from 'lucide-react';
import type { ResearchPlan } from '@/types/research';

interface ResearchPlanCardProps {
  plan: ResearchPlan;
}

export default function ResearchPlanCard({ plan }: ResearchPlanCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!plan) return null;

  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface-raised)]/60 overflow-hidden shadow-sm backdrop-blur-sm">
      {/* Header button to toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-[var(--bg-card)] transition-colors text-left cursor-pointer"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[var(--text-1)]">
                Autonomous Research Blueprint
              </span>
              <span className="badge-tag badge-violet text-[10px] font-mono py-0 px-1.5">
                {plan.subquestions.length} Sub-questions
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-3)] line-clamp-1 mt-0.5">
              {plan.objective}
            </p>
          </div>
        </div>

        <div className="p-1 text-[var(--text-3)] hover:text-white rounded transition-colors">
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="border-t border-[var(--border-subtle)] p-4 pt-3 space-y-3"
          >
            {/* Objective statement */}
            <div className="p-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)]">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-3)] block mb-1">
                Primary Target Objective
              </span>
              <p className="text-xs text-[var(--text-2)] leading-relaxed">
                {plan.objective}
              </p>
            </div>

            {/* Sub-questions Grid / List */}
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-3)] block">
                Decomposed Inquiry Vectors
              </span>
              {plan.subquestions.map((sq, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-default)] transition-colors space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-baseline gap-2">
                      <span className="mono text-[11px] font-bold text-indigo-400">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <p className="text-xs font-medium text-[var(--text-1)] leading-snug">
                        {sq.question}
                      </p>
                    </div>
                    <span className="badge-tag badge-neutral text-[10px] font-mono shrink-0">
                      P{sq.priority} Priority
                    </span>
                  </div>

                  {/* Generated search queries chips */}
                  {sq.search_queries && sq.search_queries.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {sq.search_queries.map((queryText, qi) => (
                        <span
                          key={qi}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border-default)] text-[11px] text-[var(--text-3)] font-mono"
                        >
                          <Search className="w-2.5 h-2.5 text-indigo-400" />
                          {queryText}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
