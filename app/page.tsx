import AppHeader from "@/components/AppHeader";
import RepoInput from "@/components/RepoInput";
import UserRepos from "@/components/UserRepos";

export default function Home() {
  return (
    <div className="min-h-full bg-zinc-50 dark:bg-black">
      <AppHeader badge="Complete" />

      <main className="mx-auto flex max-w-5xl flex-col items-center px-6 py-20">
        <div className="mb-10 max-w-2xl text-center">
          <h1 className="mb-4 text-4xl font-semibold tracking-tigh  text-zinc-900 dark:text-zinc-50 sm:text-5xl ">
            Understand any GitHub repo instantly
          </h1>
          {/* <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Sign in, index a public repo, chat with grounded answers, explore
            architecture diagrams, and check repo health — all in one place.
          </p> */}
        </div>

        <RepoInput />
        <UserRepos />

        <div className="mt-16 grid w-full max-w-3xl gap-4 sm:grid-cols-3">
          {[
            {
              title: "Chat",
              description: "Ask anything with Groq and cited source files.",
            },
            {
              title: "Architecture",
              description: "Auto-generated summary and Mermaid diagram.",
            },
            {
              title: "Health",
              description: "Score your repo and get AI improvement tips.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <h2 className="mb-2 font-medium text-zinc-900 dark:text-zinc-100">
                {item.title}
              </h2>
              <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
