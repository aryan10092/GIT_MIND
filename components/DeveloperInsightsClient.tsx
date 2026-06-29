"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import {
  getScoreColor,
  getScoreLabel,
} from "@/lib/developer-score";
import type { DeveloperInsightsResult } from "@/lib/types/developer-insights";

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
    new Date(iso),
  );
}

function RatingBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-zinc-500">{label}</span>
        <span className="font-medium">{value}/10</span>
      </div>
      <div className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div
          className="h-2 rounded-full bg-emerald-500"
          style={{ width: `${value * 10}%` }}
        />
      </div>
    </div>
  );
}

function InsightsResults({ data }: { data: DeveloperInsightsResult }) {
  const [copied, setCopied] = useState(false);
  const { profile } = data;
  const scoreColor = getScoreColor(data.score);

  async function copyResume() {
    await navigator.clipboard.writeText(data.resumeSummary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <Image
            src={profile.avatar_url}
            alt={profile.login}
            width={96}
            height={96}
            className="rounded-2xl border border-zinc-200 dark:border-zinc-800"
          />

          <div className="flex-1">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">
                  {profile.name ?? profile.login}
                </h2>
                <a
                  href={profile.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-emerald-600 hover:underline"
                >
                  @{profile.login}
                </a>
                {profile.bio && (
                  <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                    {profile.bio}
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-zinc-200 px-5 py-4 text-center dark:border-zinc-800">
                <p className={`text-4xl font-bold ${scoreColor}`}>{data.score}</p>
                <p className="text-xs text-zinc-500">Developer Score</p>
                <p className={`mt-1 text-xs ${scoreColor}`}>
                  {getScoreLabel(data.score)}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-4">
              <Stat label="Followers" value={profile.followers} />
              <Stat label="Public repos" value={profile.public_repos} />
              <Stat label="Following" value={profile.following} />
              <Stat
                label="Member since"
                value={formatDate(profile.created_at)}
                small
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Score breakdown">
          <ul className="space-y-3">
            {data.scoreBreakdown.map((item) => (
              <li key={item.label} className="flex items-center justify-between text-sm">
                <span>{item.label}</span>
                <span className="font-medium">
                  {item.points}/{item.max}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Top languages">
          {data.languages.length > 0 ? (
            <ul className="space-y-2">
              {data.languages.map((lang) => (
                <li key={lang.name} className="flex items-center justify-between text-sm">
                  <span>{lang.name}</span>
                  <span className="text-zinc-500">{lang.count} repos</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-zinc-500">No language data available.</p>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Strengths">
          <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
            {data.strengths.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Card>

        <Card title="Areas for improvement">
          <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
            {data.improvements.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title="Developer persona">
        <p className="text-sm leading-7 text-zinc-700 dark:text-zinc-300">
          {data.persona}
        </p>
      </Card>

      <Card title="LinkedIn / resume summary">
        <p className="mb-4 text-sm leading-7 text-zinc-700 dark:text-zinc-300">
          {data.resumeSummary}
        </p>
        <button
          type="button"
          onClick={() => void copyResume()}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
        >
          {copied ? "Copied!" : "Copy summary"}
        </button>
      </Card>

      <div>
        <h3 className="mb-4 text-lg font-medium">Recent repository analysis</h3>
        <div className="grid gap-4 lg:grid-cols-2">
          {data.repos.map((repo) => {
            const insight =
              data.repoInsights.find((item) => item.name === repo.name) ?? {
                name: repo.name,
                documentation: 5,
                architecture: 5,
                maintainability: 5,
                complexity: 5,
                summary: repo.description ?? "No AI summary available.",
              };

            return (
              <div
                key={repo.full_name}
                className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <a
                      href={repo.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-emerald-600 hover:underline"
                    >
                      {repo.name}
                    </a>
                    <p className="mt-1 text-xs text-zinc-500">
                      {repo.language ?? "Unknown"} · {repo.stargazers_count} stars ·
                      updated {formatDate(repo.pushed_at)}
                    </p>
                  </div>
                </div>

                {repo.description && (
                  <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
                    {repo.description}
                  </p>
                )}

                <div className="mb-4 space-y-3">
                  <RatingBar label="Documentation" value={insight.documentation} />
                  <RatingBar label="Architecture" value={insight.architecture} />
                  <RatingBar
                    label="Maintainability"
                    value={insight.maintainability}
                  />
                  <RatingBar label="Complexity" value={insight.complexity} />
                </div>

                <p className="text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                  {insight.summary}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
      <h3 className="mb-4 text-sm font-medium uppercase tracking-wide text-zinc-500">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Stat({
  label,
  value,
  small,
}: {
  label: string;
  value: string | number;
  small?: boolean;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 px-4 py-3 dark:border-zinc-800">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className={`mt-1 font-semibold ${small ? "text-sm" : "text-xl"}`}>
        {value}
      </p>
    </div>
  );
}

export default function DeveloperInsightsClient() {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DeveloperInsightsResult | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    setData(null);

    try {
      const response = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });

      const result = (await response.json()) as DeveloperInsightsResult & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(result.error ?? "Failed to analyze developer.");
      }

      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8 ">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-6 sm:gap-0 mx-4">
      <div className="max-w-2xl">
        <h1 className="text-2xl sm:text-3xl sm:font-semibold tracking-tight">Developer Insights</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          Analyze a public GitHub profile and recent repositories. 
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="username or github.com/username"
          className="flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none ring-emerald-500/0 transition focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900"
          required
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !username.trim()}
          className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
        >
          {loading ? "Analyzing..." : "Analyze profile"}
        </button>
      </form></div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {loading && (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center dark:border-zinc-700 dark:bg-zinc-950">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Fetching GitHub profile and generating AI insights...
          </p>
        </div>
      )}

      {data && !loading && <InsightsResults data={data} />}
    </div>
  );
}
