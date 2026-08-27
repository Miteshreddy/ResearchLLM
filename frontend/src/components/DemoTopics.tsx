'use client';

import { ArrowUpRight } from 'lucide-react';

const TOPICS = [
  'AI coding agents in software delivery',
  'Enterprise RAG architecture patterns',
  'Agentic AI reliability benchmarks',
  'AI-assisted programming in regulated teams',
];

export default function DemoTopics({ onSelect }: { onSelect: (query: string) => void }) {
  return (
    <div className="mx-auto flex w-full max-w-[980px] flex-wrap items-center justify-center gap-3 px-2">
      <span className="mono text-[11px] uppercase tracking-[0.16em] text-[var(--text-faint)]">
        Try a topic
      </span>
      {TOPICS.map((topic) => (
        <button
          key={topic}
          type="button"
          onClick={() => onSelect(topic)}
          className="focus-ring group inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-4 py-2 text-sm text-[var(--text-muted)] transition hover:border-white/16 hover:bg-white/[0.05] hover:text-[var(--text-strong)]"
        >
          <span>{topic}</span>
          <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition group-hover:opacity-100" />
        </button>
      ))}
    </div>
  );
}
