import AuthButton from "@/components/AuthButton";
import Link from "next/link";

type AppHeaderProps = {
  badge?: string;
  subtitle?: React.ReactNode;
  maxWidth?: "5xl" | "6xl";
};

export default function AppHeader({
  badge = "GitMind",
  subtitle,
  maxWidth = "5xl",
}: AppHeaderProps) {
  const widthClass = maxWidth === "6xl" ? "max-w-6xl" : "max-w-5xl";

  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div
        className={`mx-auto flex ${widthClass} items-center justify-between px-6 py-4`}
      >
        <div className="flex items-center gap-4">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            GitMind
          </Link>
          {subtitle}
        </div>

        <div className="flex items-center gap-4">
          {/* <span className="hidden rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 sm:inline">
            {badge}
          </span> */}
          <AuthButton />
        </div>
      </div>
    </header>
  );
}
