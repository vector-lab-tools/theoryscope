"use client";

import { useCallback, useMemo, useState } from "react";
import { backendPost } from "@/hooks/useBackend";
import { ExportButton } from "@/components/shared/ExportButton";
import { useCorpusSource } from "@/context/CorpusSourceContext";
import type {
  AuthorConstellationResponse,
  AuthorEntry,
} from "@/types/inspect";

type RunState = "idle" | "loading" | "ready" | "error";

export function AuthorConstellation() {
  const { buildPayload, selected, zoteroReady } = useCorpusSource();
  const [state, setState] = useState<RunState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AuthorConstellationResponse | null>(null);
  const [minDocuments, setMinDocuments] = useState<number>(1);
  const [focused, setFocused] = useState<string | null>(null);

  const canRun =
    state !== "loading" && (selected.kind === "hardcoded" || zoteroReady);

  const run = useCallback(async () => {
    setState("loading");
    setError(null);
    try {
      const result = await backendPost<AuthorConstellationResponse>(
        "/author-constellation",
        {
          corpus: buildPayload(),
          min_documents: minDocuments,
        },
      );
      setData(result);
      setFocused(null);
      setState("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setState("error");
    }
  }, [buildPayload, minDocuments]);

  return (
    <section className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl text-ink">
            Author Constellation
          </h2>
          <p className="text-sm text-ink/70 mt-1 max-w-3xl">
            Aggregate each author&apos;s documents into a constellation:
            centroid plus intra-author spread, overlaid on the same PCA
            basis that the Corpus Map uses. Single-document authors
            collapse to a point; multi-document authors show their own
            internal geometry, which is diagnostic of whether the author
            occupies a compact niche or spreads across the field.
          </p>
        </div>
        <ExportButton
          payload={data}
          filename="theoryscope-author-constellation"
        />
      </header>

      <div className="flex flex-wrap items-end gap-6 p-4 border border-ink/10 bg-ivory/40">
        <label className="flex flex-col text-xs text-ink/70 gap-1">
          <span className="uppercase tracking-widest text-ink/50">
            Min documents per author
          </span>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={minDocuments}
              onChange={(e) => setMinDocuments(Number(e.target.value))}
              className="w-40 accent-gold"
            />
            <span className="font-mono text-ink tabular-nums w-6 text-right">
              {minDocuments}
            </span>
          </div>
        </label>
        <button
          type="button"
          onClick={() => void run()}
          disabled={!canRun}
          className="ml-auto px-3 py-1.5 bg-gold text-ivory text-sm tracking-wide uppercase disabled:opacity-50 hover:bg-gold-700 transition-colors"
        >
          {state === "loading" ? "Aggregating…" : "Build constellations"}
        </button>
      </div>

      {state === "loading" ? (
        <div className="p-8 border border-ink/10 bg-ivory/50 text-ink/70">
          Grouping documents by author and computing centroids…
        </div>
      ) : null}

      {state === "error" ? (
        <div className="p-6 border border-rose-300 bg-rose-50/40 text-rose-800 text-sm">
          {error ?? "Unknown error."}
        </div>
      ) : null}

      {data ? (
        <ConstellationView
          data={data}
          focused={focused}
          onFocus={(a) => setFocused(focused === a ? null : a)}
        />
      ) : null}
    </section>
  );
}

function ConstellationView({
  data,
  focused,
  onFocus,
}: {
  data: AuthorConstellationResponse;
  focused: string | null;
  onFocus: (author: string) => void;
}) {
  const bounds = useMemo(() => {
    const xs: number[] = [];
    const ys: number[] = [];
    for (const a of data.authors) {
      for (const m of a.members) {
        xs.push(m.coords_2d[0]);
        ys.push(m.coords_2d[1]);
      }
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

  const width = 720;
  const height = 460;
  const pad = 20;

  const projectX = (x: number) =>
    pad + ((x - bounds.minX) / (bounds.maxX - bounds.minX)) * (width - 2 * pad);
  const projectY = (y: number) =>
    height -
    pad -
    ((y - bounds.minY) / (bounds.maxY - bounds.minY)) * (height - 2 * pad);

  const palette = [
    "#b8941e", "#355c7d", "#497e4f", "#6a4c93", "#b65e4c", "#3f8a97",
    "#a56a3a", "#2f6b5a", "#855a98", "#a63d57", "#4b6b9c", "#8c2f39",
  ];
  const colorFor = (i: number) => palette[i % palette.length];

  return (
    <div className="space-y-6">
      <div className="border border-ink/10 bg-white/60" style={{ height }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full"
        >
          {/* Faint background: all documents */}
          {data.all_documents_2d.map(([x, y], i) => (
            <circle
              key={`bg-${i}`}
              cx={projectX(x)}
              cy={projectY(y)}
              r={2}
              fill="#1a1a1a"
              fillOpacity={0.08}
            />
          ))}

          {/* Per-author groups */}
          {data.authors.map((a, idx) => {
            const colour = colorFor(idx);
            const dim = focused !== null && focused !== a.author;
            const cx = projectX(a.centroid_2d[0]);
            const cy = projectY(a.centroid_2d[1]);
            const memberRadius = 4;
            // Compute a radius in SVG pixels for mean_spread_2d so the halo
            // is visible without swamping the scene.
            const spreadPxX =
              (a.mean_spread_2d / (bounds.maxX - bounds.minX)) *
              (width - 2 * pad);
            const spreadPxY =
              (a.mean_spread_2d / (bounds.maxY - bounds.minY)) *
              (height - 2 * pad);
            const haloR = Math.max(6, 0.5 * (spreadPxX + spreadPxY));
            return (
              <g
                key={a.author}
                onClick={() => onFocus(a.author)}
                className="cursor-pointer"
              >
                <title>
                  {`${a.author}\n${a.n_documents} document${a.n_documents === 1 ? "" : "s"}\nintra-author cos = ${a.intra_author_mean_cosine.toFixed(3)}\nmean spread = ${a.mean_spread_2d.toFixed(3)}`}
                </title>
                {a.n_documents >= 2 ? (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={haloR}
                    fill={colour}
                    fillOpacity={dim ? 0.03 : 0.12}
                    stroke={colour}
                    strokeOpacity={dim ? 0.1 : 0.4}
                    strokeDasharray="3 3"
                    strokeWidth={0.8}
                  />
                ) : null}
                {a.members.map((m) => (
                  <circle
                    key={`m-${m.id}`}
                    cx={projectX(m.coords_2d[0])}
                    cy={projectY(m.coords_2d[1])}
                    r={memberRadius}
                    fill={colour}
                    fillOpacity={dim ? 0.2 : 0.85}
                    stroke="#1a1a1a"
                    strokeOpacity={dim ? 0.1 : 0.4}
                    strokeWidth={0.5}
                  />
                ))}
                <circle
                  cx={cx}
                  cy={cy}
                  r={memberRadius + 2}
                  fill="none"
                  stroke={colour}
                  strokeOpacity={dim ? 0.2 : 0.9}
                  strokeWidth={1.2}
                />
                <text
                  x={cx + memberRadius + 6}
                  y={cy + 3}
                  fontSize={10}
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                  fill="#222"
                  fillOpacity={dim ? 0.3 : 0.9}
                >
                  {shortAuthor(a.author)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {data.authors.map((a, idx) => (
          <AuthorCard
            key={a.author}
            entry={a}
            colour={colorFor(idx)}
            focused={focused === a.author}
            onFocus={() => onFocus(a.author)}
          />
        ))}
      </div>

      <details className="border border-ink/10 bg-ivory/40 p-4">
        <summary className="cursor-pointer text-sm font-semibold text-ink">
          Deep dive · author-pair cosine + provenance
        </summary>
        <div className="mt-4 space-y-4">
          <AuthorPairMatrix
            names={data.author_pair_cosine.names}
            matrix={data.author_pair_cosine.matrix}
          />
          <pre className="overflow-x-auto text-xs font-mono text-ink/80 bg-ivory/40 p-3 border border-ink/10">
{JSON.stringify(data.provenance, null, 2)}
          </pre>
        </div>
      </details>
    </div>
  );
}

function AuthorCard({
  entry,
  colour,
  focused,
  onFocus,
}: {
  entry: AuthorEntry;
  colour: string;
  focused: boolean;
  onFocus: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onFocus}
      className={[
        "text-left p-3 border transition-colors",
        focused
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
        <span className="font-display text-sm text-ink truncate">
          {entry.author}
        </span>
        <span className="ml-auto text-xs font-mono text-ink/60">
          {entry.n_documents} · cos {entry.intra_author_mean_cosine.toFixed(3)}
        </span>
      </div>
      <ul className="mt-1 text-xs text-ink/60 space-y-0.5">
        {entry.members.map((m) => (
          <li key={m.id} className="truncate">
            {m.year} — {m.title}
          </li>
        ))}
      </ul>
    </button>
  );
}

function AuthorPairMatrix({
  names,
  matrix,
}: {
  names: string[];
  matrix: number[][];
}) {
  if (names.length < 2) {
    return (
      <p className="text-xs text-ink/60">
        A pair-cosine matrix needs at least two authors.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto border border-ink/10">
      <table className="text-xs font-mono">
        <thead>
          <tr className="bg-ivory/60 text-ink/70">
            <th className="p-2 text-left border-b border-ink/10">Author</th>
            {names.map((n) => (
              <th
                key={`h-${n}`}
                className="p-2 text-right border-b border-ink/10"
              >
                {shortAuthor(n)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => (
            <tr key={`row-${i}`} className="border-b border-ink/5">
              <td className="p-2 text-ink/80">{shortAuthor(names[i])}</td>
              {row.map((v, j) => (
                <td
                  key={`c-${i}-${j}`}
                  className="text-right p-2 text-ink/70 tabular-nums"
                  style={{
                    backgroundColor:
                      i === j
                        ? "rgba(26,26,26,0.05)"
                        : v > 0.75
                        ? "rgba(184,148,30,0.12)"
                        : "transparent",
                  }}
                >
                  {v.toFixed(3)}
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
  return author.split(",")[0] ?? author;
}
