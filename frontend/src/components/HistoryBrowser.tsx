'use client';

import Link from 'next/link';
import { ArrowRight, Clock3 } from 'lucide-react';
import type { HistoryItem } from '@/types/research';
import { formatDate } from '@/lib/research-utils';

export default function HistoryBrowser({ history }: { history: HistoryItem[] }) {
  if (!history.length) {
    return (
      <div className="surface rounded-[28px] p-8 text-center">
        <div className="eyebrow">History</div>
        <h2 className="mt-3 text-2xl">No research yet</h2>
        <p className="mx-auto mt-3 max-w-lg text-[var(--text-muted)]">
          Ask a question from the homepage to start building your first evidence-backed research session.
        </p>
      </div>
    );
  }

  return (
    <div className="surface rounded-[28px] p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between border-b border-white/8 pb-4">
        <div>
          <div className="eyebrow">History</div>
          <h2 className="mt-2 text-2xl">Recent research sessions</h2>
        </div>
        <Clock3 className="h-4 w-4 text-[var(--text-faint)]" />
      </div>

      <div className="divide-y divide-white/8">
        {history.slice(0, 12).map((item) => (
          <Link
            key={item.run_id}
            href={`/research/${item.run_id}`}
            className="focus-ring flex items-center justify-between gap-4 rounded-2xl px-3 py-4 transition hover:bg-white/[0.035]"
          >
            <div className="min-w-0">
              <div className="text-base text-[var(--text-strong)]">{item.query}</div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[var(--text-muted)]">
                <span className="capitalize">{item.depth}</span>
                <span>·</span>
                <span className="capitalize">{item.status}</span>
                <span>·</span>
                <span>{formatDate(item.created_at)}</span>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-[var(--text-faint)]" />
          </Link>
        ))}
      </div>
    </div>
  );
}
