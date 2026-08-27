'use client';

import Link from 'next/link';
import { ArrowLeft, BookOpen, Database, FileText, Globe2, ShieldCheck } from 'lucide-react';
import type { HistoryItem, ResearchRun } from '@/types/research';
import { formatDate, formatDuration } from '@/lib/research-utils';

export type WorkspaceTab = 'report' | 'evidence' | 'sources' | 'knowledge' | 'vault';

interface LeftSidebarProps {
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  run: ResearchRun | null;
  history?: HistoryItem[];
}

const navItems: { id: WorkspaceTab; label: string; icon: typeof FileText }[] = [
  { id: 'report', label: 'Overview', icon: FileText },
  { id: 'evidence', label: 'Evidence', icon: ShieldCheck },
  { id: 'sources', label: 'Sources', icon: Globe2 },
  { id: 'knowledge', label: 'Knowledge', icon: Database },
  { id: 'vault', label: 'Obsidian', icon: BookOpen },
];

export default function LeftSidebar({
  activeTab,
  onSelectTab,
  run,
  history = [],
}: LeftSidebarProps) {
  return (
    <aside className="border-b border-white/8 bg-[rgba(10,11,15,0.9)] lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:w-[260px] lg:shrink-0 lg:border-b-0 lg:border-r">
      <div className="flex h-full flex-col">
        <div className="border-b border-white/8 px-4 py-4">
          <Link
            href="/"
            className="focus-ring inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-[var(--text-main)] transition hover:bg-white/[0.06]"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>New research</span>
          </Link>
        </div>

        <div className="overflow-x-auto border-b border-white/8 px-3 py-3 lg:border-b-0">
          <nav className="flex gap-2 lg:flex-col">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = item.id === activeTab;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  className={`focus-ring inline-flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition lg:w-full ${active ? 'bg-white/[0.09] text-[var(--text-strong)]' : 'text-[var(--text-muted)] hover:bg-white/[0.04] hover:text-[var(--text-main)]'}`}
                >
                  <Icon className={`h-4 w-4 ${active ? 'text-[var(--accent-strong)]' : 'text-[var(--text-faint)]'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {run ? (
          <div className="border-b border-white/8 px-4 py-5">
            <div className="eyebrow">Current research</div>
            <div className="mt-3 text-base leading-relaxed text-[var(--text-strong)]">{run.query}</div>
            <div className="mt-4 flex flex-wrap gap-2 text-sm text-[var(--text-muted)]">
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 capitalize">{run.depth}</span>
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">{run.status}</span>
            </div>
            <div className="mt-4 space-y-2 text-sm text-[var(--text-muted)]">
              <div className="flex justify-between">
                <span>Sources</span>
                <span>{run.stats.sources_accepted || run.sources.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Claims</span>
                <span>{run.stats.claims_verified || run.claims.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Duration</span>
                <span>{formatDuration(run.stats.duration_seconds)}</span>
              </div>
            </div>
          </div>
        ) : null}

        {history.length ? (
          <div className="hidden flex-1 flex-col px-4 py-5 lg:flex">
            <div className="eyebrow">History</div>
            <div className="mt-4 space-y-2 overflow-y-auto">
              {history.slice(0, 5).map((item) => (
                <Link
                  key={item.run_id}
                  href={`/research/${item.run_id}`}
                  className="focus-ring block rounded-2xl border border-white/8 bg-white/[0.02] px-3 py-3 transition hover:bg-white/[0.04]"
                >
                  <div className="line-clamp-2 text-sm text-[var(--text-main)]">{item.query}</div>
                  <div className="mt-2 text-xs text-[var(--text-faint)]">{formatDate(item.created_at)}</div>
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
