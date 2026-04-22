"use client";

import { useCallback, useMemo, useState } from "react";
import { backendPost } from "@/hooks/useBackend";
import { ExportButton } from "@/components/shared/ExportButton";
import { useCorpusSource } from "@/context/CorpusSourceContext";
import type {
  ConceptProbe,
  ConceptSpectrumEntry,
  OperatorSpectrumResponse,
} from "@/types/flow";

type RunState = "idle" | "loading" | "ready" | "error";

const DEFAULT_CONCEPTS: ConceptProbe[] = [
  {
    label: "technology",
    text:
      "Technology as the systematic application of means to ends, the ensemble of artefacts and practices that organise labour and life.",
  },
  {
    label: "labour",
    text:
      "Labour as the expenditure of human effort in the transformation of nature; work, skill, and capacity measured and disciplined.",
  },
  {
    label: "power",
    text:
      "Power as the capacity to shape conduct, distribute resources, and constitute subjects through material and discursive relations.",
  },
  {
    label: "phenomenology",
    text:
      "Phenomenological description of embodied, lived experience; the first-person structures of perception, attention, and practice.",
  },
  {
    label: "democracy",
    text:
      "Democracy as collective self-government, the procedures and habits by which publics deliberate and decide matters in common.",
  },
  {
    label: "capital",
    text:
      "Capital as accumulated surplus value; the expansion of exchange relations and the subsumption of activity under valorisation.",
  },
];

export function OperatorSpectrum() {
  const { buildPayload, selected, zoteroReady } = useCorpusSource();
  const [state, setState] = useState<RunState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<OperatorSpectrumResponse | null>(null);
  const [concepts, setConcepts] = useState<ConceptProbe[]>(DEFAULT_CONCEPTS);
  const [nSteps, setNSteps] = useState<number>(6);

  const canRun =
    state !== "loading" &&
    concepts.length > 0 &&
    concepts.every(
      (c) => c.label.trim().length > 0 && c.text.trim().length > 0,
    ) &&
    (selected.kind === "hardcoded" || zoteroReady);

  const run = useCallback(async () => {
    setState("loading");
    setError(null);
    try {
      const result = await backendPost<OperatorSpectrumResponse>(
        "/operator-spectrum",
        {
          corpus: buildPayload(),
          concepts,
          n_steps: nSteps,
          seed: 0,
        },
      );
      setData(result);
      setState("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setState("error");
    }
  }, [buildPayload, concepts, nSteps]);

  const updateConcept = (i: number, patch: Partial<ConceptProbe>) => {
    setConcepts((prev) => prev.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  };
  const addConcept = () => {
    setConcepts((prev) => [...prev, { label: "", text: "" }]);
  };
  const removeConcept = (i: number) => {
    setConcepts((prev) => prev.filter((_, j) => j !== i));
  };

  const ranked: ConceptSpectrumEntry[] = useMemo(() => {
    if (!data) return [];
    return data.ranked_indices.map((i) => data.concepts[i]);
  }, [data]);

  return (
    <section className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl text-ink">
            Relevant / Irrelevant Operator Spectrum
          </h2>
          <p className="text-sm text-ink/70 mt-1 max-w-3xl">
            List concepts the field is thought to be organised around.
            The tool embeds each, measures how much of its
            discriminating power across documents is preserved as the
            corpus is progressively coarse-grained, and ranks the
            concepts. Relevance near 1.0: the concept&apos;s axis of
            variation aligns with what the flow preserves — a structural
            operator. Relevance near 0.0: the flow averages the concept
            out — a surface operator that the field varies along only
            at fine grain.
          </p>
        </div>
        <ExportButton
          payload={data}
          filename="theoryscope-operator-spectrum"
        />
      </header>

      <div className="p-4 border border-ink/10 bg-ivory/40 space-y-3">
        <div className="flex items-end justify-between gap-6 flex-wrap">
          <label className="flex flex-col text-xs text-ink/70 gap-1">
            <span className="uppercase tracking-widest text-ink/50">
              Flow steps
            </span>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={3}
                max={10}
                step={1}
                value={nSteps}
                onChange={(e) => setNSteps(Number(e.target.value))}
                className="w-40 accent-gold"
              />
              <span className="font-mono text-ink tabular-nums w-6 text-right">
                {nSteps}
              </span>
            </div>
          </label>
          <button
            type="button"
            onClick={addConcept}
            className="px-2.5 py-1 text-xs uppercase tracking-wide border border-ink/20 bg-white/60 text-ink/70 hover:bg-ivory/60"
          >
            + Add concept
          </button>
          <button
            type="button"
            onClick={() => void run()}
            disabled={!canRun}
            className="ml-auto px-3 py-1.5 bg-gold text-ivory text-sm tracking-wide uppercase disabled:opacity-50 hover:bg-gold-700 transition-colors"
          >
            {state === "loading" ? "Running…" : "Run spectrum"}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {concepts.map((c, i) => (
            <ConceptEditor
              key={i}
              concept={c}
              onChange={(patch) => updateConcept(i, patch)}
              onRemove={concepts.length > 1 ? () => removeConcept(i) : null}
            />
          ))}
        </div>
      </div>

      {state === "loading" ? (
        <div className="p-8 border border-ink/10 bg-ivory/50 text-ink/70">
          Embedding concepts and running the flow…
        </div>
      ) : null}

      {state === "error" ? (
        <div className="p-6 border border-rose-300 bg-rose-50/40 text-rose-800 text-sm">
          {error ?? "Unknown error."}
        </div>
      ) : null}

      {data ? (
        <div className="space-y-6">
          <div className="text-xs text-ink/60">
            Schedule: {data.schedule.join(" → ")}
          </div>

          <div className="space-y-3">
            {ranked.map((c, rank) => (
              <SpectrumCard
                key={c.index}
                entry={c}
                rank={rank}
                schedule={data.schedule}
                total={ranked.length}
              />
            ))}
          </div>

          <details className="border border-ink/10 bg-ivory/40 p-4">
            <summary className="cursor-pointer text-sm font-semibold text-ink">
              Deep dive · ratios table + provenance
            </summary>
            <div className="mt-4 space-y-3">
              <RatiosTable
                concepts={data.concepts}
                schedule={data.schedule}
              />
              <pre className="overflow-x-auto text-xs font-mono text-ink/80 bg-ivory/40 p-3 border border-ink/10">
{JSON.stringify(data.provenance, null, 2)}
              </pre>
            </div>
          </details>
        </div>
      ) : null}
    </section>
  );
}

function ConceptEditor({
  concept,
  onChange,
  onRemove,
}: {
  concept: ConceptProbe;
  onChange: (patch: Partial<ConceptProbe>) => void;
  onRemove: (() => void) | null;
}) {
  return (
    <div className="p-3 border border-ink/10 bg-white/50 space-y-1.5">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={concept.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="concept label"
          className="flex-1 px-2 py-1 bg-white/80 border border-ink/20 text-xs font-mono"
        />
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="text-xs text-rose-700 hover:text-rose-900 underline decoration-rose-300 hover:decoration-rose-800"
          >
            remove
          </button>
        ) : null}
      </div>
      <textarea
        value={concept.text}
        onChange={(e) => onChange({ text: e.target.value })}
        rows={3}
        placeholder="A sentence or two defining this concept for embedding."
        className="w-full px-2 py-1.5 bg-white/80 border border-ink/20 text-xs"
      />
    </div>
  );
}

function SpectrumCard({
  entry,
  rank,
  schedule,
  total,
}: {
  entry: ConceptSpectrumEntry;
  rank: number;
  schedule: number[];
  total: number;
}) {
  const score = entry.relevance_score;
  const badge =
    score >= 0.75
      ? { label: "relevant", className: "text-emerald-800" }
      : score >= 0.4
      ? { label: "partial", className: "text-amber-700" }
      : { label: "irrelevant", className: "text-rose-800" };

  return (
    <article className="border border-ink/10 bg-white/60 p-4 space-y-3">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-xs text-ink/50 w-10">
            #{rank + 1}/{total}
          </span>
          <h3 className="font-display text-base text-ink">{entry.label}</h3>
          <span className={`text-xs uppercase tracking-wide ${badge.className}`}>
            {badge.label}
          </span>
        </div>
        <div className="text-xs font-mono text-ink/60 tabular-nums">
          relevance = {score.toFixed(3)}
        </div>
      </header>
      <div className="h-1.5 bg-ink/10 overflow-hidden">
        <div
          className="h-full bg-gold"
          style={{ width: `${Math.max(0, Math.min(1, score)) * 100}%` }}
        />
      </div>
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${schedule.length}, minmax(0, 1fr))` }}>
        {entry.ratios_per_step.map((r, i) => (
          <div key={i} className="flex flex-col items-center">
            <div className="w-full h-16 bg-ink/5 relative overflow-hidden">
              <div
                className="absolute bottom-0 left-0 right-0 bg-gold"
                style={{ height: `${Math.max(0, Math.min(1, r)) * 100}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-ink/50 tabular-nums mt-1">
              k={schedule[i]}
            </span>
            <span className="text-[10px] font-mono text-ink/50 tabular-nums">
              {r.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
      <p className="text-xs text-ink/60 line-clamp-2">{entry.text}</p>
    </article>
  );
}

function RatiosTable({
  concepts,
  schedule,
}: {
  concepts: ConceptSpectrumEntry[];
  schedule: number[];
}) {
  return (
    <div className="overflow-x-auto border border-ink/10">
      <table className="w-full text-xs font-mono">
        <thead>
          <tr className="bg-ivory/60 text-ink/70">
            <th className="p-2 text-left border-b border-ink/10">Concept</th>
            <th className="p-2 text-right border-b border-ink/10">Relevance</th>
            {schedule.map((k, i) => (
              <th
                key={`h-${i}`}
                className="p-2 text-right border-b border-ink/10"
              >
                k={k}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {concepts.map((c) => (
            <tr key={c.index} className="border-b border-ink/5">
              <td className="p-2 text-ink/80 truncate max-w-[18ch]">{c.label}</td>
              <td className="p-2 text-right text-ink/80 tabular-nums">
                {c.relevance_score.toFixed(3)}
              </td>
              {c.ratios_per_step.map((r, i) => (
                <td
                  key={`c-${c.index}-${i}`}
                  className="p-2 text-right text-ink/70 tabular-nums"
                >
                  {r.toFixed(3)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
