"use client";

import { useEffect, useState } from "react";
import {
  computeHealth,
  getScoreColor,
  getScoreLabel,
  type HealthResult,
} from "@/lib/health";

type HealthPanelProps = {
  repoId: string;
  paths: string[];
  fileCount: number;
};

export default function HealthPanel({
  repoId,
  paths,
  fileCount,
}: HealthPanelProps) {
  const localHealth = computeHealth(paths, fileCount);
  const [health, setHealth] = useState<HealthResult>(localHealth);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadHealth() {
      try {
        const response = await fetch(`/api/health?repoId=${repoId}`);
        const data = (await response.json()) as HealthResult & { error?: string };

        if (!response.ok) {
          throw new Error(data.error ?? "Failed to load health data.");
        }

        setHealth(data);
      } catch {
        setHealth(computeHealth(paths, fileCount));
      }
    }

    void loadHealth();
  }, [repoId, paths, fileCount]);

  async function generateSuggestions() {
    setLoadingSuggestions(true);
    setError(null);

    try {
      const response = await fetch("/api/health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoId }),
      });

      const data = (await response.json()) as HealthResult & { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to generate suggestions.");
      }

      setHealth(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoadingSuggestions(false);
    }
  }

  const scoreColor = getScoreColor(health.score);
  const scoreLabel = getScoreLabel(health.score);
  const failedChecks = health.checks.filter((check) => !check.passed);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Repo health</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Static checks on documentation, tests, CI, and project hygiene
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr">
        {/* <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-950">
          <p className={`text-5xl font-bold ${scoreColor}`}>{health.score}</p>
          <p className="mt-1 text-sm text-zinc-500">out of {health.maxScore}</p>
          <p className={`mt-3 text-sm font-medium ${scoreColor}`}>{scoreLabel}</p>
        </div> */}

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-zinc-500">
            Checks
          </h2>
          <ul className="grid grid-cols-2 gap-5">
            {health.checks.map((check) => (
              <li
                key={check.label}
                className="flex items-start justify-between gap-4 rounded-xl border border-zinc-100 px-4 py-3 dark:border-zinc-800"
              >
                <div>
                  <p className="font-medium text-">{check.label}</p>
                  {!check.passed && (
                    <p className="mt-1 text-xs text-zinc-500">{check.tip}</p>
                  )}
                </div>
                <div className="text-right">
                  <span
                    className={
                      check.passed
                        ? "text-sm font-medium text-emerald-600"
                        : "text-sm font-medium text-red-600"
                    }
                  >
                    {check.passed ? "Pass" : "Missing"}
                  </span>
                  <p className="text-xs text-zinc-500">{check.points} pts</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-2xl max-h-[500px] overflow-y-auto scrollbar-thi scrollbar-thumb-zinc-700 scrollbar-track-zinc-900 border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            AI suggestions
          </h2>
          {!health.suggestions && (
            <button
              type="button"
              onClick={() => void generateSuggestions()}
              disabled={loadingSuggestions}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
            >
              {loadingSuggestions ? "Generating..." : "Get suggestions"}
            </button>
          )}
        </div>

        {error && (
          <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        {health.suggestions ? (
          <div className="space-y-2 text-sm leading-7 text-zinc-700 dark:text-zinc-300">
            {health.suggestions.split("\n").map((line, index) => (
              <p key={index}>{line}</p>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {failedChecks.length > 0
              ? "Get personalized improvement tips based on what's missing."
              : "Score looks good. Generate tips for general maintainability improvements."}
          </p>
        )}

        {health.suggestions && (
          <button
            type="button"
            onClick={() => void generateSuggestions()}
            disabled={loadingSuggestions}
            className="mt-4 text-sm text-emerald-600 hover:underline disabled:opacity-60"
          >
            {loadingSuggestions ? "Regenerating..." : "Regenerate suggestions"}
          </button>
        )}
      </div>
    </div>
  );
}
