"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  type ChatMessage,
  SUGGESTED_QUESTIONS,
} from "@/lib/chat-types";

type ChatPanelProps = {
  repoId: string;
  githubUrl: string;
  defaultBranch: string;
};

function createId() {
  return crypto.randomUUID();
}

function getSourceUrl(githubUrl: string, branch: string, path: string) {
  return `${githubUrl}/blob/${branch}/${path}`;
}

export default function ChatPanel({
  repoId,
  githubUrl,
  defaultBranch,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setError(null);
    setLoading(true);

    const userMessage: ChatMessage = {
      id: createId(),
      role: "user",
      content: trimmed,
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");

    const assistantId = createId();

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoId,
          messages: nextMessages.map(({ role, content }) => ({ role, content })),
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Chat request failed.");
      }

      const sourcesHeader = response.headers.get("X-GitMind-Sources");
      const sources: string[] = sourcesHeader ? JSON.parse(sourcesHeader) : [];

      setMessages((current) => [
        ...current,
        { id: assistantId, role: "assistant", content: "", sources },
      ]);

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response stream.");
      }

      const decoder = new TextDecoder();
      let content = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        content += decoder.decode(value, { stream: true });

        setMessages((current) =>
          current.map((message) =>
            message.id === assistantId ? { ...message, content } : message,
          ),
        );
      }
    } catch (err) {
      setMessages((current) => current.filter((message) => message.id !== assistantId));
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void sendMessage(input);
  }

  return (
    <div className="flex h-[min(70vh,720px)] flex-col rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex-1 space-y-4 overflow-y-auto scrollbar-thi scrollbar-thumb-zinc-700 scrollbar-track-zinc-900 p-4 sm:p-6">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="mb-2 text-lg font-medium">Ask anything about this repo</p>
            <p className="mb-6 max-w-md text-sm text-zinc-600 dark:text-zinc-400">
              Hybrid search uses embedding similarity plus keywords for better
              retrieval.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTED_QUESTIONS.map((question) => (
                <button
                  key={question}
                  type="button"
                  onClick={() => void sendMessage(question)}
                  disabled={loading}
                  className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs text-zinc-700 transition hover:border-emerald-300 hover:bg-emerald-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-emerald-950"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                  message.role === "user"
                    ? "bg-emerald-600 text-white"
                    : "bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100"
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>

                {message.role === "assistant" && message.sources && message.sources.length > 0 && (
                  <div className="mt-3 border-t border-zinc-200 pt-3 dark:border-zinc-700">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Sources
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {message.sources.map((path) => (
                        <a
                          key={path}
                          href={getSourceUrl(githubUrl, defaultBranch, path)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-md bg-white px-2 py-1 font-mono text-xs text-emerald-700 hover:underline dark:bg-zinc-950 dark:text-emerald-400"
                        >
                          {path}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {loading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-zinc-100 px-4 py-3 text-sm text-zinc-500 dark:bg-zinc-900">
              Thinking...
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="border-t border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="border-t border-zinc-200 p-4 dark:border-zinc-800"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask about this codebase..."
            disabled={loading}
            className="flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none ring-emerald-500/0 transition focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
