'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowRight,
  Check,
  FileText,
  Globe,
  Link2,
  Loader2,
  Plus,
  RefreshCw,
  Upload,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { depthDetails } from '@/lib/research-utils';
import type {
  DocumentUploadResponse,
  ParsedDocument,
  ResearchDepth,
  ResearchRequest,
  SourceMode,
} from '@/types/research';

interface ResearchComposerProps {
  initialQuery?: string;
  onStartResearch: (request: ResearchRequest) => Promise<void>;
  isLoading?: boolean;
}

type SourcePanel = 'documents' | 'urls' | null;

const sourceOptions: { id: SourcePanel; label: string; description: string; icon: typeof FileText }[] = [
  { id: null, label: 'Web Search', description: 'Use live discovery across the web', icon: Globe },
  { id: 'documents', label: 'Documents', description: 'Upload PDFs, DOCX, TXT, or Markdown', icon: FileText },
  { id: 'urls', label: 'Custom URLs', description: 'Point ResearchPilot at specific URLs', icon: Link2 },
];

function mapUploadToParsed(doc: DocumentUploadResponse): ParsedDocument {
  return {
    document_id: doc.document_id,
    filename: doc.filename,
    file_type: doc.file_type,
    char_count: doc.char_count,
    word_count: doc.word_count,
    readable: doc.readable,
    status: doc.status,
    error: doc.error,
  };
}

function getSourceMode(hasWeb: boolean, docsCount: number, urlCount: number): SourceMode {
  if (hasWeb && docsCount > 0 && urlCount > 0) return 'all';
  if (hasWeb && docsCount > 0) return 'web_documents';
  if (hasWeb && urlCount > 0) return 'web_urls';
  if (!hasWeb && docsCount > 0 && urlCount > 0) return 'all';
  if (docsCount > 0) return 'documents';
  if (urlCount > 0) return 'urls';
  return 'web';
}

export default function ResearchComposer({
  initialQuery = '',
  onStartResearch,
  isLoading = false,
}: ResearchComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sourceMenuRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState(initialQuery);
  const [depth, setDepth] = useState<ResearchDepth>('standard');
  const [activePanel, setActivePanel] = useState<SourcePanel>(null);
  const [sourceMenuOpen, setSourceMenuOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [docs, setDocs] = useState<ParsedDocument[]>([]);
  const [customUrls, setCustomUrls] = useState<string[]>([]);
  const [urlValue, setUrlValue] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmittingInternal, setIsSubmittingInternal] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(true);

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  }, [initialQuery]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (sourceMenuRef.current && !sourceMenuRef.current.contains(event.target as Node)) {
        setSourceMenuOpen(false);
      }
    };

    if (sourceMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }

    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [sourceMenuOpen]);

  const depthMeta = depthDetails[depth];
  const isBusy = isLoading || isSubmittingInternal;

  const sourceMode = useMemo(
    () => getSourceMode(webSearchEnabled, docs.length, customUrls.length),
    [customUrls.length, docs.length, webSearchEnabled],
  );

  const activeSourcesSummary = useMemo(() => {
    const items = [];
    if (webSearchEnabled) items.push('Web');
    if (docs.length) items.push(`${docs.length} doc${docs.length === 1 ? '' : 's'}`);
    if (customUrls.length) items.push(`${customUrls.length} URL${customUrls.length === 1 ? '' : 's'}`);
    return items.join(' · ');
  }, [customUrls.length, docs.length, webSearchEnabled]);

  const resizeComposer = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = '0px';
    textarea.style.height = `${Math.max(110, textarea.scrollHeight)}px`;
  };

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    setIsUploading(true);
    setErrorMessage('');

    try {
      const nextDocs: ParsedDocument[] = [];
      for (const file of Array.from(fileList)) {
        const uploaded = await api.uploadDocument(file);
        nextDocs.push(mapUploadToParsed(uploaded));
      }
      setDocs((current) => [...current, ...nextDocs]);
      setActivePanel('documents');
    } catch (uploadError) {
      setErrorMessage(uploadError instanceof Error ? uploadError.message : 'Unable to upload documents.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddUrl = () => {
    const nextUrl = urlValue.trim();
    if (!nextUrl) return;
    if (!/^https?:\/\//i.test(nextUrl)) {
      setErrorMessage('Please enter a full URL starting with http:// or https://.');
      return;
    }
    if (!customUrls.includes(nextUrl)) {
      setCustomUrls((current) => [...current, nextUrl]);
    }
    setUrlValue('');
    setErrorMessage('');
    setActivePanel('urls');
  };

  const handleSubmit = async () => {
    if (isBusy) return;

    const cleanQuery = query.trim();
    if (cleanQuery.length < 5) {
      setErrorMessage('Please enter a research question with at least 5 characters.');
      textareaRef.current?.focus();
      return;
    }

    if (!webSearchEnabled && docs.length === 0 && customUrls.length === 0) {
      setErrorMessage('Add a document or URL, or turn web search back on.');
      return;
    }

    setErrorMessage('');
    setIsSubmittingInternal(true);

    try {
      await onStartResearch({
        query: cleanQuery,
        depth,
        source_preference: 'any',
        source_mode: sourceMode,
        document_ids: docs.filter((doc) => doc.readable).map((doc) => doc.document_id),
        custom_urls: customUrls,
      });
    } catch (submitError) {
      console.error('[Research Submission Error]', submitError);
      setErrorMessage(
        submitError instanceof Error
          ? submitError.message
          : 'Research service unavailable. The research engine is not reachable right now. Check that the backend is running.'
      );
    } finally {
      setIsSubmittingInternal(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[880px]">
      <motion.div
        layout
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className={`relative rounded-[24px] border bg-[#13151b] p-5 sm:p-6 transition-all duration-200 ${
          isFocused
            ? 'border-[rgba(111,124,255,0.45)] shadow-[0_0_24px_rgba(111,124,255,0.08),0_24px_60px_rgba(0,0,0,0.55)]'
            : 'border-white/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.42)] hover:border-white/[0.12]'
        }`}
      >
        {/* TOP: Label and Active Source Indicator */}
        <div className="flex items-center justify-between gap-4 pb-2">
          <label
            htmlFor="research-query-input"
            className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] cursor-pointer"
            onClick={() => textareaRef.current?.focus()}
          >
            Research question
          </label>
          <span className="mono text-[11px] font-medium uppercase tracking-widest text-[var(--text-faint)]">
            {activeSourcesSummary || 'Web'}
          </span>
        </div>

        {/* CENTER: Multiline Input */}
        <div className="relative py-1">
          <textarea
            id="research-query-input"
            ref={textareaRef}
            value={query}
            disabled={isBusy}
            onChange={(event) => {
              setQuery(event.target.value);
              if (errorMessage) setErrorMessage('');
              resizeComposer();
            }}
            onFocus={() => {
              setIsFocused(true);
              resizeComposer();
            }}
            onBlur={() => setIsFocused(false)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                void handleSubmit();
              }
            }}
            placeholder="What would you like to research?"
            rows={3}
            aria-label="Research question"
            className="min-h-[110px] w-full resize-none border-0 bg-transparent p-0 text-[18px] sm:text-[19px] leading-[1.5] tracking-[-0.02em] text-[var(--text-strong)] placeholder:text-white/28 focus:outline-none focus:ring-0 disabled:opacity-60"
          />
        </div>

        {/* ATTACHMENTS PANELS (Documents & Custom URLs) */}
        <AnimatePresence initial={false}>
          {activePanel === 'documents' ? (
            <motion.div
              key="documents"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-white/[0.08] pt-4 mt-2"
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setIsDragging(false);
                  void handleUpload(event.dataTransfer.files);
                }}
                className={`rounded-[18px] border border-dashed p-5 text-left transition ${
                  isDragging
                    ? 'border-[var(--accent-strong)] bg-[var(--accent-soft)]'
                    : 'border-white/12 bg-white/[0.02] hover:bg-white/[0.04]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.docx,.doc,.txt,.md,.markdown,.csv"
                  className="hidden"
                  onChange={(event) => void handleUpload(event.target.files)}
                />
                <div className="flex items-center gap-3">
                  <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5">
                    <Upload className="h-4 w-4 text-[var(--accent-strong)]" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-[var(--text-strong)]">Drop files here or click to browse</div>
                    <div className="text-xs text-[var(--text-muted)]">Supported: PDF, DOCX, TXT, Markdown, CSV</div>
                  </div>
                </div>
                <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs text-[var(--text-main)]">
                  {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                  <span>{isUploading ? 'Uploading documents…' : 'Browse files'}</span>
                </div>
              </div>

              {docs.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {docs.map((doc) => (
                    <div
                      key={doc.document_id}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-[var(--text-main)]"
                    >
                      <FileText className="h-3.5 w-3.5 text-[var(--accent-strong)]" />
                      <span className="max-w-[200px] truncate">{doc.filename}</span>
                      {doc.readable ? <Check className="h-3.5 w-3.5 text-[var(--success)]" /> : null}
                      <button
                        type="button"
                        onClick={() => setDocs((current) => current.filter((item) => item.document_id !== doc.document_id))}
                        className="rounded-full p-0.5 text-[var(--text-faint)] transition hover:text-[var(--text-main)]"
                        aria-label={`Remove ${doc.filename}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </motion.div>
          ) : null}

          {activePanel === 'urls' ? (
            <motion.div
              key="urls"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-white/[0.08] pt-4 mt-2"
            >
              <div className="rounded-[18px] border border-white/10 bg-white/[0.02] p-4">
                <label htmlFor="custom-url-input" className="mb-2 block text-xs text-[var(--text-muted)]">
                  Paste source URL
                </label>
                <div className="flex flex-col gap-2.5 sm:flex-row">
                  <input
                    id="custom-url-input"
                    type="url"
                    value={urlValue}
                    onChange={(event) => setUrlValue(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        handleAddUrl();
                      }
                    }}
                    placeholder="https://example.com/article"
                    className="w-full rounded-xl border border-white/10 bg-[var(--bg-app-alt)] px-3.5 py-2 text-sm text-[var(--text-main)] outline-none placeholder:text-white/25 focus:border-[var(--accent-strong)]"
                  />
                  <button
                    type="button"
                    onClick={handleAddUrl}
                    className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-medium text-[var(--text-strong)] transition hover:bg-white/[0.09]"
                  >
                    Add URL
                  </button>
                </div>
              </div>

              {customUrls.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {customUrls.map((url) => (
                    <div
                      key={url}
                      className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-[var(--text-main)]"
                    >
                      <Link2 className="h-3.5 w-3.5 text-[var(--accent-strong)]" />
                      <span className="max-w-[260px] truncate">{url}</span>
                      <button
                        type="button"
                        onClick={() => setCustomUrls((current) => current.filter((item) => item !== url))}
                        className="rounded-full p-0.5 text-[var(--text-faint)] transition hover:text-[var(--text-main)]"
                        aria-label={`Remove ${url}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* BOTTOM: Preserved Controls */}
        <div className="mt-4 flex flex-col gap-4 border-t border-white/[0.08] pt-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Left: Source Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div ref={sourceMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setSourceMenuOpen((current) => !current)}
                className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-[var(--text-main)] transition hover:bg-white/[0.08]"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add source</span>
              </button>

              <AnimatePresence>
                {sourceMenuOpen ? (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 top-full z-30 mt-2 w-[280px] rounded-[20px] border border-white/10 bg-[#161822] p-2 shadow-2xl backdrop-blur-xl"
                  >
                    {sourceOptions.map((option) => {
                      const Icon = option.icon;
                      return (
                        <button
                          key={option.label}
                          type="button"
                          onClick={() => {
                            setSourceMenuOpen(false);
                            if (option.id === null) {
                              setWebSearchEnabled((current) => !current);
                              return;
                            }
                            setActivePanel(option.id);
                          }}
                          className="focus-ring flex w-full items-start gap-3 rounded-[14px] p-2.5 text-left transition hover:bg-white/[0.06]"
                        >
                          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2 shrink-0">
                            <Icon className="h-3.5 w-3.5 text-[var(--accent-strong)]" />
                          </div>
                          <div>
                            <div className="text-xs font-medium text-[var(--text-strong)]">{option.label}</div>
                            <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">{option.description}</div>
                            {option.id === null ? (
                              <div className="mt-1 text-[10px] text-[var(--text-faint)]">
                                {webSearchEnabled ? 'Currently enabled' : 'Currently disabled'}
                              </div>
                            ) : null}
                          </div>
                        </button>
                      );
                    })}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            <button
              type="button"
              onClick={() => setWebSearchEnabled((current) => !current)}
              className={`focus-ring rounded-full border px-3 py-2 text-xs font-medium transition ${
                webSearchEnabled
                  ? 'border-[rgba(111,124,255,0.35)] bg-[var(--accent-soft)] text-[var(--text-strong)]'
                  : 'border-white/10 bg-white/[0.03] text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              Web search
            </button>

            {docs.length ? (
              <button
                type="button"
                onClick={() => setActivePanel(activePanel === 'documents' ? null : 'documents')}
                className="focus-ring rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-[var(--text-main)] transition hover:bg-white/[0.06]"
              >
                Documents · {docs.length}
              </button>
            ) : null}

            {customUrls.length ? (
              <button
                type="button"
                onClick={() => setActivePanel(activePanel === 'urls' ? null : 'urls')}
                className="focus-ring rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-[var(--text-main)] transition hover:bg-white/[0.06]"
              >
                Custom URLs · {customUrls.length}
              </button>
            ) : null}
          </div>

          {/* Right: Depth & Research Button */}
          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3.5">
            <div className="flex flex-col items-start sm:items-end">
              {/* Depth Segmented Pills */}
              <div className="flex rounded-full border border-white/10 bg-white/[0.03] p-0.5">
                {(['quick', 'standard', 'deep'] as ResearchDepth[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setDepth(option)}
                    className={`focus-ring rounded-full px-3 py-1.5 text-xs font-medium transition ${
                      depth === option
                        ? 'bg-white/[0.12] text-[var(--text-strong)] shadow-sm'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    {depthDetails[option].label}
                  </button>
                ))}
              </div>
              {/* Depth Subtitle */}
              <div className="mt-1.5 hidden text-[11px] text-[var(--text-muted)] sm:block">
                {depthMeta.label} · {depthMeta.summary}
              </div>
            </div>

            {/* Research Submit Button */}
            <button
              id="research-submit-btn"
              type="button"
              disabled={isBusy}
              onClick={() => void handleSubmit()}
              className="focus-ring group inline-flex items-center gap-2 rounded-full bg-[var(--text-strong)] px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-white active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer shadow-sm shadow-white/10"
            >
              {isBusy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Researching…</span>
                </>
              ) : (
                <>
                  <span>Research</span>
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>

      {/* POLISHED ERROR RECOVERY BANNER */}
      <AnimatePresence>
        {errorMessage ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="mt-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-[18px] border border-[rgba(207,111,124,0.32)] bg-[rgba(30,14,18,0.85)] px-4 py-3 text-sm text-[#f0c0c7] backdrop-blur-md"
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 text-[var(--danger)] shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-white/95">Research service unavailable</div>
                <div className="text-xs text-white/75 mt-0.5">{errorMessage}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <button
                type="button"
                onClick={() => void handleSubmit()}
                className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/20 cursor-pointer"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Retry</span>
              </button>
              <button
                type="button"
                onClick={() => setErrorMessage('')}
                className="focus-ring rounded-full p-1 text-white/60 transition hover:text-white cursor-pointer"
                aria-label="Dismiss error"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
