"""
Mock Data Service
Provides deterministic mock responses for development/testing without API calls.
"""

from app.schemas.research import *
from datetime import datetime


def get_mock_research_plan(query: str) -> ResearchPlan:
    return ResearchPlan(
        objective=f"Comprehensive research on: {query}",
        subquestions=[
            SubQuestion(
                question="What are the current capabilities and state of the art?",
                search_queries=[f"{query} current capabilities 2024", f"{query} state of the art"],
                priority=1,
                evidence_types=["technical reports", "surveys"],
            ),
            SubQuestion(
                question="What evidence exists for adoption and real-world impact?",
                search_queries=[f"{query} adoption statistics", f"{query} real world impact"],
                priority=2,
                evidence_types=["case studies", "surveys"],
            ),
            SubQuestion(
                question="What are the main benefits and advantages?",
                search_queries=[f"{query} benefits advantages", f"{query} productivity improvements"],
                priority=2,
                evidence_types=["research papers", "reports"],
            ),
            SubQuestion(
                question="What are the risks, limitations, and challenges?",
                search_queries=[f"{query} risks limitations", f"{query} challenges concerns"],
                priority=3,
                evidence_types=["critical analysis", "expert opinions"],
            ),
            SubQuestion(
                question="What is the future direction and emerging trends?",
                search_queries=[f"{query} future trends 2025", f"{query} emerging developments"],
                priority=4,
                evidence_types=["forecasts", "expert predictions"],
            ),
        ],
        estimated_sources=12,
    )


def get_mock_search_results(query: str) -> list[SearchResult]:
    return [
        SearchResult(
            url="https://example.com/research-article-1",
            title="Comprehensive Analysis of AI in Modern Development",
            snippet="A thorough examination of how artificial intelligence is transforming software development practices...",
            score=0.95,
            query=query,
        ),
        SearchResult(
            url="https://example.org/study-2024",
            title="Developer Productivity Study 2024",
            snippet="Recent study examining the impact of AI tools on developer productivity across 500 organizations...",
            score=0.89,
            query=query,
        ),
        SearchResult(
            url="https://blog.example.com/ai-coding",
            title="The Rise of AI Coding Assistants: A Technical Review",
            snippet="Technical review of major AI coding assistants including capabilities, limitations, and best practices...",
            score=0.85,
            query=query,
        ),
    ]


def get_mock_sources() -> list[Source]:
    return [
        Source(
            source_id="mock_s1",
            title="Comprehensive Analysis of AI in Modern Development",
            url="https://example.com/research-article-1",
            domain="example.com",
            author="Dr. Jane Smith",
            published_date="2024-06-15",
            source_type=SourceType.ACADEMIC,
            content="Artificial intelligence is rapidly transforming software development. Recent studies show that AI-powered coding assistants can improve developer productivity by 30-55% depending on the task. Key capabilities include code completion, bug detection, code review, and documentation generation. However, concerns remain about code quality, security vulnerabilities, and over-reliance on AI tools. Organizations adopting AI coding tools report faster iteration cycles but emphasize the need for human oversight. The technology is most effective for routine coding tasks and less reliable for complex architectural decisions.",
            content_length=520,
            extraction_success=True,
        ),
        Source(
            source_id="mock_s2",
            title="Developer Productivity Study 2024",
            url="https://example.org/study-2024",
            domain="example.org",
            author="Tech Research Institute",
            published_date="2024-08-01",
            source_type=SourceType.COMPANY,
            content="A survey of 500 organizations found that 72% have adopted AI coding tools in some capacity. Developers using AI assistants complete tasks 40% faster on average. However, 23% of generated code requires significant revision. Code review time decreased by 15% when AI pre-screening was used. Junior developers benefited most from AI assistance, while senior developers used AI tools more selectively. The study found mixed evidence on code quality — some metrics improved while others showed marginal decline.",
            content_length=480,
            extraction_success=True,
        ),
        Source(
            source_id="mock_s3",
            title="The Rise of AI Coding Assistants: A Technical Review",
            url="https://blog.example.com/ai-coding",
            domain="blog.example.com",
            author="Alex Johnson",
            published_date="2024-07-20",
            source_type=SourceType.BLOG,
            content="AI coding assistants have evolved significantly. Current tools can generate entire functions, write tests, and explain complex code. The best tools leverage large language models trained on billions of lines of code. While impressive, these tools still struggle with context-dependent logic and can introduce subtle bugs. Security researchers have flagged potential risks from AI-generated code that may contain known vulnerability patterns. Enterprise adoption is growing but governance frameworks are still developing.",
            content_length=450,
            extraction_success=True,
        ),
    ]


def get_mock_evaluations() -> list[SourceEvaluation]:
    return [
        SourceEvaluation(
            source_id="mock_s1",
            relevance_score=0.92,
            credibility_score=0.88,
            evidence_quality="High quality academic analysis with specific findings and data",
            recency_assessment="Published 2024 — current and relevant",
            source_category="Primary research",
            potential_bias="Academic perspective may underemphasize practical considerations",
            reasoning="Academic source with specific data points and methodology. High relevance to the research question.",
            accepted=True,
        ),
        SourceEvaluation(
            source_id="mock_s2",
            relevance_score=0.88,
            credibility_score=0.82,
            evidence_quality="Strong quantitative data from organizational survey",
            recency_assessment="2024 study — very current",
            source_category="Industry research",
            potential_bias="May favor adoption narrative as a tech research organization",
            reasoning="Large-scale survey with specific statistics. Good methodology but potential industry bias.",
            accepted=True,
        ),
        SourceEvaluation(
            source_id="mock_s3",
            relevance_score=0.78,
            credibility_score=0.65,
            evidence_quality="Qualitative technical overview with limited data",
            recency_assessment="Recent blog post — current perspective",
            source_category="Secondary — blog/opinion",
            potential_bias="Individual perspective, less rigorous than academic sources",
            reasoning="Useful technical overview but lacks rigorous methodology. Good for context, less for evidence.",
            accepted=True,
        ),
    ]


def get_mock_claims() -> list[Claim]:
    return [
        Claim(
            claim_id="mock_c1",
            claim_text="AI-powered coding assistants can improve developer productivity by 30-55%",
            source_id="mock_s1",
            evidence_excerpt="AI-powered coding assistants can improve developer productivity by 30-55% depending on the task",
            topic="Developer Productivity",
            confidence=0.85,
        ),
        Claim(
            claim_id="mock_c2",
            claim_text="72% of organizations have adopted AI coding tools",
            source_id="mock_s2",
            evidence_excerpt="A survey of 500 organizations found that 72% have adopted AI coding tools in some capacity",
            topic="Enterprise Adoption",
            confidence=0.80,
        ),
        Claim(
            claim_id="mock_c3",
            claim_text="23% of AI-generated code requires significant revision",
            source_id="mock_s2",
            evidence_excerpt="23% of generated code requires significant revision",
            topic="Code Quality",
            confidence=0.82,
        ),
        Claim(
            claim_id="mock_c4",
            claim_text="AI coding tools can introduce subtle security vulnerabilities",
            source_id="mock_s3",
            evidence_excerpt="Security researchers have flagged potential risks from AI-generated code that may contain known vulnerability patterns",
            topic="Security Risks",
            confidence=0.70,
        ),
        Claim(
            claim_id="mock_c5",
            claim_text="Junior developers benefit most from AI coding assistance",
            source_id="mock_s2",
            evidence_excerpt="Junior developers benefited most from AI assistance, while senior developers used AI tools more selectively",
            topic="Developer Experience",
            confidence=0.78,
        ),
    ]


def get_mock_fact_checks() -> list[FactCheckResult]:
    return [
        FactCheckResult(
            claim_id="mock_c1",
            claim_text="AI-powered coding assistants can improve developer productivity by 30-55%",
            verification_status=VerificationStatus.SUPPORTED,
            supporting_evidence=["mock_s1", "mock_s2"],
            contradicting_evidence=[],
            reasoning="Multiple sources support productivity improvements. Source 1 reports 30-55% and Source 2 reports 40% average, which are consistent.",
            confidence=0.85,
        ),
        FactCheckResult(
            claim_id="mock_c2",
            claim_text="72% of organizations have adopted AI coding tools",
            verification_status=VerificationStatus.PARTIALLY_SUPPORTED,
            supporting_evidence=["mock_s2"],
            contradicting_evidence=[],
            reasoning="Single source claim from a survey. The statistic is specific and well-sourced but could not be independently verified.",
            confidence=0.70,
        ),
        FactCheckResult(
            claim_id="mock_c3",
            claim_text="23% of AI-generated code requires significant revision",
            verification_status=VerificationStatus.PARTIALLY_SUPPORTED,
            supporting_evidence=["mock_s2"],
            contradicting_evidence=["mock_s1"],
            reasoning="Source 2 provides this statistic while Source 1 mentions varying quality but doesn't directly contradict. Evidence is mixed on the exact rate.",
            confidence=0.65,
        ),
        FactCheckResult(
            claim_id="mock_c4",
            claim_text="AI coding tools can introduce subtle security vulnerabilities",
            verification_status=VerificationStatus.SUPPORTED,
            supporting_evidence=["mock_s3", "mock_s1"],
            contradicting_evidence=[],
            reasoning="Multiple sources mention security concerns with AI-generated code, including vulnerability patterns.",
            confidence=0.80,
        ),
        FactCheckResult(
            claim_id="mock_c5",
            claim_text="Junior developers benefit most from AI coding assistance",
            verification_status=VerificationStatus.SUPPORTED,
            supporting_evidence=["mock_s2"],
            contradicting_evidence=[],
            reasoning="Supported by survey data showing differential impact across experience levels.",
            confidence=0.75,
        ),
    ]


def get_mock_synthesis(query: str) -> Synthesis:
    return Synthesis(
        executive_summary=f"This research examines {query}. Analysis of multiple sources reveals significant productivity improvements (30-55%) from AI coding tools, with 72% organizational adoption. However, evidence also shows quality concerns (23% revision rate) and security risks. The impact varies by developer experience level, with junior developers benefiting most.",
        research_question=query,
        key_findings=[
            KeyFinding(
                finding="AI coding assistants improve developer productivity by 30-55% depending on the task",
                supporting_sources=["mock_s1", "mock_s2"],
                confidence="high",
            ),
            KeyFinding(
                finding="72% of surveyed organizations have adopted AI coding tools to some degree",
                supporting_sources=["mock_s2"],
                confidence="moderate",
            ),
            KeyFinding(
                finding="AI-generated code quality is mixed, with approximately 23% requiring significant revision",
                supporting_sources=["mock_s2"],
                confidence="moderate",
            ),
            KeyFinding(
                finding="Security vulnerabilities in AI-generated code remain a significant concern",
                supporting_sources=["mock_s3", "mock_s1"],
                confidence="high",
            ),
        ],
        evidence_summary="Evidence from 3 sources spanning academic research, industry surveys, and technical reviews. Sources are generally consistent on productivity gains but show nuanced disagreement on code quality impact.",
        contradictions=[
            Contradiction(
                claim_text="Impact of AI tools on code quality",
                source_a="mock_s1",
                source_a_position="AI tools improve overall code quality through better bug detection",
                source_b="mock_s2",
                source_b_position="Mixed evidence — some quality metrics improved while others showed marginal decline",
                conclusion="Evidence is mixed. AI tools may improve some quality metrics while introducing new issues.",
            ),
        ],
        source_quality_summary="Sources range from academic (high credibility) to blog posts (moderate credibility). All sources are recent (2024) and relevant. The industry survey provides the strongest quantitative evidence.",
        limitations=[
            "Limited to 3 sources — a broader survey would strengthen findings",
            "No direct access to primary datasets",
            "Potential selection bias toward English-language sources",
            "AI-assisted assessments may not capture all nuances",
        ],
        open_questions=[
            "How do productivity gains vary across programming languages?",
            "What long-term effects does AI coding assistance have on developer skills?",
            "How effective are current governance frameworks for AI-generated code?",
        ],
        conclusion=f"The evidence strongly supports that AI coding agents are significantly changing software development, with clear productivity benefits but important caveats around code quality and security. Organizations should adopt these tools thoughtfully with appropriate oversight.",
    )


def get_mock_contradictions() -> list[Contradiction]:
    return [
        Contradiction(
            claim_text="Impact of AI tools on code quality",
            source_a="mock_s1",
            source_a_position="AI tools improve overall code quality through better bug detection",
            source_b="mock_s2",
            source_b_position="Mixed evidence — some quality metrics improved while others showed marginal decline",
            conclusion="Evidence is mixed.",
        ),
    ]
