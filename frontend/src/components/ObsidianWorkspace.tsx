'use client';

import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { api } from '@/lib/api';
import type { ObsidianNote, ResearchRun } from '@/types/research';

function groupNotes(notes: ObsidianNote[]) {
  return notes.reduce<Record<string, ObsidianNote[]>>((accumulator, note) => {
    const group = note.path.split('/')[0] || 'Vault';
    accumulator[group] = accumulator[group] || [];
    accumulator[group].push(note);
    return accumulator;
  }, {});
}

export default function ObsidianWorkspace({ run }: { run: ResearchRun }) {
  const notes = run.obsidian_vault?.notes || [];
  const grouped = useMemo(() => groupNotes(notes), [notes]);
  const firstNote = notes[0] || null;
  const [selectedPath, setSelectedPath] = useState(firstNote?.path || '');
  const activeNote = notes.find((note) => note.path === selectedPath) || firstNote;

  return (
    <div className="rounded-[34px] border border-white/8 bg-[rgba(10,12,17,0.72)]">
      <div className="flex flex-col gap-4 border-b border-white/8 px-5 py-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="eyebrow">Obsidian</div>
          <h2 className="mt-2 text-3xl">Knowledge workspace</h2>
        </div>
        <a
          href={api.getObsidianExportUrl(run.run_id)}
          className="focus-ring inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-[var(--text-main)] transition hover:bg-white/[0.08]"
        >
          <Download className="h-4 w-4" />
          <span>Export vault</span>
        </a>
      </div>

      <div className="grid gap-0 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="border-b border-white/8 p-5 lg:border-b-0 lg:border-r">
          <div className="text-sm text-[var(--text-strong)]">{run.obsidian_vault?.vault_name || 'ResearchPilot Vault'}</div>
          <div className="mt-5 space-y-5">
            {Object.entries(grouped).length ? Object.entries(grouped).map(([group, groupNotesList], groupIndex) => (
              <div key={`${group}-${groupIndex}`}>
                <div className="mono text-[11px] uppercase tracking-[0.14em] text-[var(--text-faint)]">{group}</div>
                <div className="mt-2 space-y-2">
                  {groupNotesList.map((note, noteIndex) => (
                    <button
                      key={`${note.path}-${noteIndex}`}
                      type="button"
                      onClick={() => setSelectedPath(note.path)}
                      className={`focus-ring block w-full rounded-2xl px-3 py-2 text-left text-sm transition ${activeNote?.path === note.path ? 'bg-white/[0.08] text-[var(--text-strong)]' : 'text-[var(--text-muted)] hover:bg-white/[0.04]'}`}
                    >
                      {note.filename}
                    </button>
                  ))}
                </div>
              </div>
            )) : (
              <div className="text-sm text-[var(--text-muted)]">
                No vault files yet. Export becomes available after the research run reaches synthesis.
              </div>
            )}
          </div>
        </aside>

        <div className="p-5 sm:p-6">
          <div className="rounded-[28px] border border-white/8 bg-[rgba(8,10,14,0.78)] p-5">
            <div className="eyebrow">Markdown preview</div>
            <pre className="mt-4 whitespace-pre-wrap break-words font-[inherit] text-[15px] leading-8 text-[var(--text-main)]">
              {activeNote?.content || '# Research Topic\n\nExport the vault once the run is complete to inspect the generated markdown files.'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
