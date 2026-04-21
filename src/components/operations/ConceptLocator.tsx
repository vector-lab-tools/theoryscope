"use client";

import { useCallback, useState } from "react";
import { backendPost } from "@/hooks/useBackend";
import { ExportButton } from "@/components/shared/ExportButton";
import { useCorpusSource } from "@/context/CorpusSourceContext";
import type { ConceptLocatorResponse } from "@/types/inspect";

type RunState = "idle" | "loading" | "ready" | "error";

const DEFAULT_QUERIES: { label: string; text: string }[] = [
  {
    label: "bestand · standing reserve",
    text: "The essence of technology reveals the world as Bestand, standing-reserve, material awaiting use — ordered and calculable resource.",
  },
  {
    label: "prosthesis",
    text: "Prosthesis fills the gap of originary technicity: the human is always-already supplemented by tools and inscriptions.",
  },
  {
    label: "protocol",
    text: "Control after decentralisation operates through protocol: distributed standards rather than sovereign centres.",
  },
];

export function ConceptLocator() {
  const { buildPayload, selected, zoteroReady } = useCorpusSource();
  const [state, setState] = useState<RunState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ConceptLocatorResponse | null>(null);
  const [queryText, setQueryText] = useState<string>(DEFAULT_QUERIES[0].text);
  const [queryLabel, setQueryLabel] = useState<string>(DEFAULT_QUERIES[0].label);

  const canRun =
    state !== "loading" &&
    queryText.trim().length > 0 &&
    (selected.kind === "hardcoded" || zoteroReady);

  const run = useCallback(async () => {
    setState("loading");
    setError(null);
    try {
      const result = await backendPost<ConceptLocatorResponse>(
        "/concept-locator",
        {
          corpus: buildPayload(),
          query_text: queryText,
          query_label: queryLabel,
          n_nearest_docs: 8,
          n_nearest_authors: 5,
          n_components: 6,
        },
      );
      setData(result);
      setState("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setState("error");
    }
  }, [buildPayload, queryText, queryLabel]);

  return (
    <section className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl text-ink">Concept Locator</h2>
          <p className="text-sm text-ink/70 mt-1 max-w-3xl">
            Embed a concept or passage into the same space as the loaded
            corpus. The tool reports the nearest documents, the nearest
            authors, and the principal component most aligned with the
            query. Use it to situate a concept within the field and to
            see which computed axis carries it.
          </p>
        </div>
        <ExportButton payload={data} filename="theoryscope-concept-locator" />
      </header>

      <div className="space-y-3 p-4 border border-ink/10 bg-ivory/40">
        <div className="flex flex-wrap gap-2">
          {DEFAULT_QUERIES.map((q) => (
            <button
              key={q.label}
              type="button"
              onClick={() => {
                setQueryText(q.text);
                setQueryLabel(q.label);
              }}
              className={[
                "px-2.5 py-1 text-xs uppercase tracking-wide border transition-colors",
                queryLabel === q.label
                  ? "border-gold text-ink bg-white/70"
                  : "border-ink/20 text-ink/70 bg-white/40 hover:bg-white/60",
              ].join(" ")}
            >
              {q.label}
            </button>
          ))}
        </div>
        <label className="flex flex-col text-xs text-ink/70 gap-1">
          <span className="uppercase tracking-widest text-ink/50">Label</span>
          <input
            type="text"
            value={queryLabel}
            onChange={(e) => setQueryLabel(e.target.value)}
            placeholder="short label for provenance"
            className="px-2 py-1.5 bg-white/60 border border-ink/20 text-sm font-mono"
          />
        </label>
        <label className="flex flex-col text-xs text-ink/70 gap-1">
          <span className="uppercase tracking-widest text-ink/50">
            Concept or passage
          </span>
          <textarea
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            rows={4}
            className="px-2 py-1.5 bg-white/60 border border-ink/20 text-sm"
            placeholder="Paste a concept, definition, or short passage…"
          />
        </label>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void run()}
            disabled={!canRun}
            className="px-3 py-1.5 bg-gold text-ivory text-sm tracking-wide uppercase disabled:opacity-50 hover:bg-gold-700 transition-colors"
          >
            {state === "loading" ? "Locating…" : "Locate"}
          </button>
        </div>
      </div>

      {state === "loading" ? (
        <div className="p-8 border border-ink/10 bg-ivory/50 text-ink/70">
          Embedding the query and comparing against the corpus…
        </div>
      ) : null}

      {state === "error" ? (
        <div className="p-6 border border-rose-300 bg-rose-50/40 text-rose-800 text-sm">
          {error ?? "Unknown error."}
        </div>
      ) : null}

      {data ? <ConceptResults data={data} /> : null}
    </section>
  );
}

function ConceptResults({ data }: { data: ConceptLocatorResponse }) {
  const best = data.eigenbasis.per_component[data.eigenbasis.best_pc];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border border-ink/10 bg-white/60 p-4 space-y-3">
          <h3 className="font-display text-base text-ink">Nearest documents</h3>
          <ol className="space-y-1.5">
            {data.nearest_documents.map((d) => (
              <li
                key={d.id}
                className="flex items-baseline justify-between gap-3 text-sm"
              >
                <div className="leading-snug min-w-0">
                  <div className="text-ink">
                    {shortAuthor(d.author)} {d.year}
                  </div>
                  <div className="text-xs text-ink/55 truncate" title={d.title}>
                    {d.title}
                  </div>
                </div>
                <span className="text-xs font-mono text-ink/70 tabular-nums shrink-0">
                  {d.similarity.toFixed(3)}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="border border-ink/10 bg-white/60 p-4 space-y-3">
          <h3 className="font-display text-base text-ink">Nearest authors</h3>
          <ol className="space-y-1.5">
            {data.nearest_authors.map((a) => (
              <li
                key={a.author}
                className="flex items-baseline justify-between gap-3 text-sm"
              >
                <span className="text-ink">{a.author}</span>
                <span className="text-xs font-mono text-ink/70 tabular-nums shrink-0">
                  {a.similarity.toFixed(3)} · {a.n_documents}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="border border-ink/10 bg-white/60 p-4 space-y-3">
        <div className="flex items-baseline justify-between">
          <h3 className="font-display text-base text-ink">
            Most-aligned principal component
          </h3>
          {best ? (
            <span className="text-xs font-mono text-ink/60">
              PC{best.index + 1} · |cos| = {best.abs_cosine.toFixed(3)} ·{" "}
              {(best.variance_explained * 100).toFixed(1)}% variance
            </span>
          ) : null}
        </div>
        <div className="space-y-2">
          {data.eigenbasis.per_component.map((c) => (
            <div
              key={c.index}
              className={[
                "flex items-center gap-3 text-xs",
                c.index === data.eigenbasis.best_pc ? "" : "opacity-70",
              ].join(" ")}
            >
              <span className="font-display text-sm text-ink w-12 shrink-0">
                PC{c.index + 1}
              </span>
              <div className="flex-1 h-1.5 bg-ink/10 overflow-hidden">
                <div
                  className="h-full bg-gold"
                  style={{ width: `${c.abs_cosine * 100}%` }}
                />
              </div>
              <span className="font-mono text-ink/70 tabular-nums w-16 text-right">
                {c.signed_cosine.toFixed(3)}
              </span>
              <span className="font-mono text-ink/50 tabular-nums w-14 text-right">
                {(c.variance_explained * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      <details className="border border-ink/10 bg-ivory/40 p-4">
        <summary className="cursor-pointer text-sm font-semibold text-ink">
          Deep dive · provenance
        </summary>
        <pre className="mt-3 overflow-x-auto text-xs font-mono text-ink/80">
{JSON.stringify(data.provenance, null, 2)}
        </pre>
      </details>
    </div>
  );
}

function shortAuthor(author: string): string {
  return author.split(",")[0] ?? author;
}
