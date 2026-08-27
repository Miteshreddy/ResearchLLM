'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, BookMarked, Database, FileSearch, Layers3, Sparkles } from 'lucide-react';

const DEMO_STATES = [
  {
    id: 'planner',
    label: 'Planner',
    title: 'Decompose the question into a research plan.',
    body: 'Break the topic into sub-questions, decide the evidence needed, and scope the search before retrieval begins.',
    activity: ['4 research questions', 'search set prepared', 'depth: Standard'],
  },
  {
    id: 'research',
    label: 'Research',
    title: 'Collect sources from the web, URLs, and uploaded documents.',
    body: 'ResearchPilot keeps discovery and extraction visible without turning the workspace into a dashboard.',
    activity: ['6 sources discovered', '4 accepted', '2 pending extraction'],
  },
  {
    id: 'evidence',
    label: 'Evidence',
    title: 'Ground each finding in source-backed excerpts.',
    body: 'Claims stay connected to evidence, source metadata, and support status through a side inspector.',
    activity: ['5 claims extracted', '3 supported', '1 partial'],
  },
  {
    id: 'synthesis',
    label: 'Synthesis',
    title: 'Turn the evidence into an editorial research report.',
    body: 'Summaries, findings, limitations, and source quality live together in one calm reading surface.',
    activity: ['Executive summary ready', 'Findings linked', 'Limitations captured'],
  },
  {
    id: 'obsidian',
    label: 'Obsidian',
    title: 'Export a structured knowledge base for downstream work.',
    body: 'Research outputs can be packaged as markdown notes and linked topics inside an Obsidian vault.',
    activity: ['Vault generated', 'source notes linked', 'markdown ready'],
  },
];

const icons = {
  planner: Sparkles,
  research: FileSearch,
  evidence: Layers3,
  synthesis: Database,
  obsidian: BookMarked,
};

export default function ProductDemoInteractive() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % DEMO_STATES.length);
    }, 3800);
    return () => window.clearInterval(timer);
  }, []);

  const active = DEMO_STATES[index];
  const ActiveIcon = icons[active.id as keyof typeof icons];

  return (
    <section className="mx-auto w-full max-w-[1180px]">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <div className="eyebrow">Product preview</div>
          <h2 className="mt-2 text-3xl sm:text-4xl">A real workspace, not a landing-page dashboard.</h2>
        </div>
        <div className="mono text-[11px] text-[var(--text-faint)]">Demo content</div>
      </div>

      <div className="surface relative overflow-hidden rounded-[34px] p-3 sm:p-4">
        <div className="grid min-h-[560px] gap-4 rounded-[28px] border border-white/8 bg-[rgba(7,8,12,0.82)] p-4 lg:grid-cols-[220px_minmax(0,1fr)_280px]">
          <aside className="rounded-[24px] border border-white/8 bg-white/[0.025] p-4">
            <div className="eyebrow">ResearchPilot</div>
            <div className="mt-5 space-y-2">
              {DEMO_STATES.map((state, stateIndex) => {
                const Icon = icons[state.id as keyof typeof icons];
                const isActive = stateIndex === index;
                return (
                  <button
                    key={state.id}
                    type="button"
                    onClick={() => setIndex(stateIndex)}
                    className={`focus-ring flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${isActive ? 'bg-white/[0.08] text-[var(--text-strong)]' : 'text-[var(--text-muted)] hover:bg-white/[0.04]'}`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? 'text-[var(--accent-strong)]' : 'text-[var(--text-faint)]'}`} />
                    <span className="text-sm">{state.label}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] p-6 sm:p-8">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <div className="eyebrow">Demo research session</div>
                <div className="mt-2 text-2xl text-[var(--text-strong)]">How are enterprise teams designing reliable AI research systems?</div>
              </div>
              <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-[var(--text-muted)]">
                Standard
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={active.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.32 }}
                className="space-y-8"
              >
                <div className="max-w-3xl">
                  <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(111,124,255,0.3)] bg-[var(--accent-soft)] px-3 py-1.5 text-sm text-[var(--text-strong)]">
                    <ActiveIcon className="h-4 w-4 text-[var(--accent-strong)]" />
                    <span>{active.label}</span>
                  </div>
                  <h3 className="mt-5 text-3xl leading-tight">{active.title}</h3>
                  <p className="mt-4 max-w-2xl text-lg text-[var(--text-muted)]">{active.body}</p>
                </div>

                <div className="space-y-3">
                  {active.activity.map((line, lineIndex) => (
                    <motion.div
                      key={line}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: lineIndex * 0.06 }}
                      className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4"
                    >
                      <div className="text-base text-[var(--text-main)]">{line}</div>
                      <ArrowRight className="h-4 w-4 text-[var(--text-faint)]" />
                    </motion.div>
                  ))}
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {['Question', 'Evidence', 'Knowledge'].map((tile, tileIndex) => (
                    <div key={tile} className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
                      <div className="mono text-[11px] uppercase tracking-[0.16em] text-[var(--text-faint)]">0{tileIndex + 1}</div>
                      <div className="mt-3 text-lg text-[var(--text-strong)]">{tile}</div>
                      <div className="mt-2 text-sm text-[var(--text-muted)]">
                        {tile === 'Question' && 'The research prompt stays primary throughout the flow.'}
                        {tile === 'Evidence' && 'Findings stay linked to support, status, and source detail.'}
                        {tile === 'Knowledge' && 'RAG and export feel integrated, not bolted on.'}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <aside className="rounded-[24px] border border-white/8 bg-white/[0.025] p-4">
            <div className="eyebrow">Activity</div>
            <div className="mt-5 space-y-4">
              {['Planning', 'Discovery', 'Extraction', 'Knowledge', 'Synthesis'].map((label, itemIndex) => (
                <div key={label} className="flex gap-3">
                  <div className={`mt-1 h-2.5 w-2.5 rounded-full ${itemIndex <= index ? 'bg-[var(--accent-strong)]' : 'bg-white/12'}`} />
                  <div>
                    <div className="text-sm text-[var(--text-strong)]">{label}</div>
                    <div className="mt-1 text-xs text-[var(--text-muted)]">
                      {itemIndex < index ? 'Complete' : itemIndex === index ? 'Active stage' : 'Queued'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
