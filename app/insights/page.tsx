import AppHeader from "@/components/AppHeader";
import DeveloperInsightsClient from "@/components/DeveloperInsightsClient";
import Link from "next/link";

export default function InsightsPage() {
  return (
    <div className="min-h-full bg-zinc-50 dark:bg-black">
      <AppHeader
        maxWidth="6xl"
        subtitle={
          <>
            <span className="hidden text-zinc-400 sm:inline">/</span>
            <span className="hidden text-sm text-zinc-600 dark:text-zinc-400 sm:inline">
              Developer Insights
            </span>
          </>
        }
      />

      <main className="mx-auto max-w-6xl px-6 py-8">
        <Link
          href="/"
          className="mb-6 inline-block text-sm text-zinc-500 hover:text-emerald-600"
        >
          ← Back to GitMind
        </Link>

        <DeveloperInsightsClient />
      </main>
    </div>
  );
}
