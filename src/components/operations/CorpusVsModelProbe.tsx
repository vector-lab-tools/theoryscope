"use client";

import { useCallback, useEffect, useState } from "react";
import { backendGet, backendPost } from "@/hooks/useBackend";
import { ExportButton } from "@/components/shared/ExportButton";
import { StabilityBar } from "@/components/viz/StabilityBar";
import { useCorpusSource } from "@/context/CorpusSourceContext";
import type {
  CorpusVsModelResponse,
  CvmGenerativeModel,
  CvmMatch,
  ProbeBasis,
} from "@/types/critique";

type RunState = "idle" | "loading" | "ready" | "error";

export function CorpusVsModelProbe() {
  const { buildPayload, selected, zoteroReady } = useCorpusSource();
  const [models, setModels] = useState<CvmGenerativeModel[]>([]);
  const [modelId, setModelId] = useState<string>("");
  const [nComponents, setNComponents] = useState<number>(5);
  const [state, setState] = useState<RunState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CorpusVsModelResponse | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const result = await backendGet<{ models: CvmGenerativeModel[] }>(
          "/corpus-vs-model/models",
        );
        setModels(result.models);
        if (result.models.length > 0) {
          setModelId(result.models[0].model_id);
        }
      } catch {
        // silent — run button will surface the error if the backend is down
      }
    })();
  }, []);

  const canRun =
    state !== "loading" &&
    modelId.length > 0 &&
    (selected.kind === "hardcoded" || zoteroReady);

  const run = useCallback(async () => {
    setState("loading");
    setError(null);
    try {
      const result = await backendPost<CorpusVsModelResponse>(
        "/corpus-vs-model",
        {
          corpus: buildPayload(),
          model_id: modelId,
          n_components: nComponents,
          n_loadings: 3,
        },
      );
      setData(result);
      setState("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setState("error");
    }
  }, [buildPayload, modelId, nComponents]);

  const activeModel = models.find((m) => m.model_id === modelId);

  return (
    <section className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl text-ink">Corpus-vs-Model Probe</h2>
          <p className="text-sm text-ink/70 mt-1 max-w-3xl">
            The reflexive operation. Compare the corpus&apos;s
            eigendirections under the baseline embedding against the
            eigendirections an open-weight generative model produces
            when it reads the same corpus (mean-pooled last hidden
            state). Agreement axes are ones the model preserved;
            disagreement axes are ones the model&apos;s compression
            smoothed over; delta directions are new axes the model
            produced that do not correspond to anything in the
            baseline. The Castelle-level methodological question made
            operational.
          </p>
        </div>
        <ExportButton
          payload={data}
          filename="theoryscope-corpus-vs-model"
        />
      </header>

      <div className="flex flex-wrap items-end gap-6 p-4 border border-ink/10 bg-ivory/40">
        <label className="flex flex-col text-xs text-ink/70 gap-1">
          <span className="uppercase tracking-widest text-ink/50">
            Generative model
          </span>
          <select
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            className="px-2 py-1.5 bg-white/60 border border-ink/20 text-sm min-w-[16ch]"
          >
            {models.length === 0 ? (
              <option value="">(load backend first)</option>
            ) : null}
            {models.map((m) => (
              <option key={m.model_id} value={m.model_id}>
                {m.label} · ~{m.size_mb} MB
              </option>
            ))}
          </select>
          {activeModel ? (
            <span className="text-[10px] font-mono text-ink/50 mt-1">
              {activeModel.model_id}
            </span>
          ) : null}
        </label>
        <label className="flex flex-col text-xs text-ink/70 gap-1">
          <span className="uppercase tracking-widest text-ink/50">
            Components
          </span>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={2}
              max={10}
              step={1}
              value={nComponents}
              onChange={(e) => setNComponents(Number(e.target.value))}
              className="w-40 accent-gold"
            />
            <span className="font-mono text-ink tabular-nums w-6 text-right">
              {nComponents}
            </span>
          </div>
        </label>
        <button
          type="button"
          onClick={() => void run()}
          disabled={!canRun}
          className="ml-auto px-3 py-1.5 bg-gold text-ivory text-sm tracking-wide uppercase disabled:opacity-50 hover:bg-gold-700 transition-colors"
        >
          {state === "loading" ? "Probing…" : "Run corpus-vs-model"}
        </button>
      </div>

      {state === "loading" ? (
        <div className="p-8 border border-ink/10 bg-ivory/50 text-ink/70">
          Running the generative model over every document. First run
          per model downloads ~300 MB – 1.5 GB from HuggingFace.
        </div>
      ) : null}

      {state === "error" ? (
        <div className="p-6 border border-rose-300 bg-rose-50/40 text-rose-800 text-sm">
          {error ?? "Unknown error."}
        </div>
      ) : null}

      {data ? <Results data={data} /> : null}
    </section>
  );
}

function Results({ data }: { data: CorpusVsModelResponse }) {
  const agreement = data.alignment.matches.filter((m) => m.mode === "agreement");
  const partial = data.alignment.matches.filter((m) => m.mode === "partial");
  const disagreement = data.alignment.matches.filter(
    (m) => m.mode === "disagreement",
  );

  return (
    <div className="space-y-6">
      <div className="border border-ink/10 bg-white/60 p-4 space-y-3">
        <div className="flex items-baseline justify-between">
          <h3 className="font-display text-base text-ink">Overall alignment</h3>
          <span className="text-xs font-mono text-ink/50">
            mean |Pearson cos| across matched components · {data.model.label}{" "}
            · {data.cache_hit ? "cache hit" : "cache miss"}
          </span>
        </div>
        <StabilityBar value={data.alignment.stability} label="stability" />
        <div className="text-xs text-ink/70 max-w-prose">
          <strong>Baseline:</strong> {data.baseline.model_id} · dim{" "}
          {data.baseline.dimension} (sentence-transformers embedding).
          <br />
          <strong>Probe:</strong> {data.probe.model_id} · hidden dim{" "}
          {data.model.hidden_dim} (mean-pooled last hidden state).
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <ModeCard
          title="Agreement"
          count={agreement.length}
          total={data.alignment.matches.length}
          toneClass="text-emerald-800 border-emerald-300 bg-emerald-50/40"
          hint="baseline axes the model preserved (|cos| ≥ 0.60)"
        />
        <ModeCard
          title="Partial"
          count={partial.length}
          total={data.alignment.matches.length}
          toneClass="text-amber-700 border-amber-300 bg-amber-50/40"
          hint="partially preserved (0.30 ≤ |cos| < 0.60)"
        />
        <ModeCard
          title="Disagreement"
          count={disagreement.length}
          total={data.alignment.matches.length}
          toneClass="text-rose-800 border-rose-300 bg-rose-50/40"
          hint="baseline axes the model's compression smoothed over (|cos| < 0.30)"
        />
      </div>

      <div>
        <h3 className="font-display text-base text-ink mb-3">
          Per-component alignment
        </h3>
        <div className="space-y-3">
          {data.alignment.matches.map((m) => (
            <MatchCard key={`pc-${m.a_index}`} match={m} />
          ))}
        </div>
      </div>

      {data.delta_directions.length > 0 ? (
        <div>
          <h3 className="font-display text-base text-ink mb-3">
            Delta directions (model axes not in the baseline)
          </h3>
          <p className="text-sm text-ink/70 mb-3 max-w-prose">
            These are principal components the generative model
            produced on the corpus that don&apos;t correspond strongly
            to any baseline axis. They may be structure the model
            brought from its broader training data, or structure the
            baseline embedding missed.
          </p>
          <ul className="space-y-1.5">
            {data.delta_directions.map((d, i) => (
              <li
                key={`delta-${i}`}
                className="flex items-baseline justify-between gap-3 text-sm border border-ink/10 bg-white/50 p-2"
              >
                <span className="font-display text-ink">
                  Model PC{d.model_pc + 1}
                </span>
                <span className="text-xs font-mono text-ink/60 tabular-nums">
                  {(d.variance_explained * 100).toFixed(1)}% variance
                  {d.weakly_matched_to_baseline_pc !== undefined
                    ? ` · weakly matched to baseline PC${d.weakly_matched_to_baseline_pc + 1} (|cos| ${d.matched_abs_cosine?.toFixed(2) ?? "—"})`
                    : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BasisPanel basis={data.baseline} title="Baseline basis" />
        <BasisPanel basis={data.probe} title="Model basis" />
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

function ModeCard({
  title,
  count,
  total,
  toneClass,
  hint,
}: {
  title: string;
  count: number;
  total: number;
  toneClass: string;
  hint: string;
}) {
  return (
    <div className={`border p-3 ${toneClass}`}>
      <div className="text-[10px] uppercase tracking-widest opacity-70">
        {title}
      </div>
      <div className="mt-1 font-display text-lg tabular-nums">
        {count} / {total}
      </div>
      <div className="text-xs mt-1 opacity-80">{hint}</div>
    </div>
  );
}

function MatchCard({ match }: { match: CvmMatch }) {
  const toneBorder =
    match.mode === "agreement"
      ? "border-emerald-300"
      : match.mode === "partial"
      ? "border-amber-300"
      : "border-rose-300";
  const toneBg =
    match.mode === "agreement"
      ? "bg-emerald-50/40"
      : match.mode === "partial"
      ? "bg-amber-50/30"
      : "bg-rose-50/30";

  return (
    <div className={`border ${toneBorder} ${toneBg} p-3 space-y-2`}>
      <div className="flex items-baseline justify-between">
        <span className="font-display text-sm text-ink">
          Baseline PC{match.a_index + 1} ↔ Model PC{match.b_index + 1}
        </span>
        <span className="text-xs font-mono text-ink/60">
          signed cos = {match.signed_cosine.toFixed(3)} ·{" "}
          {match.mode}
        </span>
      </div>
      <StabilityBar value={match.abs_cosine} />
    </div>
  );
}

function BasisPanel({ basis, title }: { basis: ProbeBasis; title: string }) {
  return (
    <div className="border border-ink/10 bg-white/60 p-4 space-y-3">
      <div className="flex items-baseline justify-between">
        <h4 className="font-display text-sm text-ink">{title}</h4>
        <span className="text-xs font-mono text-ink/50">
          {basis.model_id.split("/").pop()} · dim {basis.dimension}
        </span>
      </div>
      <ol className="space-y-3">
        {basis.loadings.map((componentLoadings, pcIdx) => {
          const variance = basis.variance_explained[pcIdx] ?? 0;
          const positives = componentLoadings.filter((l) => l.pole === "positive");
          const negatives = componentLoadings.filter((l) => l.pole === "negative");
          return (
            <li key={`pc-${pcIdx}`} className="text-xs space-y-1">
              <div className="flex items-baseline justify-between">
                <span className="font-display text-ink">PC{pcIdx + 1}</span>
                <span className="font-mono text-ink/60">
                  {(variance * 100).toFixed(1)}%
                </span>
              </div>
              <div className="text-emerald-800">
                +{" "}
                {positives
                  .map((l) => `${l.author.split(",")[0]} ${l.year}`)
                  .join(" · ")}
              </div>
              <div className="text-rose-800">
                −{" "}
                {negatives
                  .map((l) => `${l.author.split(",")[0]} ${l.year}`)
                  .join(" · ")}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
