import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ResearchPilot AI — Autonomous AI Research Workspace",
  description: "Turn a research question into an evidence-backed knowledge base with multi-source discovery, RAG grounding, claim verification, and Obsidian export.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="theme-color" content="#08080B" />
      </head>
      <body className="min-h-screen antialiased selection:bg-indigo-500/30 selection:text-white" style={{ backgroundColor: 'var(--bg-app)' }}>
        {children}
      </body>
    </html>
  );
}
