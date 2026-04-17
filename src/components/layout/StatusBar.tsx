"use client";

import { useCorpus } from "@/context/CorpusContext";

export function StatusBar() {
  const { state, error, data } = useCorpus();

  const status =
    state === "idle"
      ? "No corpus loaded"
      : state === "loading"
      ? "Loading corpus…"
      : state === "error"
      ? "Error"
      : `Loaded: ${data?.documents.length ?? 0} documents`;

  const dot =
    state === "ready"
      ? "bg-emerald-600"
      : state === "loading"
      ? "bg-amber-500 animate-pulse"
      : state === "error"
      ? "bg-rose-600"
      : "bg-ink/30";

  return (
    <footer className="border-t border-ink/10 bg-ivory/70 px-6 py-2 flex items-center justify-between text-xs text-ink/70">
      <div className="flex items-center gap-2">
        <span className={`inline-block w-2 h-2 rounded-full ${dot}`} />
        <span>{status}</span>
      </div>
      {error ? <span className="text-rose-700 font-mono">{error}</span> : null}
      {data?.provenance ? (
        <span className="font-mono">
          {data.provenance.embedding.model_id} · dim {data.provenance.embedding.dimension}
        </span>
      ) : null}
    </footer>
  );
}
