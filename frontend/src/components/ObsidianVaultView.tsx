'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Folder, FolderOpen, FileText, Download, Check,
  BookOpen, Sparkles, Layers, ArrowRight, Copy, CheckCheck
} from 'lucide-react';
import { api } from '@/lib/api';
import type { ResearchRun, ObsidianNote } from '@/types/research';

interface ObsidianVaultViewProps {
  run: ResearchRun;
}

export default function ObsidianVaultView({ run }: ObsidianVaultViewProps) {
  const [selectedNote, setSelectedNote] = useState<string>('00 - Index.md');
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set(['Research', 'Topics', 'Sources']));
  const [copied, setCopied] = useState(false);

  // Export sequence state: idle -> generating -> linking -> building -> ready
  const [exportStep, setExportStep] = useState<'idle' | 'generating' | 'linking' | 'building' | 'ready'>('idle');

  const toggleFolder = (folder: string) => {
    setOpenFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folder)) next.delete(folder);
      else next.add(folder);
      return next;
    });
  };

  // Construct or preview note structure directly matching backend ObsidianExporter
  const topicSlug = run.query ? run.query.slice(0, 45).replace(/[^\w\s-]/g, '').trim() || 'Research Topic' : 'Research Topic';

  // Topic notes from subquestions / findings
  const topicNames = run.plan?.subquestions?.map((sq) => sq.question.split('?')[0].trim().slice(0, 35)) || ['Overview', 'Key Findings'];

  const sourcesList = run.sources?.filter((s) => s.extraction_success || s.content).slice(0, 8) || [];

  // Generate dynamic note preview content
  const getNoteContent = (filename: string): { title: string; content: string; frontmatter: Record<string, any> } => {
    if (filename === '00 - Index.md') {
      return {
        title: 'Research Index',
        frontmatter: {
          title: 'Research Index',
          type: 'index',
          tags: ['research-index', 'researchpilot', 'rag'],
          date: run.created_at ? run.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
        },
        content: `# Research Index

## Research Overview
- **Question**: ${run.query}
- **Depth**: ${run.depth?.toUpperCase()}
- **Source Mode**: ${run.source_mode?.toUpperCase() || 'WEB'}
- **Status**: ${run.status?.toUpperCase()}

## Research Reports
- [[Research/${topicSlug}|${run.query}]]

## Sub-Topics
${topicNames.map((t) => `- [[Topics/${t}|${t}]]`).join('\n')}

## Grounded Sources
${sourcesList.map((s, idx) => `- [[Sources/Source ${String(idx + 1).padStart(2, '0')} - ${(s.title || s.domain || 'Source').slice(0, 30)}|Source ${String(idx + 1).padStart(2, '0')}: ${s.title || s.domain}]] [${s.source_type.toUpperCase()}]`).join('\n')}

## Research Statistics
- Sources processed: ${run.stats?.sources_accepted || 0}
- Documents ingested: ${run.stats?.documents_uploaded || 0}
- Chunks indexed in Qdrant: ${run.stats?.chunks_indexed || 0}
- Findings synthesized: ${run.synthesis?.key_findings?.length || 0}
- Research duration: ${run.stats?.duration_seconds?.toFixed(1) || 0}s

---
*Generated autonomously by ResearchPilot AI*`,
      };
    }

    if (filename.startsWith('Research/')) {
      return {
        title: run.query,
        frontmatter: {
          title: run.query.slice(0, 60),
          type: 'research',
          tags: ['research', 'synthesis', 'evidence-backed'],
          date: run.created_at ? run.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
          status: 'completed',
        },
        content: `# ${run.query}

[[00 - Index|← Back to Research Index]]

## Executive Summary
${run.synthesis?.executive_summary || 'Comprehensive autonomous research synthesis.'}

## Key Findings
${run.synthesis?.key_findings?.map((f, i) => `${i + 1}. **${f.finding}** [Confidence: *${f.confidence}*]`).join('\n\n') || 'No findings recorded.'}

## Evidence Analysis
${run.synthesis?.evidence_summary || 'Evidence evaluated against vector knowledge store.'}

## Conclusion
${run.synthesis?.conclusion || 'Refer to individual source files.'}`,
      };
    }

    if (filename.startsWith('Topics/')) {
      const topicTitle = filename.replace('Topics/', '').replace('.md', '');
      return {
        title: topicTitle,
        frontmatter: {
          title: topicTitle,
          type: 'topic',
          tags: ['topic', topicTitle.toLowerCase().replace(/\s+/g, '-').slice(0, 20)],
          date: run.created_at ? run.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
        },
        content: `# ${topicTitle}

Related Research: [[Research/${topicSlug}|Main Research Report]] | [[00 - Index|Index]]

## Topic Overview
This sub-topic vector was identified and evaluated during autonomous research on "${run.query}".

## Grounded Insights
- Sub-questions investigated across literature and document corpus.
- Cross-verified with RAG vector indices.`,
      };
    }

    if (filename.startsWith('Sources/')) {
      const idxStr = filename.match(/Source (\d+)/)?.[1] || '1';
      const sIdx = parseInt(idxStr, 10) - 1;
      const s = sourcesList[sIdx] || run.sources?.[0];
      return {
        title: s?.title || `Source ${idxStr}`,
        frontmatter: {
          title: s?.title || 'Source Note',
          type: 'source',
          source_type: s?.source_type || 'web',
          url: s?.url || '',
          domain: s?.domain || '',
        },
        content: `# ${s?.title || 'Source Note'}

Related Research: [[Research/${topicSlug}|Main Research Report]] | [[00 - Index|Index]]

## Metadata
- **Source Type**: \`${s?.source_type?.toUpperCase() || 'WEB'}\`
- **Domain**: ${s?.domain || 'unknown'}
- **URL**: ${s?.url || 'n/a'}
- **Length**: ${s?.content_length || 0} characters

## Content Excerpt
${s?.content?.slice(0, 1000) || 'No excerpt available.'}`,
      };
    }

    return {
      title: filename,
      frontmatter: { title: filename },
      content: `# ${filename}`,
    };
  };

  const activeNoteData = getNoteContent(selectedNote);

  const handleCopyNote = () => {
    const text = `---
${Object.entries(activeNoteData.frontmatter).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join('\n')}
---

${activeNoteData.content}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const triggerExportSequence = async () => {
    setExportStep('generating');
    await new Promise((r) => setTimeout(r, 450));
    setExportStep('linking');
    await new Promise((r) => setTimeout(r, 450));
    setExportStep('building');
    await new Promise((r) => setTimeout(r, 450));
    setExportStep('ready');

    // Trigger actual browser download
    const url = api.getObsidianExportUrl(run.run_id);
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6 max-w-3xl animate-fade-in">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[var(--border-default)]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-[var(--text-1)]">
              Obsidian Knowledge Vault
            </h2>
            <span className="badge-tag badge-purple font-mono text-xs">
              Markdown + [[Wiki Links]]
            </span>
          </div>
          <p className="text-xs text-[var(--text-3)] mt-0.5">
            Interconnected knowledge graph with frontmatter tags and bidirectional references.
          </p>
        </div>

        {/* Action button */}
        <button
          id="export-vault-trigger"
          type="button"
          onClick={triggerExportSequence}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-xs font-semibold text-white transition-all cursor-pointer shadow-md shadow-indigo-600/20 shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Download Vault (.zip)</span>
        </button>
      </div>

      {/* ── Export Animation Sequence (Progressive Disclosure) ──── */}
      <AnimatePresence>
        {exportStep !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/10 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-indigo-300 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Vault Packaging Sequence
              </span>
              {exportStep === 'ready' && (
                <span className="badge-tag badge-green text-[10px] font-mono">
                  ✓ ZIP Download Started
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
              <div className="p-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Generating notes</span>
              </div>
              <div className={`p-2 rounded-lg border flex items-center gap-1.5 ${['linking', 'building', 'ready'].includes(exportStep) ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : 'border-[var(--border-subtle)] text-[var(--text-3)]'}`}>
                {['linking', 'building', 'ready'].includes(exportStep) ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                <span>Linking sources</span>
              </div>
              <div className={`p-2 rounded-lg border flex items-center gap-1.5 ${['building', 'ready'].includes(exportStep) ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : 'border-[var(--border-subtle)] text-[var(--text-3)]'}`}>
                {['building', 'ready'].includes(exportStep) ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                <span>Building vault</span>
              </div>
              <div className={`p-2 rounded-lg border flex items-center gap-1.5 ${exportStep === 'ready' ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : 'border-[var(--border-subtle)] text-[var(--text-3)]'}`}>
                {exportStep === 'ready' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                <span>ZIP Ready</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Mini Knowledge Workspace: File Tree + Live Note Preview ─ */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 min-h-[420px] rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface-raised)]/50 overflow-hidden">
        {/* Left Column: Interactive File Tree (4 cols) */}
        <div className="md:col-span-5 p-3 border-b md:border-b-0 md:border-r border-[var(--border-default)] bg-[var(--bg-canvas)]/60 font-mono text-xs space-y-2 select-none overflow-y-auto">
          <div className="flex items-center gap-2 p-1.5 text-[var(--text-3)] font-semibold uppercase tracking-wider text-[10px]">
            <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
            <span>ResearchPilot-Vault</span>
          </div>

          {/* Root Index Note */}
          <button
            type="button"
            onClick={() => setSelectedNote('00 - Index.md')}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
              selectedNote === '00 - Index.md'
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                : 'text-[var(--text-2)] hover:bg-[var(--bg-card)]'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="truncate">00 - Index.md</span>
          </button>

          {/* Research/ Folder */}
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => toggleFolder('Research')}
              className="w-full flex items-center gap-1.5 px-2 py-1 text-left text-[var(--text-3)] hover:text-white cursor-pointer"
            >
              {openFolders.has('Research') ? <FolderOpen className="w-3.5 h-3.5 text-amber-400" /> : <Folder className="w-3.5 h-3.5 text-amber-400" />}
              <span className="font-semibold">Research/</span>
            </button>
            {openFolders.has('Research') && (
              <div className="pl-4 space-y-1 border-l border-[var(--border-subtle)] ml-2">
                <button
                  type="button"
                  onClick={() => setSelectedNote(`Research/${topicSlug}.md`)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                    selectedNote === `Research/${topicSlug}.md`
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                      : 'text-[var(--text-2)] hover:bg-[var(--bg-card)]'
                  }`}
                >
                  <FileText className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span className="truncate">{topicSlug}.md</span>
                </button>
              </div>
            )}
          </div>

          {/* Topics/ Folder */}
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => toggleFolder('Topics')}
              className="w-full flex items-center gap-1.5 px-2 py-1 text-left text-[var(--text-3)] hover:text-white cursor-pointer"
            >
              {openFolders.has('Topics') ? <FolderOpen className="w-3.5 h-3.5 text-cyan-400" /> : <Folder className="w-3.5 h-3.5 text-cyan-400" />}
              <span className="font-semibold">Topics/ ({topicNames.length})</span>
            </button>
            {openFolders.has('Topics') && (
              <div className="pl-4 space-y-1 border-l border-[var(--border-subtle)] ml-2">
                {topicNames.map((t, idx) => {
                  const notePath = `Topics/${t}.md`;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedNote(notePath)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                        selectedNote === notePath
                          ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                          : 'text-[var(--text-2)] hover:bg-[var(--bg-card)]'
                      }`}
                    >
                      <FileText className="w-3 h-3 text-cyan-400 shrink-0" />
                      <span className="truncate">{t}.md</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sources/ Folder */}
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => toggleFolder('Sources')}
              className="w-full flex items-center gap-1.5 px-2 py-1 text-left text-[var(--text-3)] hover:text-white cursor-pointer"
            >
              {openFolders.has('Sources') ? <FolderOpen className="w-3.5 h-3.5 text-purple-400" /> : <Folder className="w-3.5 h-3.5 text-purple-400" />}
              <span className="font-semibold">Sources/ ({sourcesList.length})</span>
            </button>
            {openFolders.has('Sources') && (
              <div className="pl-4 space-y-1 border-l border-[var(--border-subtle)] ml-2">
                {sourcesList.map((s, idx) => {
                  const notePath = `Sources/Source ${String(idx + 1).padStart(2, '0')}.md`;
                  return (
                    <button
                      key={s.source_id}
                      type="button"
                      onClick={() => setSelectedNote(notePath)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                        selectedNote === notePath
                          ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                          : 'text-[var(--text-2)] hover:bg-[var(--bg-card)]'
                      }`}
                    >
                      <FileText className="w-3 h-3 text-purple-400 shrink-0" />
                      <span className="truncate">Source {String(idx + 1).padStart(2, '0')}.md</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Note Preview Surface (7 cols) */}
        <div className="md:col-span-7 flex flex-col h-full bg-[var(--bg-card)]/40 overflow-hidden">
          {/* Note Top bar */}
          <div className="p-3 px-4 border-b border-[var(--border-default)] flex items-center justify-between gap-2 bg-[var(--bg-surface)]">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="mono text-xs font-semibold text-white truncate">
                {selectedNote}
              </span>
            </div>

            <button
              type="button"
              onClick={handleCopyNote}
              className="flex items-center gap-1 text-[11px] font-mono text-[var(--text-3)] hover:text-white p-1 rounded transition-colors cursor-pointer"
              title="Copy Markdown note"
            >
              {copied ? (
                <>
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          {/* Note Content Viewer */}
          <div className="p-4 sm:p-5 overflow-y-auto max-h-[380px] space-y-4 font-mono text-xs text-[var(--text-2)] leading-relaxed">
            {/* Frontmatter YAML Box */}
            <div className="p-3 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-3)] space-y-0.5">
              <span className="text-indigo-400">---</span>
              {Object.entries(activeNoteData.frontmatter).map(([k, v]) => (
                <div key={k}>
                  <span className="text-cyan-400">{k}</span>: <span className="text-[var(--text-2)]">{JSON.stringify(v)}</span>
                </div>
              ))}
              <span className="text-indigo-400">---</span>
            </div>

            {/* Note Body */}
            <div className="whitespace-pre-wrap font-sans text-xs text-[var(--text-1)] leading-relaxed">
              {activeNoteData.content}
            </div>
          </div>
        </div>
      </div>

      {/* Instructions Card */}
      <div className="p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface-raised)]/40 text-xs text-[var(--text-2)] space-y-2">
        <span className="font-semibold text-white block">Using in Obsidian:</span>
        <ol className="list-decimal list-inside space-y-1 text-[var(--text-3)] leading-relaxed">
          <li>Click <strong className="text-white">Download Vault (.zip)</strong> above.</li>
          <li>Unzip into your local Obsidian vaults directory.</li>
          <li>In Obsidian, click <em className="text-white">Open folder as vault</em> and select the extracted folder.</li>
          <li>Explore the full bidirectional knowledge graph starting from <code className="mono text-indigo-300">00 - Index.md</code>!</li>
        </ol>
      </div>
    </div>
  );
}
