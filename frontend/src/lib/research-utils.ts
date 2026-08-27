import type {
  AgentStage,
  Claim,
  FactCheckResult,
  ResearchDepth,
  ResearchRun,
  Source,
  SourceType,
  VerificationStatus,
} from '@/types/research';

export const depthDetails: Record<ResearchDepth, { label: string; summary: string }> = {
  quick: {
    label: 'Quick',
    summary: '2 searches · up to 4 sources',
  },
  standard: {
    label: 'Standard',
    summary: '4 searches · up to 6 sources',
  },
  deep: {
    label: 'Deep',
    summary: '6 searches · up to 8 sources',
  },
};

export const stageOrder: AgentStage[] = [
  'planner',
  'research',
  'extraction',
  'evaluation',
  'knowledge_indexing',
  'claim_extraction',
  'fact_checking',
  'synthesis',
  'obsidian_export',
];

export const stageLabels: Record<AgentStage, string> = {
  planner: 'Planning',
  research: 'Discovery',
  extraction: 'Extraction',
  evaluation: 'Evaluation',
  knowledge_indexing: 'Knowledge',
  claim_extraction: 'Claims',
  fact_checking: 'Fact checking',
  synthesis: 'Synthesis',
  obsidian_export: 'Obsidian',
};

export const sourceTypeLabels: Record<string, string> = {
  web: 'WEB',
  document: 'DOC',
  url: 'URL',
  academic: 'ACADEMIC',
  government: 'GOV',
  official_docs: 'DOCS',
  company: 'COMPANY',
  news: 'NEWS',
  blog: 'BLOG',
  community: 'COMMUNITY',
  other: 'OTHER',
};

export const verificationLabels: Record<VerificationStatus, string> = {
  supported: 'Supported',
  partially_supported: 'Partially supported',
  contradicted: 'Contradicted',
  insufficient_evidence: 'Insufficient evidence',
};

export function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return 'In progress';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const rem = Math.round(seconds % 60);
  return `${mins}m ${rem}s`;
}

export function formatDate(value?: string): string {
  if (!value) return 'Unknown';
  try {
    return new Intl.DateTimeFormat('en', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function getSourceTypeLabel(source: Source): string {
  const key = (source.document_format || source.source_type || 'other') as SourceType | string;
  return sourceTypeLabels[key] || key.toUpperCase();
}

export function getDomain(source: Source): string {
  if (source.domain) return source.domain;
  try {
    return new URL(source.url).hostname.replace(/^www\./, '');
  } catch {
    return 'local';
  }
}

export function getFindingClaim(
  run: ResearchRun | null,
  sourceId?: string,
  findingText?: string,
): Claim | null {
  if (!run) return null;
  const bySource = sourceId ? run.claims.find((claim) => claim.source_id === sourceId) : undefined;
  if (bySource) return bySource;
  if (findingText) {
    const lowerFinding = findingText.toLowerCase();
    const byText = run.claims.find((claim) => lowerFinding.includes(claim.topic.toLowerCase()));
    if (byText) return byText;
  }
  return run.claims[0] || null;
}

export function getFactCheck(run: ResearchRun | null, claimId?: string): FactCheckResult | null {
  if (!run || !claimId) return null;
  return run.fact_checks.find((result) => result.claim_id === claimId) || null;
}

export function getSource(run: ResearchRun | null, sourceId?: string): Source | null {
  if (!run || !sourceId) return null;
  return run.sources.find((source) => source.source_id === sourceId) || null;
}

export function buildCitationIndex(sources: Source[]): Map<string, number> {
  return new Map(sources.map((source, index) => [source.source_id, index + 1]));
}
