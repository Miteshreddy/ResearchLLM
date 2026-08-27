'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, Code2, Database, Sparkles, Cpu, Layers } from 'lucide-react';

interface TopicItem {
  id: string;
  topic: string;
  category: string;
  description: string;
  icon: React.ReactNode;
}

const RECOMMENDED_TOPICS: TopicItem[] = [
  {
    id: 'ai-agents',
    topic: 'How are AI coding agents changing software development workflows?',
    category: 'Autonomous Software',
    description: 'Multi-agent orchestration, test generation, and developer productivity metrics',
    icon: <Code2 className="w-4 h-4 text-indigo-400" />,
  },
  {
    id: 'enterprise-rag',
    topic: 'Enterprise RAG production patterns: chunking, hybrid search, and evaluation',
    category: 'Architecture',
    description: 'Dense vs sparse retrieval, vector DB indexing, and hallucination reduction',
    icon: <Database className="w-4 h-4 text-cyan-400" />,
  },
  {
    id: 'agentic-reasoning',
    topic: 'What are the latest breakthroughs in agentic reasoning and tool verification?',
    category: 'LLM Reasoning',
    description: 'Test-time compute, reflection loops, and self-correcting synthesis pipelines',
    icon: <Sparkles className="w-4 h-4 text-violet-400" />,
  },
  {
    id: 'assistant-benchmarks',
    topic: 'Compare modern AI coding assistants and their developer productivity impact',
    category: 'Empirical Studies',
    description: 'Empirical velocity gains, code churn rates, and enterprise adoption risks',
    icon: <Cpu className="w-4 h-4 text-amber-400" />,
  },
];

interface TopicCardsProps {
  onSelectTopic: (topic: string) => void;
}

export default function TopicCards({ onSelectTopic }: TopicCardsProps) {
  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between">
        <span className="section-kicker">Recommended Research Topics</span>
        <span className="text-[11px] text-[var(--text-3)]">Click to populate</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {RECOMMENDED_TOPICS.map((item, index) => (
          <motion.button
            key={item.id}
            id={`demo-topic-${index}`}
            onClick={() => onSelectTopic(item.topic)}
            whileHover={{ y: -2, scale: 1.008 }}
            whileTap={{ scale: 0.99 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="group relative text-left p-3.5 rounded-xl border border-[var(--border-default)] hover:border-[var(--border-accent)] bg-[var(--bg-surface-raised)]/60 hover:bg-[var(--bg-card)] transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-md hover:shadow-indigo-500/5"
          >
            {/* Ambient hover gradient accent */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-colors pointer-events-none" />

            <div className="space-y-1.5 z-10">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-md bg-[var(--bg-canvas)] border border-[var(--border-subtle)]">
                    {item.icon}
                  </div>
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-[var(--text-3)] group-hover:text-indigo-400 transition-colors">
                    {item.category}
                  </span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-[var(--text-3)] group-hover:text-indigo-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
              </div>

              <p className="text-xs font-medium text-[var(--text-1)] group-hover:text-white leading-snug line-clamp-2">
                {item.topic}
              </p>
            </div>

            <p className="text-[11px] text-[var(--text-3)] mt-2 line-clamp-1">
              {item.description}
            </p>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
