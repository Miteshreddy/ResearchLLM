'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Clock3 } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import DemoTopics from '@/components/DemoTopics';
import HistoryBrowser from '@/components/HistoryBrowser';
import ProductDemoInteractive from '@/components/ProductDemoInteractive';
import ResearchComposer from '@/components/ResearchComposer';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/research-utils';
import type { ConfigStatus, HistoryItem, ResearchRequest } from '@/types/research';

export default function HomePage() {
  const router = useRouter();
  const [config, setConfig] = useState<ConfigStatus | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeView, setActiveView] = useState<'research' | 'history'>('research');
  const [query, setQuery] = useState('');
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    api.configStatus().then(setConfig).catch(() => undefined);
    api.getHistory().then((response) => setHistory(response.runs || [])).catch(() => undefined);
  }, []);

  const startResearch = async (request: ResearchRequest) => {
    setIsStarting(true);
    try {
      const response = await api.startResearch(request);
      router.push(`/research/${response.run_id}`);
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-app)]">
      <AppHeader
        config={config}
        activeNav={activeView}
        onSelectNav={(nextView) => setActiveView(nextView)}
      />

      <main className="mx-auto w-full max-w-[1440px] px-4 pb-20 pt-8 sm:px-6 sm:pt-12 lg:px-8">
        {activeView === 'history' ? (
          <div className="mx-auto max-w-4xl pt-6">
            <HistoryBrowser history={history} />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="flex flex-col items-center"
          >
            {/* HERO SECTION — Intentionally centered, clean 2-line title */}
            <section className="mx-auto flex w-full max-w-[840px] flex-col items-center px-4 pt-2 text-center sm:px-0 sm:pt-6">
              <div className="eyebrow">AUTONOMOUS AI RESEARCH</div>
              <h1 className="mx-auto mt-5 max-w-[820px] text-center text-[38px] font-bold leading-[1.08] tracking-[-0.035em] text-[var(--text-strong)] sm:text-[56px] sm:leading-[1.06] lg:text-[68px] lg:leading-[1.04]">
                <span className="block sm:inline lg:block">Turn a question into</span>{' '}
                <span className="block sm:inline lg:block">evidence-backed knowledge.</span>
              </h1>
              <p className="mx-auto mt-5 max-w-[740px] text-center text-base leading-relaxed text-[var(--text-muted)] sm:text-lg sm:leading-8">
                Research across the web and your own documents, connect evidence with retrieval, and export the result as a structured Obsidian knowledge base.
              </p>
            </section>

            {/* SEARCH COMPOSER — Center of Gravity */}
            <div className="mt-10 sm:mt-12 w-full">
              <ResearchComposer
                initialQuery={query}
                onStartResearch={startResearch}
                isLoading={isStarting}
              />
            </div>

            {/* RECOMMENDED TOPICS — Secondary & Clean */}
            <div className="mt-6 sm:mt-8 w-full">
              <DemoTopics onSelect={setQuery} />
            </div>

            {/* PRODUCT PREVIEW */}
            <div className="mt-16 sm:mt-20 w-full">
              <ProductDemoInteractive />
            </div>

            {/* RECENT RESEARCH SECTION */}
            <section className="mt-16 sm:mt-20 mx-auto w-full max-w-[920px]">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <div className="eyebrow">Recent research</div>
                  <h2 className="mt-2 text-2xl sm:text-3xl font-semibold">Continue where you left off.</h2>
                </div>
                <Clock3 className="h-4 w-4 text-[var(--text-faint)]" />
              </div>

              {history.length ? (
                <div className="surface rounded-[24px] p-3">
                  <div className="divide-y divide-white/8">
                    {history.slice(0, 5).map((item) => (
                      <Link
                        key={item.run_id}
                        href={`/research/${item.run_id}`}
                        className="focus-ring flex items-center justify-between gap-4 rounded-[18px] px-4 py-3.5 transition hover:bg-white/[0.04]"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-base text-[var(--text-strong)]">{item.query}</div>
                          <div className="mt-1 text-xs text-[var(--text-muted)]">
                            <span className="capitalize">{item.depth}</span> · <span className="capitalize">{item.status}</span> · {formatDate(item.created_at)}
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 shrink-0 text-[var(--text-faint)]" />
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="surface rounded-[24px] p-8 text-center text-sm text-[var(--text-muted)]">
                  Ask a question above to begin building your evidence base.
                </div>
              )}
            </section>
          </motion.div>
        )}
      </main>

      <footer className="border-t border-white/6 px-4 py-8 text-center text-sm text-[var(--text-faint)]">
        ResearchPilot · Autonomous AI Research & Obsidian Knowledge Synthesis
      </footer>
    </div>
  );
}
