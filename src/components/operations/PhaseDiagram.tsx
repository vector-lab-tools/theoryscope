"use client";

import { useCallback, useMemo, useState } from "react";
import { backendPost } from "@/hooks/useBackend";
import { ExportButton } from "@/components/shared/ExportButton";
import { useCorpusSource } from "@/context/CorpusSourceContext";
import type { PhaseDiagramResponse } from "@/types/critique";

type RunState = "idle" | "loading" | "ready" | "error";

const BASIN_PALETTE = [
  "#b8941e", "#355c7d", "#497e4f", "#6a4c93", "#b65e4c", "#3f8a97",
  "#a56a3a", "#2f6b5a", "#855a98", "#a63d57", "#4b6b9c", "#8c2f39",
];

export function PhaseDiagram() {
  const { buildPayload, selected, zoteroReady } = useCorpusSource();
  const [state, setState] = useState<RunState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PhaseDiagramResponse | null>(null);
  const [nSteps, setNSteps] = useState<number>(6);
  const [focusBasin, setFocusBasin] = useState<number | null>(null);
  const [showArrows, setShowArrows] = useState<boolean>(true);
  const [showHulls, setShowHulls] = useState<boolean>(true);

  const canRun =
    state !== "loading" && (selected.kind === "hardcoded" || zoteroReady);

  const run = useCallback(async () => {
    setState("loading");
    setError(null);
    try {
      const result = await backendPost<PhaseDiagramResponse>(
        "/phase-diagram",
        {
          corpus: buildPayload(),
          n_steps: nSteps,
          seed: 0,
        },
      );
      setData(result);
      setFocusBasin(null);
      setState("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setState("error");
    }
  }, [buildPayload, nSteps]);

  return (
    <section className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl text-ink">Phase Diagram</h2>
          <p className="text-sm text-ink/70 mt-1 max-w-3xl">
            A single readable image of the entire coarse-graining flow.
            Each document is a dot at its starting position; an arrow
            connects it to its terminal basin centroid; basins are
            shaded by the convex hull of their members; the fixed
            points (terminal centroids) are large dots. Analogous to
            RG phase diagrams in physics: one view of the flow&apos;s
            long-time behaviour.
          </p>
        </div>
        <ExportButton payload={data} filename="theoryscope-phase-diagram" />
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
        <label className="flex items-center gap-2 text-xs text-ink/70">
          <input
            type="checkbox"
            checked={showArrows}
            onChange={(e) => setShowArrows(e.target.checked)}
            className="accent-gold"
          />
          <span>Flow arrows</span>
        </label>
        <label className="flex items-center gap-2 text-xs text-ink/70">
          <input
            type="checkbox"
            checked={showHulls}
            onChange={(e) => setShowHulls(e.target.checked)}
            className="accent-gold"
          />
          <span>Basin hulls</span>
        </label>
        <button
          type="button"
          onClick={() => void run()}
          disabled={!canRun}
          className="ml-auto px-3 py-1.5 bg-gold text-ivory text-sm tracking-wide uppercase disabled:opacity-50 hover:bg-gold-700 transition-colors"
        >
          {state === "loading" ? "Rendering…" : "Render phase diagram"}
        </button>
      </div>

      {state === "loading" ? (
        <div className="p-8 border border-ink/10 bg-ivory/50 text-ink/70">
          Running the flow and computing basins…
        </div>
      ) : null}

      {state === "error" ? (
        <div className="p-6 border border-rose-300 bg-rose-50/40 text-rose-800 text-sm">
          {error ?? "Unknown error."}
        </div>
      ) : null}

      {data ? (
        <div className="space-y-4">
          <div className="text-xs text-ink/60">
            {data.n_basins} basin{data.n_basins === 1 ? "" : "s"} · schedule{" "}
            {data.schedule.join(" → ")} · PCA-2D variance{" "}
            {(data.pca2d_variance[0] * 100).toFixed(1)}% ·{" "}
            {(data.pca2d_variance[1] * 100).toFixed(1)}%
          </div>

          <DiagramSVG
            data={data}
            focusBasin={focusBasin}
            showArrows={showArrows}
            showHulls={showHulls}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.basins.map((b) => {
              const colour = BASIN_PALETTE[b.basin_index % BASIN_PALETTE.length];
              const isFocused = focusBasin === b.basin_index;
              return (
                <button
                  key={b.basin_index}
                  type="button"
                  onClick={() =>
                    setFocusBasin(isFocused ? null : b.basin_index)
                  }
                  className={[
                    "text-left p-3 border transition-colors",
                    isFocused
                      ? "border-gold bg-white/70"
                      : "border-ink/10 bg-white/50 hover:bg-ivory/50",
                  ].join(" ")}
                >
                  <div className="flex items-baseline gap-2">
                    <span
                      className="inline-block w-2.5 h-2.5 shrink-0"
                      style={{ backgroundColor: colour }}
                      aria-hidden="true"
                    />
                    <span className="font-display text-sm text-ink">
                      Basin {b.basin_index + 1}
                    </span>
                    <span className="ml-auto text-xs font-mono text-ink/60">
                      {b.n_members} doc{b.n_members === 1 ? "" : "s"}
                    </span>
                  </div>
                </button>
              );
            })}
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
      ) : null}
    </section>
  );
}

function DiagramSVG({
  data,
  focusBasin,
  showArrows,
  showHulls,
}: {
  data: PhaseDiagramResponse;
  focusBasin: number | null;
  showArrows: boolean;
  showHulls: boolean;
}) {
  const bounds = useMemo(() => {
    const xs: number[] = [];
    const ys: number[] = [];
    for (const d of data.documents) {
      xs.push(d.initial_2d[0], d.terminal_2d[0]);
      ys.push(d.initial_2d[1], d.terminal_2d[1]);
    }
    if (xs.length === 0) {
      return { minX: 0, maxX: 1, minY: 0, maxY: 1 };
    }
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
  }, [data]);

  const width = 800;
  const height = 500;
  const pad = 24;
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
        <defs>
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#1a1a1a" opacity={0.45} />
          </marker>
        </defs>

        {/* Basin hulls */}
        {showHulls
          ? data.basins.map((b) => {
              if (b.hull_2d.length < 3) return null;
              const colour =
                BASIN_PALETTE[b.basin_index % BASIN_PALETTE.length];
              const dim = focusBasin !== null && focusBasin !== b.basin_index;
              const points = b.hull_2d
                .map(([x, y]) => `${projX(x)},${projY(y)}`)
                .join(" ");
              return (
                <polygon
                  key={`h-${b.basin_index}`}
                  points={points}
                  fill={colour}
                  fillOpacity={dim ? 0.02 : 0.1}
                  stroke={colour}
                  strokeOpacity={dim ? 0.08 : 0.4}
                  strokeDasharray="4 3"
                  strokeWidth={0.8}
                />
              );
            })
          : null}

        {/* Flow arrows */}
        {showArrows
          ? data.documents.map((d) => {
              const dim = focusBasin !== null && focusBasin !== d.basin;
              const colour = BASIN_PALETTE[d.basin % BASIN_PALETTE.length];
              const x1 = projX(d.initial_2d[0]);
              const y1 = projY(d.initial_2d[1]);
              const x2 = projX(d.terminal_2d[0]);
              const y2 = projY(d.terminal_2d[1]);
              // Skip drawing arrows shorter than a few pixels — they collapse.
              const dx = x2 - x1;
              const dy = y2 - y1;
              const length = Math.hypot(dx, dy);
              if (length < 3) return null;
              return (
                <line
                  key={`a-${d.id}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={colour}
                  strokeOpacity={dim ? 0.08 : 0.55}
                  strokeWidth={0.9}
                  markerEnd="url(#arrow)"
                />
              );
            })
          : null}

        {/* Initial positions */}
        {data.documents.map((d) => {
          const dim = focusBasin !== null && focusBasin !== d.basin;
          const colour = BASIN_PALETTE[d.basin % BASIN_PALETTE.length];
          const cx = projX(d.initial_2d[0]);
          const cy = projY(d.initial_2d[1]);
          return (
            <g key={`d-${d.id}`}>
              <title>
                {`${d.author} ${d.year}\n${d.title}\nbasin ${d.basin + 1}`}
              </title>
              <circle
                cx={cx}
                cy={cy}
                r={dim ? 2.5 : 4}
                fill={colour}
                fillOpacity={dim ? 0.2 : 0.85}
                stroke="#1a1a1a"
                strokeOpacity={dim ? 0.1 : 0.5}
                strokeWidth={0.5}
              />
            </g>
          );
        })}

        {/* Fixed points */}
        {data.basins.map((b) => {
          const dim = focusBasin !== null && focusBasin !== b.basin_index;
          const colour = BASIN_PALETTE[b.basin_index % BASIN_PALETTE.length];
          const cx = projX(b.fixed_point_2d[0]);
          const cy = projY(b.fixed_point_2d[1]);
          return (
            <g key={`fp-${b.basin_index}`}>
              <circle
                cx={cx}
                cy={cy}
                r={9}
                fill="#faf8f2"
                fillOpacity={dim ? 0.4 : 0.9}
                stroke={colour}
                strokeOpacity={dim ? 0.3 : 1}
                strokeWidth={2.5}
              />
              <text
                x={cx + 12}
                y={cy + 4}
                fontSize={11}
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                fill="#222"
                fillOpacity={dim ? 0.3 : 0.85}
              >
                B{b.basin_index + 1}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
