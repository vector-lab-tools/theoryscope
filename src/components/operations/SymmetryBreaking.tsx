"use client";

import { useCallback, useMemo, useState } from "react";
import { backendPost } from "@/hooks/useBackend";
import { ExportButton } from "@/components/shared/ExportButton";
import { StabilityBar } from "@/components/viz/StabilityBar";
import { useCorpusSource } from "@/context/CorpusSourceContext";
import type {
  SymmetryBreakingResponse,
  SymmetryDocumentEntry,
} from "@/types/critique";

type RunState = "idle" | "loading" | "ready" | "error";

type Splitter =
  | "year_decade"
  | "year_threshold"
  | "first_tag"
  | "author";

const SPLITTERS: { value: Splitter; label: string; hint: string }[] = [
  {
    value: "year_decade",
    label: "By decade",
    hint: "Groups documents into 1910s, 1920s, … by publication year.",
  },
  {
    value: "year_threshold",
    label: "Pre / post threshold year",
    hint: "Binary split: before vs ≥ chosen year.",
  },
  {
    value: "first_tag",
    label: "By first tag",
    hint: "Groups by each document's leading tag (e.g. phenomenological, critical).",
  },
  {
    value: "author",
    label: "By author",
    hint: "One group per unique author. Useful on multi-doc-per-author corpora.",
  },
];

export function SymmetryBreaking() {
  const { buildPayload, selected, zoteroReady } = useCorpusSource();
  const [splitter, setSplitter] = useState<Splitter>("year_threshold");
  const [threshold, setThreshold] = useState<number>(1990);
  const [nComponents, setNComponents] = useState<number>(5);
  const [state, setState] = useState<RunState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SymmetryBreakingResponse | null>(null);
  const [focused, setFocused] = useState<string | null>(null);

  const canRun =
    state !== "loading" && (selected.kind === "hardcoded" || zoteroReady);

  const run = useCallback(async () => {
    setState("loading");
    setError(null);
    try {
      const result = await backendPost<SymmetryBreakingResponse>(
        "/symmetry-breaking",
        {
          corpus: buildPayload(),
          splitter,
          threshold: splitter === "year_threshold" ? threshold : null,
          n_components: nComponents,
        },
      );
      setData(result);
      setFocused(null);
      setState("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setState("error");
    }
  }, [buildPayload, splitter, threshold, nComponents]);

  const activeSplitter = SPLITTERS.find((s) => s.value === splitter)!;

  return (
    <section className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl text-ink">Symmetry Breaking Map</h2>
          <p className="text-sm text-ink/70 mt-1 max-w-3xl">
            Name a parameter that might split the field. The tool
            reports how far the cloud actually separates along it:
            silhouette score, between/within variance, and per-PC
            alignment with the between-group direction. A high
            silhouette + a high variance ratio + good alignment on a
            top PC means the splitter corresponds to a genuine
            symmetry breaking in the corpus&apos;s geometry. Low
            values mean the field is symmetric with respect to your
            splitter — it doesn&apos;t actually split along this line.
          </p>
        </div>
        <ExportButton payload={data} filename="theoryscope-symmetry-breaking" />
      </header>

      <div className="p-4 border border-ink/10 bg-ivory/40 space-y-3">
        <div className="flex flex-wrap gap-2">
          {SPLITTERS.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setSplitter(s.value)}
              title={s.hint}
              className={[
                "px-2.5 py-1 text-xs uppercase tracking-wide border transition-colors",
                splitter === s.value
                  ? "border-gold text-ink bg-white/70"
                  : "border-ink/20 text-ink/70 bg-white/40 hover:bg-white/60",
              ].join(" ")}
            >
              {s.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-ink/60">{activeSplitter.hint}</p>

        <div className="flex flex-wrap items-end gap-6">
          {splitter === "year_threshold" ? (
            <label className="flex flex-col text-xs text-ink/70 gap-1">
              <span className="uppercase tracking-widest text-ink/50">
                Threshold year
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1700}
                  max={2100}
                  step={1}
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="px-2 py-1 bg-white/60 border border-ink/20 text-sm font-mono w-24"
                />
              </div>
            </label>
          ) : null}
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
            {state === "loading" ? "Splitting…" : "Run splitter"}
          </button>
        </div>
      </div>

      {state === "loading" ? (
        <div className="p-8 border border-ink/10 bg-ivory/50 text-ink/70">
          Grouping documents and computing separation metrics…
        </div>
      ) : null}

      {state === "error" ? (
        <div className="p-6 border border-rose-300 bg-rose-50/40 text-rose-800 text-sm">
          {error ?? "Unknown error."}
        </div>
      ) : null}

      {data ? (
        <Results
          data={data}
          focused={focused}
          onFocus={(g) => setFocused(focused === g ? null : g)}
        />
      ) : null}
    </section>
  );
}

function Results({
  data,
  focused,
  onFocus,
}: {
  data: SymmetryBreakingResponse;
  focused: string | null;
  onFocus: (g: string) => void;
}) {
  const groupNames = useMemo(
    () => data.groups.map((g) => g.label),
    [data],
  );
  const colorFor = useMemo(() => {
    const palette = [
      "#b8941e", "#355c7d", "#497e4f", "#6a4c93", "#b65e4c", "#3f8a97",
      "#a56a3a", "#2f6b5a", "#855a98", "#a63d57", "#4b6b9c", "#8c2f39",
    ];
    return (g: string): string => {
      const idx = groupNames.indexOf(g);
      return palette[idx % palette.length] ?? "#777";
    };
  }, [groupNames]);

  // Metric cards summary.
  const hasSilhouette = Number.isFinite(data.silhouette_score);
  const hasF = Number.isFinite(data.f_statistic);

  const bestPC = data.per_component[data.best_pc];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MetricCard
          label="Silhouette"
          value={hasSilhouette ? data.silhouette_score.toFixed(3) : "—"}
          tone={
            hasSilhouette
              ? data.silhouette_score >= 0.25
                ? "emerald"
                : data.silhouette_score >= 0.05
                ? "amber"
                : "rose"
              : "neutral"
          }
          hint={
            hasSilhouette
              ? data.silhouette_score >= 0.25
                ? "groups cleanly separated"
                : data.silhouette_score >= 0.05
                ? "weak but positive separation"
                : "no meaningful separation"
              : "not computed"
          }
        />
        <MetricCard
          label="F-statistic"
          value={hasF ? data.f_statistic.toFixed(2) : "—"}
          tone={hasF ? (data.f_statistic >= 2 ? "emerald" : data.f_statistic >= 1 ? "amber" : "rose") : "neutral"}
          hint={
            hasF
              ? data.f_statistic >= 2
                ? "between-group variance dominates"
                : data.f_statistic >= 1
                ? "comparable between vs within"
                : "within-group variance dominates"
              : ""
          }
        />
        <MetricCard
          label={`Best PC: PC${(bestPC?.pc ?? 0) + 1}`}
          value={bestPC ? bestPC.abs_cosine.toFixed(3) : "—"}
          tone={
            bestPC
              ? bestPC.abs_cosine >= 0.6
                ? "emerald"
                : bestPC.abs_cosine >= 0.3
                ? "amber"
                : "rose"
              : "neutral"
          }
          hint={
            bestPC
              ? `|cos| with between-group direction · ${(bestPC.variance_explained * 100).toFixed(1)}% variance`
              : ""
          }
        />
      </div>

      <GroupScatter
        documents={data.documents}
        groups={data.groups}
        colorFor={colorFor}
        focused={focused}
      />

      <div>
        <h3 className="font-display text-base text-ink mb-3">Groups</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.groups.map((g) => (
            <button
              key={g.label}
              type="button"
              onClick={() => onFocus(g.label)}
              className={[
                "text-left p-3 border transition-colors",
                focused === g.label
                  ? "border-gold bg-white/70"
                  : "border-ink/10 bg-white/50 hover:bg-ivory/50",
              ].join(" ")}
            >
              <div className="flex items-baseline gap-2">
                <span
                  className="inline-block w-2.5 h-2.5 shrink-0"
                  style={{ backgroundColor: colorFor(g.label) }}
                  aria-hidden="true"
                />
                <span className="font-display text-sm text-ink truncate">
                  {g.label}
                </span>
                <span className="ml-auto text-xs font-mono text-ink/60">
                  {g.n_documents} doc{g.n_documents === 1 ? "" : "s"}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-display text-base text-ink mb-3">
          Per-component alignment
        </h3>
        <div className="space-y-2">
          {data.per_component.map((c) => (
            <div
              key={c.pc}
              className={[
                "flex items-center gap-3 text-xs",
                c.pc === data.best_pc ? "" : "opacity-70",
              ].join(" ")}
            >
              <span className="font-display text-sm text-ink w-12 shrink-0">
                PC{c.pc + 1}
              </span>
              <div className="flex-1">
                <StabilityBar value={c.abs_cosine} />
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
          Deep dive · variance + provenance
        </summary>
        <div className="mt-4 space-y-2 text-xs font-mono text-ink/80">
          <p>between-variance: {data.between_variance.toFixed(4)}</p>
          <p>within-variance: {data.within_variance.toFixed(4)}</p>
          <p>
            PCA-2D variance explained:{" "}
            {(data.pca2d_variance[0] * 100).toFixed(1)}% ·{" "}
            {(data.pca2d_variance[1] * 100).toFixed(1)}%
          </p>
          <pre className="overflow-x-auto bg-ivory/40 p-3 border border-ink/10 text-ink/80">
{JSON.stringify(data.provenance, null, 2)}
          </pre>
        </div>
      </details>
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: string;
  tone: "emerald" | "amber" | "rose" | "neutral";
  hint: string;
}) {
  const toneClass =
    tone === "emerald"
      ? "text-emerald-800"
      : tone === "amber"
      ? "text-amber-700"
      : tone === "rose"
      ? "text-rose-800"
      : "text-ink";
  return (
    <div className="border border-ink/10 bg-white/60 p-3">
      <div className="text-[10px] uppercase tracking-widest text-ink/50">
        {label}
      </div>
      <div className={`mt-1 font-display text-lg tabular-nums ${toneClass}`}>
        {value}
      </div>
      <div className="text-xs text-ink/60 mt-1">{hint}</div>
    </div>
  );
}

function GroupScatter({
  documents,
  groups,
  colorFor,
  focused,
}: {
  documents: SymmetryDocumentEntry[];
  groups: { label: string; centroid_2d: [number, number] }[];
  colorFor: (g: string) => string;
  focused: string | null;
}) {
  const bounds = useMemo(() => {
    if (documents.length === 0) return { minX: 0, maxX: 1, minY: 0, maxY: 1 };
    const xs = documents.map((d) => d.coords_2d[0]);
    const ys = documents.map((d) => d.coords_2d[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const spanX = maxX - minX || 1;
    const spanY = maxY - minY || 1;
    return {
      minX: minX - spanX * 0.08,
      maxX: maxX + spanX * 0.08,
      minY: minY - spanY * 0.08,
      maxY: maxY + spanY * 0.08,
    };
  }, [documents]);

  const width = 720;
  const height = 440;
  const pad = 22;
  const projX = (x: number) =>
    pad + ((x - bounds.minX) / (bounds.maxX - bounds.minX)) * (width - 2 * pad);
  const projY = (y: number) =>
    height -
    pad -
    ((y - bounds.minY) / (bounds.maxY - bounds.minY)) * (height - 2 * pad);

  return (
    <div className="border border-ink/10 bg-white/60" style={{ height }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full"
      >
        {documents.map((d) => {
          const cx = projX(d.coords_2d[0]);
          const cy = projY(d.coords_2d[1]);
          const dim = focused !== null && focused !== d.group;
          const colour = colorFor(d.group);
          return (
            <g key={d.id}>
              <title>
                {`${d.author} ${d.year}\n${d.title}\ngroup: ${d.group}`}
              </title>
              <circle
                cx={cx}
                cy={cy}
                r={dim ? 3 : 5}
                fill={colour}
                fillOpacity={dim ? 0.15 : 0.85}
                stroke="#1a1a1a"
                strokeOpacity={dim ? 0.1 : 0.4}
                strokeWidth={0.5}
              />
              <text
                x={cx + 7}
                y={cy + 3}
                fontSize={10}
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                fill="#222"
                fillOpacity={dim ? 0.25 : 0.85}
              >
                {d.author.split(",")[0]} {d.year}
              </text>
            </g>
          );
        })}
        {/* Centroids */}
        {groups.map((g) => {
          const cx = projX(g.centroid_2d[0]);
          const cy = projY(g.centroid_2d[1]);
          const dim = focused !== null && focused !== g.label;
          const colour = colorFor(g.label);
          return (
            <g key={`c-${g.label}`}>
              <circle
                cx={cx}
                cy={cy}
                r={8}
                fill="none"
                stroke={colour}
                strokeOpacity={dim ? 0.3 : 0.9}
                strokeWidth={2}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
