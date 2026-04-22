"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { backendPost } from "@/hooks/useBackend";
import { ExportButton } from "@/components/shared/ExportButton";
import { useCorpusSource } from "@/context/CorpusSourceContext";
import type { CorpusDocument } from "@/types/corpus";
import type { TemporalFlowResponse, TemporalFlowStep } from "@/types/flow";

type RunState = "idle" | "loading" | "ready" | "error";

export function TemporalRGFlow() {
  const { buildPayload, selected, zoteroReady } = useCorpusSource();
  const [state, setState] = useState<RunState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TemporalFlowResponse | null>(null);
  const [nSteps, setNSteps] = useState<number>(6);
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [playing, setPlaying] = useState<boolean>(false);
  const intervalRef = useRef<number | null>(null);

  const canRun =
    state !== "loading" && (selected.kind === "hardcoded" || zoteroReady);

  const run = useCallback(async () => {
    setState("loading");
    setError(null);
    setPlaying(false);
    try {
      const result = await backendPost<TemporalFlowResponse>(
        "/temporal-flow",
        {
          corpus: buildPayload(),
          n_steps: nSteps,
        },
      );
      setData(result);
      setStepIndex(0);
      setState("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setState("error");
    }
  }, [buildPayload, nSteps]);

  useEffect(() => {
    if (!playing || !data) return;
    intervalRef.current = window.setInterval(() => {
      setStepIndex((i) => {
        const n = data.steps.length;
        if (n === 0) return 0;
        const next = i + 1;
        if (next >= n) {
          setPlaying(false);
          return n - 1;
        }
        return next;
      });
    }, 900);
    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [playing, data]);

  const currentStep = data?.steps[stepIndex];

  return (
    <section className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl text-ink">Temporal RG Flow</h2>
          <p className="text-sm text-ink/70 mt-1 max-w-3xl">
            Coarse-grain the corpus by progressively wider year windows
            rather than by semantic k-means. Each step groups documents
            into bins of a given width, places every document at its
            bin centroid, and projects onto the shared PCA-2D basis.
            Reading the flow: axes of variation that persist across
            wider windows are long-running; axes that only appear at
            fine temporal resolution are period-specific.
          </p>
        </div>
        <ExportButton
          payload={data}
          filename="theoryscope-temporal-flow"
        />
      </header>

      <div className="flex flex-wrap items-end gap-6 p-4 border border-ink/10 bg-ivory/40">
        <label className="flex flex-col text-xs text-ink/70 gap-1">
          <span className="uppercase tracking-widest text-ink/50">Steps</span>
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
          onClick={() => void run()}
          disabled={!canRun}
          className="ml-auto px-3 py-1.5 bg-gold text-ivory text-sm tracking-wide uppercase disabled:opacity-50 hover:bg-gold-700 transition-colors"
        >
          {state === "loading" ? "Binning…" : "Compute temporal flow"}
        </button>
      </div>

      {state === "loading" ? (
        <div className="p-8 border border-ink/10 bg-ivory/50 text-ink/70">
          Embedding the corpus and aggregating by time windows…
        </div>
      ) : null}

      {state === "error" ? (
        <div className="p-6 border border-rose-300 bg-rose-50/40 text-rose-800 text-sm">
          {error ?? "Unknown error."}
        </div>
      ) : null}

      {data && currentStep ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              className="px-3 py-1.5 text-xs uppercase tracking-wide border border-ink/20 bg-white/60 hover:bg-ivory/60 text-ink"
            >
              {playing ? "Pause" : "Play"}
            </button>
            <input
              type="range"
              min={0}
              max={data.steps.length - 1}
              step={1}
              value={stepIndex}
              onChange={(e) => {
                setStepIndex(Number(e.target.value));
                setPlaying(false);
              }}
              className="flex-1 accent-gold"
            />
            <span className="text-xs font-mono text-ink/70 tabular-nums w-36 text-right">
              step {stepIndex + 1}/{data.steps.length} ·{" "}
              width {currentStep.width}y · {currentStep.n_bins} bin
              {currentStep.n_bins === 1 ? "" : "s"}
            </span>
          </div>

          <TemporalScatter
            step={currentStep}
            documents={data.documents}
            yearMin={data.year_range.min}
            yearMax={data.year_range.max}
          />

          <TemporalScheduleBar
            schedule={data.schedule}
            currentIndex={stepIndex}
            onPick={(i) => {
              setStepIndex(i);
              setPlaying(false);
            }}
          />

          <details className="border border-ink/10 bg-ivory/40 p-4">
            <summary className="cursor-pointer text-sm font-semibold text-ink">
              Deep dive · bins + provenance
            </summary>
            <div className="mt-4 space-y-4 text-xs text-ink/80">
              <p className="font-mono">
                Year range: {data.year_range.min}–{data.year_range.max} ·
                span {data.year_range.span} years · widths{" "}
                {data.schedule.map((w) => `${w}y`).join(" → ")}
              </p>
              <p className="font-mono">
                2D variance explained:{" "}
                {(data.pca2d_variance[0] * 100).toFixed(1)}% ·{" "}
                {(data.pca2d_variance[1] * 100).toFixed(1)}%
              </p>
              <div>
                <div className="uppercase tracking-widest text-[10px] text-ink/50 mb-1">
                  Bins at step {stepIndex + 1} (width {currentStep.width}y)
                </div>
                <ul className="space-y-0.5">
                  {currentStep.bins.map((b, i) => (
                    <li key={i} className="font-mono">
                      {b.label === -1
                        ? "(year unknown)"
                        : `${b.year_range[0]}–${b.year_range[1]}`}
                      {" · "}
                      {b.n_documents} doc{b.n_documents === 1 ? "" : "s"}
                    </li>
                  ))}
                </ul>
              </div>
              <pre className="overflow-x-auto font-mono bg-ivory/40 p-3 border border-ink/10">
{JSON.stringify(data.provenance, null, 2)}
              </pre>
            </div>
          </details>
        </div>
      ) : null}
    </section>
  );
}

function TemporalScheduleBar({
  schedule,
  currentIndex,
  onPick,
}: {
  schedule: number[];
  currentIndex: number;
  onPick: (i: number) => void;
}) {
  return (
    <div className="flex items-stretch border border-ink/10">
      {schedule.map((width, i) => {
        const active = i === currentIndex;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onPick(i)}
            className={[
              "flex-1 px-2 py-1.5 text-xs tabular-nums font-mono transition-colors",
              active
                ? "bg-gold text-ivory"
                : "bg-white/60 text-ink/70 hover:bg-ivory/60",
              i > 0 ? "border-l border-ink/10" : "",
            ].join(" ")}
          >
            {width}y
          </button>
        );
      })}
    </div>
  );
}

function TemporalScatter({
  step,
  documents,
  yearMin,
  yearMax,
}: {
  step: TemporalFlowStep;
  documents: CorpusDocument[];
  yearMin: number;
  yearMax: number;
}) {
  const points = useMemo(
    () =>
      step.doc_coords_2d.map((c, i) => ({
        x: c[0],
        y: c[1],
        binLabel: step.doc_bin_labels[i],
        doc: documents[i],
      })),
    [step, documents],
  );

  const bounds = useMemo(() => {
    if (points.length === 0) return { minX: 0, maxX: 1, minY: 0, maxY: 1 };
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
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
  }, [points]);

  const width = 720;
  const height = 460;
  const pad = 22;
  const projX = (x: number) =>
    pad + ((x - bounds.minX) / (bounds.maxX - bounds.minX)) * (width - 2 * pad);
  const projY = (y: number) =>
    height -
    pad -
    ((y - bounds.minY) / (bounds.maxY - bounds.minY)) * (height - 2 * pad);

  // Temporal colour map: gold → charcoal across the year range, with a
  // distinct rose tone for unknown years.
  const colorFor = (year: number): string => {
    if (year <= 0) return "#a63d57"; // unknown
    const t = (year - yearMin) / Math.max(1, yearMax - yearMin);
    // Hue ramp from gold (43) toward teal (190) as time advances.
    const hue = Math.round(43 + t * (190 - 43));
    return `hsl(${hue}deg 45% ${Math.round(50 - t * 10)}%)`;
  };

  return (
    <div className="border border-ink/10 bg-white/60" style={{ height }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full"
      >
        {points.map((p, i) => {
          const cx = projX(p.x);
          const cy = projY(p.y);
          const colour = colorFor(p.doc.year);
          return (
            <g key={p.doc.id}>
              <title>
                {`${p.doc.author} ${p.doc.year}\n${p.doc.title}\nbin #${p.binLabel}`}
              </title>
              <circle
                cx={cx}
                cy={cy}
                r={5}
                fill={colour}
                fillOpacity={0.85}
                stroke="#1a1a1a"
                strokeOpacity={0.45}
                strokeWidth={0.5}
              />
              <text
                x={cx + 7}
                y={cy + 3}
                fontSize={10}
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                fill="#222"
                fillOpacity={0.8}
              >
                {shortAuthor(p.doc.author)} {p.doc.year || "—"}
              </text>
            </g>
          );
        })}
        {/* Legend */}
        <g transform={`translate(${pad}, ${height - pad + 4})`}>
          <text
            x={0}
            y={10}
            fontSize={9}
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            fill="#666"
          >
            {yearMin}
          </text>
          <text
            x={width - 2 * pad - 28}
            y={10}
            fontSize={9}
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            fill="#666"
          >
            {yearMax}
          </text>
        </g>
      </svg>
    </div>
  );
}

function shortAuthor(author: string): string {
  return author.split(",")[0] ?? author;
}
