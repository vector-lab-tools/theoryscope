"use client";

import { useCorpus } from "@/context/CorpusContext";

export function CorpusLoader() {
  const { state, loadPhaseZero } = useCorpus();

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => void loadPhaseZero()}
        disabled={state === "loading"}
        className="px-3 py-1.5 bg-burgundy text-ivory text-sm tracking-wide uppercase disabled:opacity-50 hover:bg-burgundy-700 transition-colors"
      >
        {state === "loading" ? "Loading…" : "Load Phase 0 Corpus"}
      </button>
      <span className="text-xs text-ink/60">
        Philosophy of Technology · 20 documents
      </span>
    </div>
  );
}
