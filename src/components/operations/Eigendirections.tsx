"use client";

import { useCallback, useState } from "react";
import { backendPost } from "@/hooks/useBackend";
import { ExportButton } from "@/components/shared/ExportButton";
import { useCorpusSource } from "@/context/CorpusSourceContext";
import type {
  EigenComponent,
  EigenLoading,
  EigendirectionsResponse,
} from "@/types/eigendirections";

type RunState = "idle" | "loading" | "ready" | "error";

export function Eigendirections() {
  const { buildPayload, selected, zoteroReady } = useCorpusSource();
  const [state, setState] = useState<RunState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<EigendirectionsResponse | null>(null);
  const [nComponents, setNComponents] = useState<number>(6);
  const [nLoadings, setNLoadings] = useState<number>(5);

  const canRun =
    state !== "loading" && (selected.kind === "hardcoded" || zoteroReady);

  const run = useCallback(async () => {
    setState("loading");
    setError(null);
    try {
      const result = await backendPost<EigendirectionsResponse>("/eigendirections", {
        corpus: buildPayload(),
        n_components: nComponents,
        n_loadings: nLoadings,
      });
      setData(result);
      setState("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setState("error");
    }
  }, [buildPayload, nComponents, nLoadings]);

  return (
    <section className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl text-ink">Eigendirections</h2>
          <p className="text-sm text-ink/70 mt-1 max-w-3xl">
            Principal axes of the corpus cloud. For each top component, the
            documents that load most positively and most negatively are
            shown as the two poles of the axis. Naming the axis is the
            critic&apos;s work; the tool supplies the pair of poles and
            their magnitudes. Compare the computed axes to the field&apos;s
            debated oppositions. The gap is diagnostic.
          </p>
        </div>
        <ExportButton payload={data} filename="theoryscope-eigendirections" />
      </header>

      <Controls
        nComponents={nComponents}
        nLoadings={nLoadings}
        onComponentsChange={setNComponents}
        onLoadingsChange={setNLoadings}
        onRun={() => void run()}
        disabled={!canRun}
      />

      {state === "loading" ? (
        <StatusPanel>Embedding corpus and computing PCA…</StatusPanel>
      ) : null}

      {state === "error" ? (
        <ErrorPanel>
          {error ?? "Unknown error."} Start the backend with
          <code className="mx-1 px-1 bg-ink/5">uvicorn main:app --reload</code>
          from the <code className="mx-1 px-1 bg-ink/5">backend/</code>{" "}
          directory and try again.
        </ErrorPanel>
      ) : null}

      {state === "idle" && !data ? (
        <StatusPanel>
          Choose the number of components and loadings, then press Compute.
        </StatusPanel>
      ) : null}

      {data ? <ResultsView data={data} /> : null}
    </section>
  );
}

function Controls({
  nComponents,
  nLoadings,
  onComponentsChange,
  onLoadingsChange,
  onRun,
  disabled,
}: {
  nComponents: number;
  nLoadings: number;
  onComponentsChange: (n: number) => void;
  onLoadingsChange: (n: number) => void;
  onRun: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-wrap items-end gap-6 p-4 border border-ink/10 bg-ivory/40">
      <NumberControl
        label="Components"
        value={nComponents}
        min={2}
        max={10}
        onChange={onComponentsChange}
      />
      <NumberControl
        label="Loadings per pole"
        value={nLoadings}
        min={2}
        max={8}
        onChange={onLoadingsChange}
      />
      <button
        type="button"
        onClick={onRun}
        disabled={disabled}
        className="ml-auto px-4 py-1.5 bg-burgundy text-ivory text-sm tracking-wide uppercase disabled:opacity-50 hover:bg-burgundy-700 transition-colors"
      >
        {disabled ? "Computing…" : "Compute"}
      </button>
    </div>
  );
}

function NumberControl({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="flex flex-col text-xs text-ink/70 gap-1">
      <span className="uppercase tracking-widest text-ink/50">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-40 accent-burgundy"
        />
        <span className="font-mono text-ink tabular-nums w-6 text-right">
          {value}
        </span>
      </div>
    </label>
  );
}

function StatusPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-8 border border-ink/10 bg-ivory/50 text-ink/70">
      {children}
    </div>
  );
}

function ErrorPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-6 border border-rose-300 bg-rose-50/40 text-rose-800 text-sm">
      {children}
    </div>
  );
}

function ResultsView({ data }: { data: EigendirectionsResponse }) {
  const cumulative = Math.round(data.total_variance_explained * 1000) / 10;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2 text-sm text-ink/70">
        <span>
          <strong className="text-ink">{data.components.length}</strong>{" "}
          components
        </span>
        <span>
          <strong className="text-ink">{data.documents.length}</strong>{" "}
          documents
        </span>
        <span>
          cumulative variance{" "}
          <strong className="text-ink">{cumulative.toFixed(1)}%</strong>
        </span>
        <span className="font-mono text-ink/50">
          {data.provenance.embedding.model_id} · dim{" "}
          {data.provenance.embedding.dimension}
        </span>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {data.components.map((c) => (
          <AxisCard key={c.index} component={c} />
        ))}
      </div>

      <details className="border border-ink/10 bg-ivory/40 p-4">
        <summary className="cursor-pointer text-sm font-semibold text-ink">
          Deep dive · full loadings + provenance
        </summary>
        <div className="mt-4 space-y-6">
          <div>
            <h3 className="text-xs uppercase tracking-widest text-ink/60 mb-2">
              Loadings table
            </h3>
            <LoadingsTable data={data} />
          </div>
          <div>
            <h3 className="text-xs uppercase tracking-widest text-ink/60 mb-2">
              Provenance
            </h3>
            <pre className="overflow-x-auto text-xs font-mono text-ink/80 bg-ivory/40 p-3 border border-ink/10">
{JSON.stringify(data.provenance, null, 2)}
            </pre>
          </div>
        </div>
      </details>
    </div>
  );
}

function AxisCard({ component: c }: { component: EigenComponent }) {
  const variancePct = c.variance_explained * 100;
  return (
    <article className="border border-ink/10 bg-white/60 p-4 space-y-4">
      <header className="space-y-1">
        <div className="flex items-baseline justify-between">
          <h3 className="font-display text-lg text-ink">PC{c.index + 1}</h3>
          <span className="text-sm text-ink/70 font-mono tabular-nums">
            {variancePct.toFixed(1)}% variance
          </span>
        </div>
        <VarianceBar fraction={c.variance_explained} />
      </header>

      <div className="grid grid-cols-2 gap-4">
        <Pole
          label="Positive pole"
          sign="+"
          loadings={c.positive_loadings}
          signClass="text-emerald-800"
        />
        <Pole
          label="Negative pole"
          sign="−"
          loadings={c.negative_loadings}
          signClass="text-rose-800"
        />
      </div>
    </article>
  );
}

function VarianceBar({ fraction }: { fraction: number }) {
  const pct = Math.max(0, Math.min(1, fraction)) * 100;
  return (
    <div
      className="h-1.5 bg-ink/10 overflow-hidden"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
    >
      <div
        className="h-full bg-burgundy"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function Pole({
  label,
  sign,
  loadings,
  signClass,
}: {
  label: string;
  sign: string;
  loadings: EigenLoading[];
  signClass: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] uppercase tracking-widest text-ink/50">
          {label}
        </span>
        <span className={`font-display text-sm ${signClass}`}>{sign}</span>
      </div>
      <ol className="space-y-1.5">
        {loadings.map((l) => (
          <li
            key={l.id}
            className="flex items-baseline justify-between gap-3 text-sm"
          >
            <div className="leading-snug min-w-0">
              <div className="text-ink truncate" title={l.title}>
                {shortAuthor(l.author)} {l.year}
              </div>
              <div className="text-xs text-ink/55 truncate" title={l.title}>
                {l.title}
              </div>
            </div>
            <span className="text-xs font-mono text-ink/60 tabular-nums shrink-0">
              {formatScore(l.score)}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function LoadingsTable({ data }: { data: EigendirectionsResponse }) {
  return (
    <div className="overflow-x-auto border border-ink/10">
      <table className="w-full text-xs font-mono">
        <thead className="bg-ivory/60 text-ink/70">
          <tr>
            <th className="text-left p-2 border-b border-ink/10">Document</th>
            {data.components.map((c) => (
              <th
                key={c.index}
                className="text-right p-2 border-b border-ink/10 tabular-nums"
              >
                PC{c.index + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.documents.map((doc, docIdx) => (
            <tr key={doc.id} className="border-b border-ink/5">
              <td className="p-2 text-ink/80">
                {shortAuthor(doc.author)} {doc.year}
              </td>
              {data.components.map((c) => (
                <td
                  key={c.index}
                  className="text-right p-2 text-ink/70 tabular-nums"
                >
                  {formatScore(c.coords[docIdx])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function shortAuthor(author: string): string {
  // "Heidegger, M." -> "Heidegger"; "Lin, H. W." -> "Lin".
  return author.split(",")[0] ?? author;
}

function formatScore(score: number): string {
  const sign = score >= 0 ? "+" : "−";
  return `${sign}${Math.abs(score).toFixed(3)}`;
}
