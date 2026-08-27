'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowLeft, Download, Command, Clock } from 'lucide-react';
import type { ConfigStatus, RunStatus } from '@/types/research';

interface HeaderProps {
  config?: ConfigStatus | null;
  runId?: string;
  query?: string;
  status?: RunStatus;
  durationSeconds?: number;
  onExport?: () => void;
}

export default function Header({
  config,
  runId,
  query,
  status,
  durationSeconds,
  onExport,
}: HeaderProps) {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-40 w-full h-14 border-b border-[var(--border-default)] bg-[var(--bg-canvas)]/85 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between transition-colors">
      {/* Left: Brand or Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        {runId ? (
          <div className="flex items-center gap-3">
            <button
              id="back-home-btn"
              onClick={() => router.push('/')}
              aria-label="Back to home"
              className="p-1.5 text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--bg-surface-raised)] border border-transparent hover:border-[var(--border-default)] rounded-md transition-all flex items-center justify-center cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="h-4 w-px bg-[var(--border-default)]" />
            <Link
              href="/"
              className="flex items-center gap-2.5 group focus:outline-none"
            >
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-sm shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18m9-9H3m14.5-5.5l-11 11m11 0l-11-11" />
                </svg>
              </div>
              <span className="font-semibold text-xs tracking-tight text-[var(--text-1)] hidden md:inline">
                ResearchPilot
              </span>
            </Link>
            {query && (
              <span className="text-xs text-[var(--text-3)] max-w-[200px] sm:max-w-[320px] truncate hidden sm:inline">
                / {query}
              </span>
            )}
          </div>
        ) : (
          <Link
            href="/"
            className="flex items-center gap-2.5 group focus:outline-none"
          >
            {/* Custom ResearchPilot Precision Geometric Mark */}
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-700 flex items-center justify-center shadow-md shadow-indigo-500/25 group-hover:scale-105 transition-all">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="12" cy="12" r="9" strokeOpacity="0.4" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v4m0 12v4M2 12h4m12 0h4" />
                <circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity="0.9" />
              </svg>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-bold text-sm tracking-tight text-[var(--text-1)]">
                ResearchPilot
              </span>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                AI
              </span>
            </div>
          </Link>
        )}
      </div>

      {/* Right: Status Pills & Action Controls */}
      <div className="flex items-center gap-2.5 sm:gap-3.5">
        {/* Active Config Badges (Shown when config available) */}
        {config && !runId && (
          <div className="hidden lg:flex items-center gap-2 text-xs">
            <span
              className={`badge-tag ${
                config.gemini === 'configured'
                  ? 'badge-green'
                  : 'badge-neutral opacity-50'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${config.gemini === 'configured' ? 'bg-emerald-400' : 'bg-gray-500'}`} />
              Gemini 2.5
            </span>
            <span
              className={`badge-tag ${
                config.groq === 'configured'
                  ? 'badge-violet'
                  : 'badge-neutral opacity-50'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${config.groq === 'configured' ? 'bg-indigo-400' : 'bg-gray-500'}`} />
              Groq Fallback
            </span>
            <span
              className={`badge-tag ${
                config.qdrant === 'configured'
                  ? 'badge-teal'
                  : 'badge-neutral opacity-50'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${config.qdrant === 'configured' ? 'bg-cyan-400' : 'bg-gray-500'}`} />
              Qdrant RAG
            </span>
          </div>
        )}

        {/* Duration during research */}
        {typeof durationSeconds === 'number' && durationSeconds > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-2)] bg-[var(--bg-surface-raised)] border border-[var(--border-default)] px-2.5 py-1 rounded-md">
            <Clock className="w-3.5 h-3.5 text-[var(--text-3)]" />
            <span className="mono font-medium">{durationSeconds.toFixed(1)}s</span>
          </div>
        )}

        {/* Run status indicator */}
        {status && (
          <div className="flex items-center gap-1.5 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                status === 'running'
                  ? 'bg-indigo-400 animate-pulse'
                  : status === 'completed'
                  ? 'bg-emerald-400'
                  : status === 'failed'
                  ? 'bg-rose-400'
                  : 'bg-gray-500'
              }`}
            />
            <span className="capitalize font-medium text-[var(--text-2)] hidden xs:inline">
              {status}
            </span>
          </div>
        )}

        {/* Export Button (when completed) */}
        {status === 'completed' && onExport && (
          <button
            id="header-export-btn"
            onClick={onExport}
            className="flex items-center gap-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-98 transition-all px-3 py-1.5 rounded-md shadow-sm shadow-indigo-600/30 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export Obsidian</span>
            <span className="sm:hidden">Export</span>
          </button>
        )}

        {/* Keyboard shortcut helper on home */}
        {!runId && (
          <div className="hidden sm:flex items-center gap-1">
            <kbd>
              <Command className="w-2.5 h-2.5 inline" />K
            </kbd>
          </div>
        )}
      </div>
    </header>
  );
}
