'use client';

import { useState } from 'react';
import { ChevronDown, ExternalLink } from 'lucide-react';
import { formatDate, getDomain, getSourceTypeLabel } from '@/lib/research-utils';
import type { Source, SourceEvaluation } from '@/types/research';

interface SourceBrowserProps {
  sources: Source[];
  evaluations: SourceEvaluation[];
  onSelectSourceForEvidence: (sourceId: string) => void;
}

function scoreLabel(value?: number) {
  if (value === undefined || value === null) return 'Not scored';
  return `${Math.round(value * 100)}%`;
}

export default function SourceBrowser({
  sources,
  evaluations,
  onSelectSourceForEvidence,
}: SourceBrowserProps) {
  const [openSourceId, setOpenSourceId] = useState<string | null>(sources[0]?.source_id || null);

  if (!sources.length) {
    return (
      <div className="rounded-[30px] border border-white/8 bg-white/[0.03] p-8 text-center text-[var(--text-muted)]">
        No sources yet. Add a document, URL, or web research source to build the evidence base.
      </div>
    );
  }

  return (
    <div className="rounded-[34px] border border-white/8 bg-[rgba(10,12,17,0.72)]">
      <div className="border-b border-white/8 px-5 py-5 sm:px-7">
        <div className="eyebrow">Sources</div>
        <h2 className="mt-2 text-3xl">Research browser</h2>
      </div>

      <div className="divide-y divide-white/8">
        {sources.map((source, index) => {
          const evaluation = evaluations.find((item) => item.source_id === source.source_id) || source.evaluation;
          const open = openSourceId === source.source_id;
          return (
            <div key={source.source_id} className="px-4 py-4 sm:px-6">
              <button
                type="button"
                onClick={() => setOpenSourceId(open ? null : source.source_id)}
                className="focus-ring flex w-full items-start justify-between gap-4 rounded-[22px] px-2 py-2 text-left transition hover:bg-white/[0.03]"
              >
                <div className="grid flex-1 gap-3 lg:grid-cols-[48px_minmax(0,2fr)_repeat(4,minmax(0,1fr))] lg:items-center">
                  <div className="mono text-[var(--text-faint)]">{String(index + 1).padStart(2, '0')}</div>
                  <div className="min-w-0">
                    <div className="text-base text-[var(--text-strong)]">{source.title}</div>
                    <div className="mt-1 text-sm text-[var(--text-muted)]">{getDomain(source)}</div>
                  </div>
                  <div className="text-sm text-[var(--text-muted)]">{getSourceTypeLabel(source)}</div>
                  <div className="text-sm text-[var(--text-muted)]">{scoreLabel(evaluation?.relevance_score)}</div>
                  <div className="text-sm text-[var(--text-muted)]">{scoreLabel(evaluation?.credibility_score)}</div>
                  <div className="text-sm text-[var(--text-muted)]">{source.extraction_success ? 'Ready' : 'Pending'}</div>
                </div>
                <ChevronDown className={`h-4 w-4 shrink-0 text-[var(--text-faint)] transition ${open ? 'rotate-180' : ''}`} />
              </button>

              {open ? (
                <div className="mt-4 rounded-[26px] border border-white/8 bg-white/[0.03] p-5">
                  <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(260px,1fr)]">
                    <div>
                      <div className="eyebrow">Summary</div>
                      <div className="mt-3 text-base leading-8 text-[var(--text-main)]">
                        {source.summary || source.content.slice(0, 600) || 'No extracted summary is available yet.'}
                      </div>
                      <button
                        type="button"
                        onClick={() => onSelectSourceForEvidence(source.source_id)}
                        className="focus-ring mt-5 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-[var(--text-main)] transition hover:bg-white/[0.08]"
                      >
                        View evidence
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <div className="eyebrow">Metadata</div>
                        <div className="mt-3 space-y-2 text-sm text-[var(--text-muted)]">
                          <div>Published: {formatDate(source.published_date)}</div>
                          <div>Author: {source.author || 'Unknown'}</div>
                          <div>Length: {source.content_length || source.content.length} chars</div>
                        </div>
                      </div>

                      {evaluation ? (
                        <div>
                          <div className="eyebrow">Evaluation</div>
                          <div className="mt-3 text-sm leading-7 text-[var(--text-muted)]">
                            {evaluation.reasoning || evaluation.evidence_quality || 'No evaluation details available.'}
                          </div>
                        </div>
                      ) : null}

                      {source.url ? (
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                          className="focus-ring inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-[var(--text-main)] transition hover:bg-white/[0.08]"
                        >
                          <span>Open source</span>
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
