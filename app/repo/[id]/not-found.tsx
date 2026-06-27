import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-zinc-50 px-6 dark:bg-black">
      <h1 className="mb-2 text-2xl font-semibold">Repository not found</h1>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        This repo may not be indexed yet, or the link is invalid.
      </p>
      <Link
        href="/"
        className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-500"
      >
        Back to home
      </Link>
    </div>
  );
}
