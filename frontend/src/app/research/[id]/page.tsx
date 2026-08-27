'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import AppHeader from '@/components/AppHeader';
import AgentTimeline from '@/components/AgentTimeline';
import EvidenceDrawer from '@/components/EvidenceDrawer';
import LeftSidebar, { type WorkspaceTab } from '@/components/LeftSidebar';
import ObsidianWorkspace from '@/components/ObsidianWorkspace';
import RagInspector from '@/components/RagInspector';
import ReportDocument from '@/components/ReportDocument';
import SkeletonLoader from '@/components/SkeletonLoader';
import SourceBrowser from '@/components/SourceBrowser';
import { useSSE } from '@/hooks/useSSE';
import { api } from '@/lib/api';
import { getFactCheck, getFindingClaim, getSource } from '@/lib/research-utils';
import type { Claim, HistoryItem, ResearchRun, StageStatus } from '@/types/research';

export default function ResearchWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: runId } = use(params);
  const [run, setRun] = useState<ResearchRun | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('report');
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [stageStates, setStageStates] = useState<Record<string, { status: StageStatus; message: string }>>({});
  const [error, setError] = useState<string | null>(null);

  const fetchRun = useCallback(async () => {
    try {
      const response = await api.getResearch(runId);
      setRun(response);
      setError(null);
      const nextStageStates: Record<string, { status: StageStatus; message: string }> = {};
      response.events.forEach((event) => {
        nextStageStates[event.stage] = {
          status: event.status,
          message: event.message,
        };
      });
      setStageStates(nextStageStates);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Unable to load this research run.');
    }
  }, [runId]);

  useSSE({
    runId,
    onEvent: (event) => {
      setStageStates((current) => ({
        ...current,
        [event.stage]: {
          status: event.status,
          message: event.message,
        },
      }));
      void fetchRun();
    },
    onComplete: () => {
      void fetchRun();
    },
    onError: () => undefined,
  });

  useEffect(() => {
    void fetchRun();
    api.getHistory().then((response) => setHistory(response.runs || [])).catch(() => undefined);
  }, [fetchRun]);

  const activeFactCheck = useMemo(() => getFactCheck(run, selectedClaim?.claim_id), [run, selectedClaim]);
  const activeSource = useMemo(() => getSource(run, selectedClaim?.source_id), [run, selectedClaim]);
  const isLoadingReport = !run || (run.status === 'running' && !run.synthesis);

  const openClaimFromFinding = (findingText: string, sourceId?: string) => {
    const nextClaim = getFindingClaim(run, sourceId, findingText);
    if (nextClaim) {
      setSelectedClaim(nextClaim);
      setActiveTab('evidence');
    }
  };

  const openClaimFromSource = (sourceId: string) => {
    const nextClaim = getFindingClaim(run, sourceId);
    if (nextClaim) {
      setSelectedClaim(nextClaim);
    } else {
      setActiveTab('sources');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-app)]">
      <AppHeader />

      <div className="mx-auto flex w-full max-w-[1600px] flex-col lg:flex-row">
        <LeftSidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          run={run}
          history={history}
        />

        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
          {error && !run ? (
            <div className="rounded-[30px] border border-[rgba(207,111,124,0.28)] bg-[var(--danger-soft)] p-6">
              <div className="text-lg text-[var(--text-strong)]">Research interrupted</div>
              <div className="mt-2 text-sm text-[#efcad0]">{error}</div>
            </div>
          ) : null}

          {isLoadingReport ? (
            <SkeletonLoader type="report" />
          ) : null}

          {!isLoadingReport && run && activeTab === 'report' && run.synthesis ? (
            <ReportDocument
              synthesis={run.synthesis}
              stats={run.stats}
              sources={run.sources}
              depth={run.depth}
              onOpenEvidenceForSource={openClaimFromSource}
              onOpenEvidenceForClaim={openClaimFromFinding}
              onExportObsidian={() => window.open(api.getObsidianExportUrl(run.run_id), '_blank', 'noopener,noreferrer')}
            />
          ) : null}

          {!isLoadingReport && run && activeTab === 'report' && !run.synthesis ? (
            <div className="rounded-[30px] border border-white/8 bg-white/[0.03] p-8 text-[var(--text-muted)]">
              The report is still being synthesized. Evidence and sources will appear here as the run completes.
            </div>
          ) : null}

          {run && activeTab === 'evidence' ? (
            <div className="rounded-[34px] border border-white/8 bg-[rgba(10,12,17,0.72)]">
              <div className="border-b border-white/8 px-5 py-5">
                <div className="eyebrow">Evidence</div>
                <h2 className="mt-2 text-3xl">Claims and support</h2>
              </div>

              {run.claims.length ? (
                <div className="divide-y divide-white/8">
                  {run.claims.map((claim, index) => {
                    const factCheck = run.fact_checks.find((item) => item.claim_id === claim.claim_id);
                    return (
                      <button
                        key={claim.claim_id}
                        type="button"
                        onClick={() => setSelectedClaim(claim)}
                        className="focus-ring flex w-full gap-5 px-5 py-5 text-left transition hover:bg-white/[0.03]"
                      >
                        <div className="mono text-[var(--text-faint)]">{String(index + 1).padStart(2, '0')}</div>
                        <div className="min-w-0 flex-1">
                          <div className="text-lg text-[var(--text-strong)]">{claim.claim_text}</div>
                          <div className="mt-3 text-base leading-7 text-[var(--text-muted)]">
                            {claim.evidence_excerpt || 'No evidence excerpt was returned for this claim.'}
                          </div>
                        </div>
                        <div className="hidden shrink-0 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-sm text-[var(--text-muted)] sm:block">
                          {factCheck?.verification_status || 'pending'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="px-5 py-8 text-[var(--text-muted)]">Evidence will appear after research completes.</div>
              )}
            </div>
          ) : null}

          {run && activeTab === 'sources' ? (
            <SourceBrowser
              sources={run.sources}
              evaluations={run.evaluations}
              onSelectSourceForEvidence={openClaimFromSource}
            />
          ) : null}

          {run && activeTab === 'knowledge' ? <RagInspector run={run} /> : null}

          {run && activeTab === 'vault' ? <ObsidianWorkspace run={run} /> : null}
        </main>

        <AgentTimeline stageStates={stageStates} run={run} />
      </div>

      <EvidenceDrawer
        claim={selectedClaim}
        factCheck={activeFactCheck}
        source={activeSource}
        onClose={() => setSelectedClaim(null)}
      />
    </div>
  );
}
