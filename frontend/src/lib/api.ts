// ResearchPilot AI - API Client

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

import type {
  ResearchRequest, ResearchRun, ConfigStatus, Source,
  SourceEvaluation, Evidence, HistoryItem, DocumentUploadResponse,
} from '@/types/research';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
  } catch (err) {
    console.error(`[API Network Error] ${path}:`, err);
    throw new Error(
      `Research service unavailable. The research engine is not reachable right now. Check that the backend is running on ${API_BASE}.`
    );
  }

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error (${response.status}): ${error}`);
  }

  return response.json();
}

export const api = {
  // Health & Config
  health: () => apiFetch<{ status: string; version: string }>('/api/health'),
  configStatus: () => apiFetch<ConfigStatus>('/api/config/status'),

  // Document Upload
  uploadDocument: async (file: File): Promise<DocumentUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    let response: Response;
    try {
      response = await fetch(`${API_BASE}/api/research/upload`, {
        method: 'POST',
        body: formData,
      });
    } catch (err) {
      console.error('[API Network Error] /api/research/upload:', err);
      throw new Error(
        `Upload service unavailable. The research engine is not reachable right now. Check that the backend is running on ${API_BASE}.`
      );
    }
    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Upload Error (${response.status}): ${err}`);
    }
    return response.json();
  },

  // Research
  startResearch: (request: ResearchRequest) =>
    apiFetch<{ run_id: string; status: string }>('/api/research', {
      method: 'POST',
      body: JSON.stringify(request),
    }),

  getResearch: (runId: string) =>
    apiFetch<ResearchRun>(`/api/research/${runId}`),

  getSources: (runId: string) =>
    apiFetch<{ sources: (Source & { evaluation?: SourceEvaluation })[] }>(
      `/api/research/${runId}/sources`
    ),

  getEvidence: (runId: string) =>
    apiFetch<{
      evidence: { claim: any; fact_check: any }[];
      contradictions: any[];
    }>(`/api/research/${runId}/evidence`),

  getReport: (runId: string) =>
    apiFetch<{ synthesis: any; stats: any; sources_count: number }>(
      `/api/research/${runId}/report`
    ),

  getHistory: () =>
    apiFetch<{ runs: HistoryItem[] }>('/api/research/history/list'),

  // RAG Search
  ragSearch: (query: string, topK: number = 8, runId?: string) =>
    apiFetch<{ results: Evidence[]; total_chunks: number }>('/api/rag/search', {
      method: 'POST',
      body: JSON.stringify({ query, top_k: topK, run_id: runId }),
    }),

  // Obsidian Export URL (direct download)
  getObsidianExportUrl: (runId: string) =>
    `${API_BASE}/api/research/${runId}/export/obsidian`,

  // SSE Events URL
  getEventsUrl: (runId: string) =>
    `${API_BASE}/api/research/${runId}/events`,
};
