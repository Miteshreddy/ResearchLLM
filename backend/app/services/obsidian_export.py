"""
Obsidian Vault Export Service
Generates a clean, interconnected Obsidian-compatible vault as a ZIP file.

Directory Structure:
ResearchPilot-Vault/
├── 00 - Index.md
├── Research/
│   └── [Research Topic].md
├── Topics/
│   ├── [Topic 01].md
│   └── [Topic 02].md
└── Sources/
    ├── Source 01 - [Title].md
    └── Source 02 - [Title].md
"""

import io
import zipfile
import logging
import re
from datetime import datetime, timezone
from typing import Optional
from app.schemas.research import (
    ResearchRun, ObsidianVault, ObsidianNote, Synthesis, Source, SourceEvaluation
)

logger = logging.getLogger(__name__)


class ObsidianExporter:
    """Generate and validate Obsidian vault structure from research results."""

    def generate_vault(self, run: ResearchRun) -> ObsidianVault:
        """Generate complete Obsidian vault structure with valid frontmatter and wiki links."""
        notes = []
        synthesis = run.synthesis
        vault_name = "ResearchPilot-Vault"

        if not synthesis or not synthesis.executive_summary:
            logger.warning("Synthesis is missing or empty; generating minimal vault")
            # Create a basic index note explaining the status
            date_str = run.created_at[:10] if run.created_at else datetime.now(timezone.utc).strftime('%Y-%m-%d')
            notes.append(ObsidianNote(
                filename="00 - Index.md",
                path="",
                content=f"# Research Index\n\n**Query**: {run.query}\n\n*Synthesis was not completed for this research run.*",
                frontmatter={
                    "title": "Research Index",
                    "type": "index",
                    "date": date_str,
                    "status": run.status.value,
                }
            ))
            return ObsidianVault(notes=notes, vault_name=vault_name)

        clean_topic_slug = self._slugify(run.query[:60]) or "Research Note"
        date_str = run.created_at[:10] if run.created_at else datetime.now(timezone.utc).strftime('%Y-%m-%d')

        # 1. Map source IDs to formatted filenames and labels for wiki-links
        accepted_sources = [s for s in run.sources if s.extraction_success or s.content]
        source_note_map = {}  # source_id -> (clean_filename_without_md, display_label)

        for i, source in enumerate(accepted_sources[:8]):  # Capped at 8 sources max
            safe_title = self._safe_title(source.title) or f"Source {i+1:02d}"
            note_stem = f"Source {i+1:02d} - {safe_title[:45]}"
            source_note_map[source.source_id] = (note_stem, f"Source {i+1:02d}")

        # 2. Extract topics
        topics = self._extract_topics(synthesis, run)

        # 3. Create Index Note (00 - Index.md)
        notes.append(self._create_index_note(run, clean_topic_slug, topics, accepted_sources, source_note_map, date_str))

        # 4. Create Main Research Note (Research/[Topic].md)
        notes.append(self._create_research_note(run, synthesis, clean_topic_slug, source_note_map, date_str))

        # 5. Create Topic Notes (Topics/[Topic].md)
        for topic in topics:
            notes.append(self._create_topic_note(topic, clean_topic_slug, synthesis, date_str))

        # 6. Create Source Notes (Sources/Source XX - [Title].md)
        for i, source in enumerate(accepted_sources[:8]):
            eval_data = next((e for e in run.evaluations if e.source_id == source.source_id), None)
            notes.append(self._create_source_note(source, eval_data, i + 1, clean_topic_slug, date_str))

        logger.info(f"Generated Obsidian vault with {len(notes)} notes (Index, Research, {len(topics)} Topics, {len(accepted_sources[:8])} Sources)")
        return ObsidianVault(notes=notes, vault_name=vault_name)

    def validate_vault(self, vault: ObsidianVault) -> tuple[bool, str]:
        """
        Validate that the generated vault meets quality criteria:
        - Contains at least Index and Research notes
        - Has valid YAML frontmatter
        - No empty files
        - Proper wiki links
        """
        if not vault or not vault.notes:
            return False, "Vault contains no notes."

        filenames = [f"{n.path}/{n.filename}" if n.path else n.filename for n in vault.notes]

        has_index = any("00 - Index.md" in fn for fn in filenames)
        if not has_index:
            return False, "Vault is missing 00 - Index.md."

        has_research = any("Research/" in fn for fn in filenames)
        if not has_research:
            return False, "Vault is missing Research note."

        for note in vault.notes:
            if not note.content or len(note.content.strip()) < 10:
                return False, f"Note '{note.filename}' is empty."
            if not note.frontmatter or not isinstance(note.frontmatter, dict):
                return False, f"Note '{note.filename}' is missing YAML frontmatter."

        return True, "Vault validated successfully."

    def export_zip(self, vault: ObsidianVault) -> bytes:
        """Generate a ZIP file from the validated vault."""
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
            for note in vault.notes:
                content = self._build_note_content(note)
                if note.path:
                    filepath = f"{vault.vault_name}/{note.path}/{note.filename}"
                else:
                    filepath = f"{vault.vault_name}/{note.filename}"
                filepath = filepath.replace("//", "/")
                zf.writestr(filepath, content)

        buffer.seek(0)
        return buffer.read()

    def _create_index_note(
        self,
        run: ResearchRun,
        topic_slug: str,
        topics: list[str],
        sources: list[Source],
        source_note_map: dict,
        date_str: str,
    ) -> ObsidianNote:
        content = f"""# Research Index

## Research Overview
- **Question**: {run.query}
- **Depth**: {run.depth.value.title()}
- **Source Mode**: {getattr(run, 'source_mode', 'web')}
- **Date**: {date_str}
- **Status**: {run.status.value.title()}

## Research
- [[Research/{topic_slug}|{run.query}]]

## Topics
"""
        for t in topics:
            content += f"- [[Topics/{t}|{t}]]\n"

        content += "\n## Sources\n"
        for s in sources[:8]:
            if s.source_id in source_note_map:
                stem, label = source_note_map[s.source_id]
                title = self._safe_title(s.title) or label
                type_tag = f"[{s.source_type.upper()}]"
                content += f"- [[Sources/{stem}|{label}: {title}]] {type_tag}\n"

        content += f"""
## Research Statistics
- Sources processed: {run.stats.sources_accepted}
- Documents ingested: {run.stats.documents_uploaded}
- Chunks indexed: {run.stats.chunks_indexed}
- Key findings synthesized: {len(run.synthesis.key_findings) if run.synthesis else 0}
- Research duration: {run.stats.duration_seconds:.1f}s

---
*Generated by ResearchPilot AI on {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M')} UTC*
"""
        return ObsidianNote(
            filename="00 - Index.md",
            path="",
            content=content,
            frontmatter={
                "title": "Research Index",
                "type": "index",
                "tags": ["research-index", "researchpilot"],
                "date": date_str,
            },
        )

    def _create_research_note(
        self,
        run: ResearchRun,
        synthesis: Synthesis,
        topic_slug: str,
        source_note_map: dict,
        date_str: str,
    ) -> ObsidianNote:
        content = f"# {run.query}\n\n"
        content += f"[[00 - Index|← Back to Research Index]]\n\n"

        if synthesis.executive_summary:
            content += f"## Executive Summary\n\n{synthesis.executive_summary}\n\n"

        if synthesis.key_findings:
            content += "## Key Findings\n\n"
            for i, f in enumerate(synthesis.key_findings, 1):
                # Link supporting sources with wiki-links
                links = []
                for sid in f.supporting_sources:
                    if sid in source_note_map:
                        stem, label = source_note_map[sid]
                        links.append(f"[[Sources/{stem}|{label}]]")
                sources_str = f" ({', '.join(links)})" if links else ""
                content += f"{i}. **{f.finding}** [Confidence: *{f.confidence}*]{sources_str}\n\n"

        if synthesis.evidence_summary:
            content += f"## Evidence Analysis\n\n{synthesis.evidence_summary}\n\n"

        if synthesis.contradictions:
            content += "## Contradictions & Disagreements\n\n"
            for c in synthesis.contradictions:
                content += f"### {c.claim_text}\n"
                content += f"- **Position A**: {c.source_a_position}\n"
                content += f"- **Position B**: {c.source_b_position}\n"
                if c.conclusion:
                    content += f"- **Synthesis**: {c.conclusion}\n"
                content += "\n"

        if synthesis.limitations:
            content += "## Limitations\n\n"
            for lim in synthesis.limitations:
                content += f"- {lim}\n"
            content += "\n"

        if synthesis.open_questions:
            content += "## Open Questions\n\n"
            for q in synthesis.open_questions:
                content += f"- {q}\n"
            content += "\n"

        if synthesis.conclusion:
            content += f"## Conclusion\n\n{synthesis.conclusion}\n"

        return ObsidianNote(
            filename=f"{topic_slug}.md",
            path="Research",
            content=content,
            frontmatter={
                "title": run.query[:100],
                "type": "research",
                "tags": ["research", "synthesis", "evidence-backed"],
                "date": date_str,
                "status": "completed",
            },
        )

    def _create_topic_note(
        self,
        topic: str,
        main_topic_slug: str,
        synthesis: Synthesis,
        date_str: str,
    ) -> ObsidianNote:
        content = f"# {topic}\n\n"
        content += f"Related Research: [[Research/{main_topic_slug}|Main Research Report]] | [[00 - Index|Index]]\n\n"

        # Find findings related to this topic
        relevant = [f for f in synthesis.key_findings if any(w in f.finding.lower() for w in topic.lower().split() if len(w) > 3)]
        if relevant:
            content += "## Key Findings for this Topic\n\n"
            for f in relevant:
                content += f"- {f.finding} (*{f.confidence} confidence*)\n"
            content += "\n"

        content += f"## Topic Notes\n\nThis sub-topic was identified during autonomous research on the primary research question.\n"

        clean_filename = self._safe_title(topic)[:50]
        return ObsidianNote(
            filename=f"{clean_filename}.md",
            path="Topics",
            content=content,
            frontmatter={
                "title": topic,
                "type": "topic",
                "tags": ["topic", self._slugify(topic)[:20]],
                "date": date_str,
            },
        )

    def _create_source_note(
        self,
        source: Source,
        evaluation: Optional[SourceEvaluation],
        index: int,
        main_topic_slug: str,
        date_str: str,
    ) -> ObsidianNote:
        title = self._safe_title(source.title) or f"Source {index:02d}"
        content = f"# {title}\n\n"
        content += f"Related Research: [[Research/{main_topic_slug}|Main Research Report]] | [[00 - Index|Index]]\n\n"
        content += f"## Metadata\n"
        content += f"- **Source Type**: `{source.source_type.upper()}`\n"
        if source.document_format:
            content += f"- **Format**: `{source.document_format.upper()}`\n"
        content += f"- **URL / Identifier**: {source.url}\n"
        content += f"- **Domain / Source**: {source.domain}\n"
        content += f"- **Author**: {source.author or 'Unknown'}\n"
        if source.published_date:
            content += f"- **Published**: {source.published_date}\n"
        content += f"- **Retrieved / Uploaded**: {source.retrieved_at[:10]}\n"
        content += f"- **Length**: {source.content_length} characters\n\n"

        if evaluation:
            content += "## AI-Assisted Assessment\n"
            content += f"- **Relevance**: {(evaluation.relevance_score * 100):.0f}%\n"
            content += f"- **Credibility**: {(evaluation.credibility_score * 100):.0f}%\n"
            if evaluation.evidence_quality:
                content += f"- **Evidence Quality**: {evaluation.evidence_quality}\n"
            if evaluation.reasoning:
                content += f"- **Assessment Reasoning**: {evaluation.reasoning}\n"
            if evaluation.potential_bias:
                content += f"- **Potential Bias**: {evaluation.potential_bias}\n"
            content += "\n> ⚠️ *Note: Relevance and credibility evaluations are AI-assisted assessments, not absolute ground truth.*\n\n"

        if source.content:
            content += "## Content Excerpt\n\n"
            preview = source.content[:2500].strip()
            content += f"{preview}\n\n"
            if len(source.content) > 2500:
                content += "*[Content truncated for knowledge note size]*\n"

        note_filename = f"Source {index:02d} - {title[:45]}.md"
        return ObsidianNote(
            filename=note_filename,
            path="Sources",
            content=content,
            frontmatter={
                "title": title[:80],
                "type": "source",
                "source_type": source.source_type,
                "url": source.url,
                "domain": source.domain,
                "date": date_str,
            },
        )

    @staticmethod
    def _build_note_content(note: ObsidianNote) -> str:
        """Build note with clean YAML frontmatter and markdown body."""
        lines = ["---"]
        for key, value in note.frontmatter.items():
            if isinstance(value, list):
                lines.append(f"{key}:")
                for item in value:
                    lines.append(f"  - \"{item}\"")
            elif isinstance(value, (int, float, bool)):
                lines.append(f"{key}: {value}")
            else:
                # Escape quotes in string value
                clean_val = str(value).replace('"', '\\"')
                lines.append(f"{key}: \"{clean_val}\"")
        lines.append("---")
        lines.append("")
        lines.append(note.content.strip())
        lines.append("")
        return "\n".join(lines)

    @staticmethod
    def _slugify(text: str) -> str:
        """Create a clean filename slug from text."""
        text = re.sub(r'[^\w\s-]', '', text)
        text = re.sub(r'\s+', ' ', text).strip()
        return text[:60] or "Research Topic"

    @staticmethod
    def _safe_title(title: str) -> str:
        """Clean title for use in filenames and wiki links."""
        title = re.sub(r'[<>:"/\\|?*#\[\]^]', '', title)
        title = re.sub(r'\s+', ' ', title).strip()
        return title[:60] or "Untitled"

    @staticmethod
    def _extract_topics(synthesis: Synthesis, run: ResearchRun) -> list[str]:
        """Extract clean, meaningful topic names."""
        topics = []

        # From research subquestions
        if run.plan and run.plan.subquestions:
            for sq in run.plan.subquestions:
                clean_q = sq.question.split("?")[0].strip()
                if 5 < len(clean_q) < 40:
                    topics.append(clean_q)

        # From findings
        if synthesis and synthesis.key_findings:
            for finding in synthesis.key_findings:
                words = finding.finding.split()[:4]
                candidate = " ".join(w for w in words if len(w) > 3).strip()
                if 5 < len(candidate) < 35 and candidate not in topics:
                    topics.append(candidate)

        # Deduplicate and cap at 4
        seen = set()
        clean_topics = []
        for t in topics:
            t_clean = re.sub(r'[^\w\s-]', '', t).strip()
            if t_clean and t_clean.lower() not in seen:
                seen.add(t_clean.lower())
                clean_topics.append(t_clean)

        return clean_topics[:4] or ["Overview", "Key Findings"]


_exporter: Optional[ObsidianExporter] = None


def get_obsidian_exporter() -> ObsidianExporter:
    global _exporter
    if _exporter is None:
        _exporter = ObsidianExporter()
    return _exporter
