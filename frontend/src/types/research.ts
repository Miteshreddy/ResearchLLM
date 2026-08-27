// ResearchPilot AI - TypeScript Type Definitions
// Mirrors the backend Pydantic schemas

export type ResearchDepth = 'quick' | 'standard' | 'deep';
export type SourcePreference = 'any' | 'academic' | 'official' | 'news';
export type SourceMode = 'web' | 'documents' | 'urls' | 'web_documents' | 'web_urls' | 'all';
export type SourceType = 'web' | 'document' | 'url' | 'academic' | 'government' | 'official_docs' | 'company' | 'news' | 'blog' | 'community' | 'other';
export type AgentStage = 'planner' | 'research' | 'extraction' | 'evaluation' | 'knowledge_indexing' | 'claim_extraction' | 'fact_checking' | 'synthesis' | 'obsidian_export';
export type StageStatus = 'queued' | 'running' | 'completed' | 'skipped' | 'failed';
export type VerificationStatus = 'supported' | 'partially_supported' | 'contradicted' | 'insufficient_evidence';
export type RunStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface ResearchRequest {
  query: string;
  depth: ResearchDepth;
  source_preference: SourcePreference;
  source_mode?: SourceMode;
  document_ids?: string[];
  custom_urls?: string[];
}

export interface ParsedDocument {
  document_id: string;
  filename: string;
  file_type: string;
  char_count: number;
  word_count: number;
  readable: boolean;
  status: string;
  error?: string;
}

export interface DocumentUploadResponse {
  document_id: string;
  filename: string;
  file_type: string;
  char_count: number;
  word_count: number;
  readable: boolean;
  status: string;
  message: string;
  error?: string;
}

export interface SubQuestion {
  question: string;
  search_queries: string[];
  priority: number;
  evidence_types: string[];
}

export interface ResearchPlan {
  objective: string;
  subquestions: SubQuestion[];
  estimated_sources: number;
}

export interface Source {
  source_id: string;
  title: string;
  url: string;
  domain: string;
  author?: string;
  published_date?: string;
  source_type: string;
  document_format?: string;
  content: string;
  content_length: number;
  extraction_success: boolean;
  extraction_error?: string;
  retrieved_at: string;
  summary?: string;
  relevance_score?: number;
  credibility_score?: number;
  evidence_quality?: string;
  reasoning?: string;
  evaluation?: SourceEvaluation;
}

export interface SourceEvaluation {
  source_id: string;
  relevance_score: number;
  credibility_score: number;
  evidence_quality: string;
  recency_assessment: string;
  source_category: string;
  potential_bias: string;
  reasoning: string;
  accepted: boolean;
}

export interface Claim {
  claim_id: string;
  claim_text: string;
  source_id: string;
  evidence_excerpt: string;
  topic: string;
  confidence: number;
}

export interface Evidence {
  chunk_text: string;
  source_id: string;
  source_title: string;
  source_url: string;
  similarity_score: number;
  metadata: Record<string, unknown>;
}

export interface FactCheckResult {
  claim_id: string;
  claim_text: string;
  verification_status: VerificationStatus;
  supporting_evidence: string[];
  contradicting_evidence: string[];
  reasoning: string;
  confidence: number;
}

export interface Contradiction {
  claim_text: string;
  source_a: string;
  source_a_position: string;
  source_b: string;
  source_b_position: string;
  conclusion: string;
}

export interface KeyFinding {
  finding: string;
  supporting_sources: string[];
  confidence: string;
}

export interface Synthesis {
  executive_summary: string;
  research_question: string;
  key_findings: KeyFinding[];
  evidence_summary: string;
  contradictions: Contradiction[];
  source_quality_summary: string;
  limitations: string[];
  open_questions: string[];
  conclusion: string;
}

export interface ResearchStats {
  sources_discovered: number;
  sources_accepted: number;
  sources_rejected: number;
  documents_uploaded: number;
  claims_extracted: number;
  claims_verified: number;
  contradictions_found: number;
  chunks_indexed: number;
  chunks_retrieved: number;
  duration_seconds: number;
}

export interface AgentEvent {
  run_id: string;
  stage: AgentStage;
  status: StageStatus;
  message: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface ObsidianNote {
  filename: string;
  path: string;
  content: string;
  frontmatter: Record<string, unknown>;
}

export interface ObsidianVault {
  notes: ObsidianNote[];
  vault_name: string;
}

export interface ResearchRun {
  run_id: string;
  query: string;
  depth: ResearchDepth;
  source_preference: SourcePreference;
  source_mode: SourceMode;
  status: RunStatus;
  created_at: string;
  completed_at?: string;
  plan?: ResearchPlan;
  sources: Source[];
  evaluations: SourceEvaluation[];
  claims: Claim[];
  fact_checks: FactCheckResult[];
  contradictions: Contradiction[];
  synthesis?: Synthesis;
  obsidian_vault?: ObsidianVault;
  stats: ResearchStats;
  events: AgentEvent[];
  error?: string;
}

export interface ConfigStatus {
  gemini: string;
  groq: string;
  tavily: string;
  firecrawl: string;
  qdrant: string;
  mock_mode: boolean;
}

export interface HistoryItem {
  run_id: string;
  query: string;
  depth: string;
  status: string;
  created_at: string;
  completed_at?: string;
}
