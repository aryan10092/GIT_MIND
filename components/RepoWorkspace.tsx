"use client";

import { useMemo, useState } from "react";
import ArchitecturePanel from "@/components/ArchitecturePanel";
import ChatPanel from "@/components/ChatPanel";
import HealthPanel from "@/components/HealthPanel";
import {
  computeHealth,
  getScoreColor,
  getScoreLabel,
} from "@/lib/health";
import type { Repo } from "@/lib/types";

type Tab = "overview" | "chat" | "architecture" | "health";

type RepoWorkspaceProps = {
  repo: Repo;
  uniquePaths: string[];
  languages: [string, number][];
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export default function RepoWorkspace({
  repo,
  uniquePaths,
  languages,
}: RepoWorkspaceProps) {
  const [tab, setTab] = useState<Tab>("overview");

  const health = useMemo(
    () => computeHealth(uniquePaths, repo.file_count),
    [uniquePaths, repo.file_count],
  );

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[240px_1fr_280px]">
      <aside className="space-y-4">
        <nav className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
            Workspace
          </p>
          <ul className="space-y-1 text-sm">
            <TabButton active={tab === "overview"} onClick={() => setTab("overview")}>
              Overview
            </TabButton>
            <TabButton active={tab === "chat"} onClick={() => setTab("chat")}>
              Chat
            </TabButton>
            <TabButton
              active={tab === "architecture"}
              onClick={() => setTab("architecture")}
            >
              Architecture
            </TabButton>
            <TabButton active={tab === "health"} onClick={() => setTab("health")}>
              Health
            </TabButton>
          </ul>
        </nav>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
            Branch
          </p>
          <p className="font-mono text-sm">{repo.default_branch}</p>
        </div>
      </aside>

      <section className="space-y-6">
        {tab === "chat" && (
          <>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Chat</h1>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Ask questions about {repo.owner}/{repo.name}
              </p>
            </div>
            <ChatPanel
              repoId={repo.id}
              githubUrl={repo.github_url}
              defaultBranch={repo.default_branch}
            />
          </>
        )}

        {tab === "overview" && (
          <>
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
              <h1 className="mb-2 text-2xl font-semibold tracking-tight">
                {repo.owner}/{repo.name}
              </h1>
              <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
                Indexed {formatDate(repo.indexed_at)} ·{" "}
                <a
                  href={repo.github_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-600 hover:underline"
                >
                  View on GitHub
                </a>
              </p>

              <div className="grid gap-4 sm:grid-cols-3">
                <Stat label="Files indexed" value={repo.file_count} />
                <Stat label="Search chunks" value={repo.chunk_count} />
                <Stat label="Health score" value={health.score} suffix="/100" />
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
              <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-zinc-500">
                Indexed files
              </h2>
              <ul className="max-h-80 space-y-1 overflow-y-auto scrollbar-thi scrollbar-thumb-zinc-700 scrollbar-track-zinc-900  font-mono text-xs text-zinc-700 dark:text-zinc-300">
                {uniquePaths.slice(0, 50).map((path) => (
                  <li
                    key={path}
                    className="truncate rounded px-2 py-1 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                  >
                    {path}
                  </li>
                ))}
                {uniquePaths.length > 50 && (
                  <li className="px-2 py-1 text-zinc-500">
                    +{uniquePaths.length - 50} more files
                  </li>
                )}
              </ul>
            </div>
          </>
        )}

        {tab === "architecture" && (
          <ArchitecturePanel
            repoId={repo.id}
            initialSummary={repo.architecture_summary}
            initialMermaid={repo.mermaid_diagram}
          />
        )}

        {tab === "health" && (
          <HealthPanel
            repoId={repo.id}
            paths={uniquePaths}
            fileCount={repo.file_count}
          />
        )}
      </section>

      <aside className="space-y-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
            Health
          </p>
          <p className={`text-3xl font-bold ${getScoreColor(health.score)}`}>
            {health.score}
            <span className="text-base font-normal text-zinc-500">/100</span>
          </p>
          <p className={`mt-1 text-sm ${getScoreColor(health.score)}`}>
            {getScoreLabel(health.score)}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
            Top extensions
          </p>
          <ul className="space-y-2 text-sm">
            {languages.map(([ext, count]) => (
              <li key={ext} className="flex items-center justify-between">
                <span className="font-mono">.{ext}</span>
                <span className="text-zinc-500">{count}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
            GitMind
          </p>
          <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
            <li>Hybrid RAG: embeddings + keyword search</li>
            <li>Architecture diagram</li>
            <li>Health score & tips</li>
          </ul>
        </div>
      </aside>
    </main>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={`w-full rounded-lg px-3 py-2 text-left transition ${
          active
            ? "bg-emerald-50 font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
            : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-900"
        }`}
      >
        {children}
      </button>
    </li>
  );
}

function Stat({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 px-4 py-3 dark:border-zinc-800">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">
        {value}
        {suffix && (
          <span className="text-base font-normal text-zinc-500">{suffix}</span>
        )}
      </p>
    </div>
  );
}
