"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { useCorpus } from "@/context/CorpusContext";
import { ExportButton } from "@/components/shared/ExportButton";

// Plotly is client-only and heavy — load on demand, not during SSR.
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

export function CorpusMap() {
  const { state, data } = useCorpus();

  const plotData = useMemo(() => {
    if (!data) return [];
    return [
      {
        type: "scatter3d" as const,
        mode: "markers+text" as const,
        x: data.coords_3d.map((c) => c[0]),
        y: data.coords_3d.map((c) => c[1]),
        z: data.coords_3d.map((c) => c[2]),
        text: data.documents.map((d) => `${d.author.split(",")[0]} ${d.year}`),
        textposition: "top center" as const,
        hovertext: data.documents.map(
          (d) => `${d.author} (${d.year}) — ${d.title}`,
        ),
        hoverinfo: "text" as const,
        marker: {
          size: 6,
          color: data.documents.map((d) => d.year),
          colorscale: "Viridis" as const,
          opacity: 0.85,
          line: { color: "#1a1a1a", width: 0.5 },
          showscale: true,
          colorbar: { title: { text: "Year" }, thickness: 10, len: 0.6 },
        },
      },
    ];
  }, [data]);

  const layout = useMemo(
    () => ({
      autosize: true,
      height: 560,
      margin: { l: 0, r: 0, t: 0, b: 0 },
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      scene: {
        xaxis: { title: { text: "PC1" }, color: "#444" },
        yaxis: { title: { text: "PC2" }, color: "#444" },
        zaxis: { title: { text: "PC3" }, color: "#444" },
        bgcolor: "rgba(0,0,0,0)",
      },
      showlegend: false,
      font: { family: "Source Serif 4, serif", size: 12, color: "#222" },
    }),
    [],
  );

  if (state === "idle") {
    return (
      <section className="p-8 border border-ink/10 bg-ivory/50">
        <p className="text-ink/70">
          Load the Phase 0 corpus to render its geometry.
        </p>
      </section>
    );
  }
  if (state === "loading") {
    return (
      <section className="p-8 border border-ink/10 bg-ivory/50">
        <p className="text-ink/70">
          Embedding 20 documents with sentence-transformers…
        </p>
      </section>
    );
  }
  if (state === "error" || !data) {
    return (
      <section className="p-8 border border-rose-300 bg-rose-50/40">
        <p className="text-rose-800">
          Corpus could not be loaded. Start the backend with
          <code className="mx-1 px-1 bg-ink/5">uvicorn main:app --reload</code>
          from the <code className="mx-1 px-1 bg-ink/5">backend/</code>{" "}
          directory.
        </p>
      </section>
    );
  }

  const [v1, v2, v3] = data.variance_explained;

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl text-ink">Corpus Map</h2>
          <p className="text-sm text-ink/70 mt-1 max-w-3xl">
            PCA projection of the corpus cloud. Each point is a document.
            Colour encodes year. Axes are the top three principal components
            of the embedding covariance.
          </p>
        </div>
        <ExportButton payload={data} filename="theoryscope-corpus-map" />
      </div>

      <div className="border border-ink/10 bg-white/60">
        <Plot
          data={plotData}
          layout={layout}
          config={{ displayModeBar: false, responsive: true }}
          useResizeHandler
          style={{ width: "100%", height: "560px" }}
        />
      </div>

      <div className="grid grid-cols-3 gap-4 text-sm">
        <Stat label="PC1 variance" value={`${(v1 * 100).toFixed(1)} %`} />
        <Stat label="PC2 variance" value={`${(v2 * 100).toFixed(1)} %`} />
        <Stat label="PC3 variance" value={`${(v3 * 100).toFixed(1)} %`} />
      </div>

      <details className="border border-ink/10 bg-ivory/40 p-4">
        <summary className="cursor-pointer text-sm font-semibold text-ink">
          Deep dive · provenance
        </summary>
        <pre className="mt-3 overflow-x-auto text-xs font-mono text-ink/80">
{JSON.stringify(data.provenance, null, 2)}
        </pre>
      </details>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-ink/10 p-3 bg-white/50">
      <div className="text-xs uppercase tracking-wide text-ink/60">{label}</div>
      <div className="mt-1 font-display text-lg">{value}</div>
    </div>
  );
}
