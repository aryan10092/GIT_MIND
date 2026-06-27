"use client";

import { useCallback, useEffect, useState } from "react";
import MermaidDiagram from "@/components/MermaidDiagram";

type ArchitecturePanelProps = {
  repoId: string;
  initialSummary?: string | null;
  initialMermaid?: string | null;
};

type ArchitectureData = {
  summary: string;
  mermaid: string;
  cached: boolean;
  generatedAt: string;
};

export default function ArchitecturePanel({
  repoId,
  initialSummary,
  initialMermaid,
}: ArchitecturePanelProps) {
  const [data, setData] = useState<ArchitectureData | null>(
    initialSummary && initialMermaid
      ? {
          summary: initialSummary,
          mermaid: initialMermaid,
          cached: true,
          generatedAt: "",
        }
      : null,
  );
  const [loading, setLoading] = useState(!initialSummary);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadArchitecture = useCallback(
    async (refresh = false) => {
      setError(null);

      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const response = await fetch("/api/architecture", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ repoId, refresh }),
        });

        const result = (await response.json()) as ArchitectureData & {
          error?: string;
        };

        if (!response.ok) {
          throw new Error(result.error ?? "Failed to load architecture.");
        }

        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [repoId],
  );

  useEffect(() => {
    if (!initialSummary) {
      void loadArchitecture(false);
    }
  }, [initialSummary, loadArchitecture]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-950">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Analyzing repository structure with Groq...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950">
        <p className="mb-4 text-sm text-red-700 dark:text-red-300">{error}</p>
        <button
          type="button"
          onClick={() => void loadArchitecture(false)}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-500"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Architecture</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            AI-generated overview from README, configs, and folder structure
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadArchitecture(true)}
          disabled={refreshing}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          {refreshing ? "Refreshing..." : "Regenerate"}
        </button>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-zinc-500">
          Summary
        </h2>
        <div className="prose prose-sm max-w-none text-zinc-700 dark:prose-invert dark:text-zinc-300">
          {data.summary.split("\n\n").map((paragraph, index) => (
            <p key={index} className="leading-7">
              {paragraph}
            </p>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-zinc-500">
          Diagram
        </h2>
        <MermaidDiagram chart={data.mermaid} />
      </div>
    </div>
  );
}
