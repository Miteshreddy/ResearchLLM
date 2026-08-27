'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Clock, ArrowRight, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import type { HistoryItem } from '@/types/research';

interface RecentHistoryProps {
  history: HistoryItem[];
}

export default function RecentHistory({ history }: RecentHistoryProps) {
  if (!history || history.length === 0) return null;

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-[var(--text-3)]" />
          <span className="section-kicker">Recent Investigations</span>
        </div>
        <span className="text-[11px] text-[var(--text-3)]">{history.length} saved runs</span>
      </div>

      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface-raised)]/40 overflow-hidden divide-y divide-[var(--border-subtle)]">
        {history.slice(0, 5).map((item) => {
          const isCompleted = item.status === 'completed';
          const isRunning = item.status === 'running';
          const isFailed = item.status === 'failed';

          return (
            <Link
              key={item.run_id}
              href={`/research/${item.run_id}`}
              className="group flex items-center justify-between gap-3 px-4 py-3 hover:bg-[var(--bg-card)] transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Status Dot */}
                <div className="shrink-0">
                  {isRunning ? (
                    <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                  ) : isCompleted ? (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                  ) : isFailed ? (
                    <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-gray-500 inline-block" />
                  )}
                </div>

                {/* Query text */}
                <p className="text-xs font-medium text-[var(--text-1)] group-hover:text-indigo-300 truncate transition-colors">
                  {item.query}
                </p>
              </div>

              {/* Metadata */}
              <div className="flex items-center gap-2.5 shrink-0">
                <span className="badge-tag badge-neutral text-[10px] uppercase font-mono py-0.5 px-2">
                  {item.depth}
                </span>

                <span className="text-[11px] text-[var(--text-3)] hidden sm:inline font-mono">
                  {new Date(item.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>

                <ArrowRight className="w-3.5 h-3.5 text-[var(--text-3)] group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
