'use client';

import Link from 'next/link';
import { History, Sparkles } from 'lucide-react';
import type { ConfigStatus } from '@/types/research';

interface AppHeaderProps {
  config?: ConfigStatus | null;
  activeNav?: 'research' | 'history';
  onSelectNav?: (nav: 'research' | 'history') => void;
}

export default function AppHeader({
  config,
  activeNav = 'research',
  onSelectNav,
}: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/6 bg-[rgba(8,9,12,0.86)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="focus-ring flex items-center gap-3 rounded-xl px-2 py-1.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(111,124,255,0.24),rgba(111,124,255,0.08))]">
            <Sparkles className="h-4 w-4 text-[var(--accent-strong)]" />
          </div>
          <div>
            <div className="text-[15px] font-semibold tracking-[-0.03em] text-[var(--text-strong)]">ResearchPilot</div>
            <div className="mono text-[11px] text-[var(--text-faint)]">Autonomous AI research workspace</div>
          </div>
        </Link>

        <div className="flex items-center gap-3">

          {onSelectNav ? (
            <button
              type="button"
              onClick={() => onSelectNav(activeNav === 'history' ? 'research' : 'history')}
              className="focus-ring inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-[var(--text-main)] transition hover:border-white/16 hover:bg-white/[0.06]"
              aria-label={activeNav === 'history' ? 'Show research composer' : 'Show research history'}
            >
              <History className="h-4 w-4" />
              <span>{activeNav === 'history' ? 'Composer' : 'History'}</span>
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
