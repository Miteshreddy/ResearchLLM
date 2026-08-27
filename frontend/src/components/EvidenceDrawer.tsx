'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ExternalLink, X } from 'lucide-react';
import type { Claim, FactCheckResult, Source } from '@/types/research';
import { getDomain, getSourceTypeLabel, verificationLabels } from '@/lib/research-utils';

interface EvidenceDrawerProps {
  claim: Claim | null;
  factCheck: FactCheckResult | null | undefined;
  source: Source | null | undefined;
  onClose: () => void;
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-white/8 pb-4">
      <div className="mono text-[11px] uppercase tracking-[0.14em] text-[var(--text-faint)]">{label}</div>
      <div className="mt-2 text-sm leading-relaxed text-[var(--text-main)]">{value}</div>
    </div>
  );
}

export default function EvidenceDrawer({
  claim,
  factCheck,
  source,
  onClose,
}: EvidenceDrawerProps) {
  return (
    <AnimatePresence>
      {claim ? (
        <>
          <motion.button
            type="button"
            aria-label="Close evidence inspector"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/45 backdrop-blur-sm lg:bg-black/25"
          />

          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-0 right-0 top-auto z-50 h-[84vh] w-full rounded-t-[28px] border border-white/10 bg-[var(--bg-panel)] p-5 shadow-2xl sm:max-w-[560px] sm:rounded-none sm:border-l lg:top-16 lg:h-[calc(100vh-4rem)]"
          >
            <div className="flex h-full flex-col">
              <div className="mb-5 flex items-start justify-between gap-4 border-b border-white/8 pb-4">
                <div>
                  <div className="eyebrow">Evidence</div>
                  <h2 className="mt-2 text-2xl">Inspector</h2>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="focus-ring rounded-full border border-white/10 bg-white/[0.03] p-2 text-[var(--text-muted)] transition hover:bg-white/[0.06] hover:text-[var(--text-main)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 space-y-5 overflow-y-auto pr-1">
                <MetaRow label="Claim" value={claim.claim_text} />
                <MetaRow label="Source" value={source?.title || 'Source details not yet available'} />
                <MetaRow label="Excerpt" value={claim.evidence_excerpt || 'No excerpt was returned for this claim.'} />
                <MetaRow label="Source type" value={source ? `${getSourceTypeLabel(source)} · ${getDomain(source)}` : 'Unknown'} />
                <MetaRow label="Relevance" value={source?.relevance_score !== undefined ? `${Math.round(source.relevance_score * 100)}%` : 'Not scored'} />
                <MetaRow
                  label="Status"
                  value={factCheck ? verificationLabels[factCheck.verification_status] : 'Evidence still processing'}
                />

                {factCheck?.reasoning ? <MetaRow label="Assessment" value={factCheck.reasoning} /> : null}
              </div>

              {source?.url ? (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="focus-ring mt-5 inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-[var(--text-main)] transition hover:bg-white/[0.08]"
                >
                  <span>Open source</span>
                  <ExternalLink className="h-4 w-4" />
                </a>
              ) : null}
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
