"use client";

import { useCorpus } from "@/context/CorpusContext";
import { useCorpusSource } from "@/context/CorpusSourceContext";

export function CorpusLoader() {
  const { state, loadCorpus } = useCorpus();
  const { selected, zoteroReady } = useCorpusSource();

  const disabled =
    state === "loading" ||
    (selected.kind === "zotero" && !zoteroReady);

  const hint =
    selected.kind === "hardcoded"
      ? "Philosophy of Technology · 20 hard-coded documents"
      : zoteroReady
      ? `Zotero · ${selected.collection_name || selected.collection_key}`
      : "Zotero · pick a collection first";

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => void loadCorpus()}
        disabled={disabled}
        className="px-3 py-1.5 bg-gold text-ivory text-sm tracking-wide uppercase disabled:opacity-50 hover:bg-gold-700 transition-colors"
      >
        {state === "loading" ? "Loading…" : "Load corpus"}
      </button>
      <span className="text-xs text-ink/60">{hint}</span>
    </div>
  );
}
