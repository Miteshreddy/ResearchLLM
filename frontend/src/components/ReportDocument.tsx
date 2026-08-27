'use client';

import { Download, ExternalLink } from 'lucide-react';
import { buildCitationIndex, formatDuration, getDomain } from '@/lib/research-utils';
import type { ResearchDepth, Source, Synthesis, ResearchStats } from '@/types/research';

interface ReportDocumentProps {
  synthesis: Synthesis;
  stats: ResearchStats;
  sources: Source[];
  depth: ResearchDepth;
  onOpenEvidenceForSource: (sourceId: string) => void;
  onOpenEvidenceForClaim: (findingText: string, sourceId?: string) => void;
  onExportObsidian: () => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-white/8 pt-8 first:border-t-0 first:pt-0">
      <div className="eyebrow">{title}</div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function ReportDocument({
  synthesis,
  stats,
  sources,
  depth,
  onOpenEvidenceForSource,
  onOpenEvidenceForClaim,
  onExportObsidian,
}: ReportDocumentProps) {
  const citationMap = buildCitationIndex(sources);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="surface rounded-[34px] p-5 sm:p-7">
        <article className="rounded-[28px] border border-white/8 bg-[rgba(8,10,14,0.72)] p-6 sm:p-8 lg:p-10">
          <div className="flex flex-col gap-5 border-b border-white/8 pb-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="eyebrow">Research report</div>
              <h1 className="mt-3 max-w-4xl text-4xl leading-tight sm:text-5xl">{synthesis.research_question}</h1>
            </div>
            <button
              type="button"
              onClick={onExportObsidian}
              className="focus-ring inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-[var(--text-main)] transition hover:bg-white/[0.08]"
            >
              <Download className="h-4 w-4" />
              <span>Export vault</span>
            </button>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ['Depth', depth.charAt(0).toUpperCase() + depth.slice(1)],
              ['Sources', `${stats.sources_accepted || sources.length}`],
              ['Findings', `${synthesis.key_findings.length}`],
              ['Duration', formatDuration(stats.duration_seconds)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-3xl border border-white/8 bg-white/[0.03] px-4 py-4">
                <div className="mono text-[11px] uppercase tracking-[0.14em] text-[var(--text-faint)]">{label}</div>
                <div className="mt-3 text-xl text-[var(--text-strong)]">{value}</div>
              </div>
            ))}
          </div>

          <div className="mt-10 space-y-10">
            <Section title="Executive Summary">
              <div className="max-w-3xl text-lg leading-8 text-[var(--text-main)]">{synthesis.executive_summary}</div>
            </Section>

            <Section title="Key Findings">
              <div className="space-y-4">
                {synthesis.key_findings.map((finding, index) => (
                  <button
                    key={`${finding.finding}-${index}`}
                    type="button"
                    onClick={() => onOpenEvidenceForClaim(finding.finding, finding.supporting_sources[0])}
                    className="focus-ring flex w-full gap-5 rounded-[26px] border border-white/8 bg-white/[0.02] p-5 text-left transition hover:bg-white/[0.04]"
                  >
                    <div className="mono min-w-[40px] text-[var(--text-faint)]">{String(index + 1).padStart(2, '0')}</div>
                    <div className="min-w-0">
                      <div className="text-lg leading-7 text-[var(--text-strong)]">{finding.finding}</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {finding.supporting_sources.map((sourceId) => (
                          <span
                            key={sourceId}
                            className="inline-flex rounded-full border border-[rgba(111,124,255,0.28)] bg-[var(--accent-soft)] px-3 py-1 text-sm text-[var(--text-main)]"
                          >
                            [{citationMap.get(sourceId) || '?'}]
                          </span>
                        ))}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </Section>

            <Section title="Evidence">
              <div className="max-w-3xl text-base leading-8 text-[var(--text-muted)]">{synthesis.evidence_summary}</div>
            </Section>

            <Section title="Limitations">
              {synthesis.limitations.length ? (
                <div className="space-y-3">
                  {synthesis.limitations.map((item, index) => (
                    <div key={`${item}-${index}`} className="rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-4 text-base text-[var(--text-muted)]">
                      {item}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-4 text-base text-[var(--text-muted)]">
                  No explicit limitations were returned yet.
                </div>
              )}
            </Section>

            <Section title="Sources">
              <div className="divide-y divide-white/8 rounded-[26px] border border-white/8 bg-white/[0.02]">
                {sources.map((source, index) => (
                  <div key={source.source_id} className="flex flex-col gap-4 px-4 py-5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => onOpenEvidenceForSource(source.source_id)}
                        className="focus-ring text-left"
                      >
                        <div className="text-base text-[var(--text-strong)]">
                          {String(index + 1).padStart(2, '0')} {source.title}
                        </div>
                      </button>
                      <div className="mt-2 text-sm text-[var(--text-muted)]">
                        {getDomain(source)}
                      </div>
                    </div>
                    {source.url ? (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="focus-ring inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-[var(--text-main)] transition hover:bg-white/[0.08]"
                      >
                        <span>Open</span>
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            </Section>
          </div>
        </article>
      </div>
    </div>
  );
}
