'use client';

import { CheckCheck, Circle, Loader2, OctagonAlert } from 'lucide-react';
import type { AgentStage, ResearchRun, StageStatus } from '@/types/research';
import { formatDuration, stageLabels, stageOrder } from '@/lib/research-utils';

interface AgentTimelineProps {
  stageStates: Record<string, { status: StageStatus; message: string }>;
  run: ResearchRun | null;
  onSelectStage?: (stage: AgentStage) => void;
}

function StageIcon({ status }: { status: StageStatus }) {
  if (status === 'completed') return <CheckCheck className="h-4 w-4 text-[var(--success)]" />;
  if (status === 'running') return <Loader2 className="h-4 w-4 animate-spin text-[var(--accent-strong)]" />;
  if (status === 'failed') return <OctagonAlert className="h-4 w-4 text-[var(--danger)]" />;
  return <Circle className="h-3.5 w-3.5 text-[var(--text-faint)]" />;
}

export default function AgentTimeline({ stageStates, run, onSelectStage }: AgentTimelineProps) {
  return (
    <aside className="border-t border-white/8 bg-[rgba(10,11,15,0.9)] lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:w-[300px] lg:shrink-0 lg:border-l lg:border-t-0">
      <div className="flex h-full flex-col">
        <div className="border-b border-white/8 px-5 py-5">
          <div className="eyebrow">Research</div>
          <div className="mt-2 text-2xl">Agent activity</div>
          <div className="mt-2 text-sm text-[var(--text-muted)]">
            {run?.status === 'running' ? 'ResearchPilot is working through the pipeline.' : 'A stage-by-stage record of the research run.'}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="space-y-4">
            {stageOrder.map((stage, index) => {
              const state = stageStates[stage];
              const status = state?.status || 'queued';
              return (
                <button
                  key={stage}
                  type="button"
                  onClick={() => onSelectStage?.(stage)}
                  className="focus-ring relative flex w-full gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-white/[0.04]"
                >
                  {index < stageOrder.length - 1 ? (
                    <div className="absolute left-[18px] top-10 h-[calc(100%-1.75rem)] w-px bg-white/8" />
                  ) : null}
                  <div className="relative z-10 mt-0.5 flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]">
                    <StageIcon status={status} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm text-[var(--text-strong)]">{stageLabels[stage]}</div>
                      <div className="mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)]">{status}</div>
                    </div>
                    <div className="mt-1 text-sm text-[var(--text-muted)]">
                      {state?.message || (status === 'queued' ? 'Waiting for this stage to begin.' : 'No details yet.')}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {run ? (
          <div className="border-t border-white/8 px-5 py-5 text-sm text-[var(--text-muted)]">
            <div className="flex justify-between">
              <span>Sources</span>
              <span className="text-[var(--text-strong)]">{run.stats.sources_accepted || run.sources.length}</span>
            </div>
            <div className="mt-2 flex justify-between">
              <span>Retrieved chunks</span>
              <span className="text-[var(--text-strong)]">{run.stats.chunks_retrieved}</span>
            </div>
            <div className="mt-2 flex justify-between">
              <span>Elapsed</span>
              <span className="text-[var(--text-strong)]">{formatDuration(run.stats.duration_seconds)}</span>
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
