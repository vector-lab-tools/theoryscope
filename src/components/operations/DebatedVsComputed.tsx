"use client";

import { useCallback, useMemo, useState } from "react";
import { backendPost } from "@/hooks/useBackend";
import { ExportButton } from "@/components/shared/ExportButton";
import { StabilityBar } from "@/components/viz/StabilityBar";
import { useCorpusSource } from "@/context/CorpusSourceContext";
import type {
  DebatedVsComputedResponse,
  DebatePair,
  DebateResult,
} from "@/types/inspect";

type RunState = "idle" | "loading" | "ready" | "error";

const DEFAULT_DEBATES: DebatePair[] = [
  {
    label: "Instrumental vs substantive",
    pole_a_label: "instrumental",
    pole_b_label: "substantive",
    pole_a_text:
      "Technology is a neutral tool, available for any purpose. Its moral and political valence lies in how it is used, not in what it is.",
    pole_b_text:
      "Technology is a mode of revealing that reshapes the world and the human who acts within it. It is never neutral; it has an essence that orders what appears.",
  },
  {
    label: "Autonomy vs social construction",
    pole_a_label: "autonomous",
    pole_b_label: "socially constructed",
    pole_a_text:
      "Technology develops according to its own internal logic. It is autonomous, self-augmenting, and imposes its rationality on the societies that host it.",
    pole_b_text:
      "Technology is shaped by social interests, institutional histories, and political choices. Design decisions inscribe contestable values into the artefact.",
  },
  {
    label: "Phenomenological vs political",
    pole_a_label: "phenomenological",
    pole_b_label: "political",
    pole_a_text:
      "Technology mediates lived experience. The relevant question is how it shapes perception, embodiment, and practice — how things do what they do.",
    pole_b_text:
      "Technology is a site of political struggle. Artefacts embody power relations; design and deployment must be subjected to democratic contestation.",
  },
];

export function DebatedVsComputed() {
  const { buildPayload, selected, zoteroReady } = useCorpusSource();
  const [state, setState] = useState<RunState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DebatedVsComputedResponse | null>(null);
  const [debates, setDebates] = useState<DebatePair[]>(DEFAULT_DEBATES);

  const canRun =
    state !== "loading" &&
    debates.length > 0 &&
    debates.every(
      (d) =>
        d.label.trim().length > 0 &&
        d.pole_a_text.trim().length > 0 &&
        d.pole_b_text.trim().length > 0,
    ) &&
    (selected.kind === "hardcoded" || zoteroReady);

  const run = useCallback(async () => {
    setState("loading");
    setError(null);
    try {
      const result = await backendPost<DebatedVsComputedResponse>(
        "/debated-vs-computed",
        {
          corpus: buildPayload(),
          debates,
          n_components: 6,
        },
      );
      setData(result);
      setState("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setState("error");
    }
  }, [buildPayload, debates]);

  const updateDebate = (i: number, patch: Partial<DebatePair>) => {
    setDebates((prev) =>
      prev.map((d, j) => (j === i ? { ...d, ...patch } : d)),
    );
  };

  const addDebate = () => {
    setDebates((prev) => [
      ...prev,
      {
        label: "",
        pole_a_label: "",
        pole_b_label: "",
        pole_a_text: "",
        pole_b_text: "",
      },
    ]);
  };

  const removeDebate = (i: number) => {
    setDebates((prev) => prev.filter((_, j) => j !== i));
  };

  return (
    <section className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl text-ink">Debated vs Computed</h2>
          <p className="text-sm text-ink/70 mt-1 max-w-3xl">
            Name the oppositions the field is said to be structured by.
            The tool embeds each pole, constructs a direction vector, and
            finds the computed principal component most aligned with it.
            A debate that lands on PC1 is structural; a debate that lands
            on a low-rank PC is legible but marginal; a debate with no
            good alignment is not the axis this corpus varies along.
          </p>
        </div>
        <ExportButton
          payload={data}
          filename="theoryscope-debated-vs-computed"
        />
      </header>

      <div className="space-y-3">
        {debates.map((d, i) => (
          <DebateEditor
            key={i}
            debate={d}
            index={i}
            onChange={(patch) => updateDebate(i, patch)}
            onRemove={debates.length > 1 ? () => removeDebate(i) : null}
          />
        ))}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={addDebate}
            className="px-2.5 py-1 text-xs uppercase tracking-wide border border-ink/20 bg-white/60 text-ink/70 hover:bg-ivory/60"
          >
            + Add debate
          </button>
          <button
            type="button"
            onClick={() => void run()}
            disabled={!canRun}
            className="ml-auto px-3 py-1.5 bg-gold text-ivory text-sm tracking-wide uppercase disabled:opacity-50 hover:bg-gold-700 transition-colors"
          >
            {state === "loading" ? "Aligning…" : "Align debates"}
          </button>
        </div>
      </div>

      {state === "loading" ? (
        <div className="p-8 border border-ink/10 bg-ivory/50 text-ink/70">
          Embedding poles and aligning with the corpus eigenbasis…
        </div>
      ) : null}

      {state === "error" ? (
        <div className="p-6 border border-rose-300 bg-rose-50/40 text-rose-800 text-sm">
          {error ?? "Unknown error."}
        </div>
      ) : null}

      {data ? <DebateResults data={data} /> : null}
    </section>
  );
}

function DebateEditor({
  debate,
  index,
  onChange,
  onRemove,
}: {
  debate: DebatePair;
  index: number;
  onChange: (patch: Partial<DebatePair>) => void;
  onRemove: (() => void) | null;
}) {
  return (
    <div className="p-4 border border-ink/10 bg-ivory/40 space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-[10px] uppercase tracking-widest text-ink/50 font-mono">
          Debate {index + 1}
        </span>
        <input
          type="text"
          value={debate.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="Debate label (e.g. instrumental vs substantive)"
          className="flex-1 px-2 py-1 bg-white/60 border border-ink/20 text-sm"
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <PoleEditor
          poleId="A"
          label={debate.pole_a_label ?? ""}
          text={debate.pole_a_text}
          onLabel={(v) => onChange({ pole_a_label: v })}
          onText={(v) => onChange({ pole_a_text: v })}
        />
        <PoleEditor
          poleId="B"
          label={debate.pole_b_label ?? ""}
          text={debate.pole_b_text}
          onLabel={(v) => onChange({ pole_b_label: v })}
          onText={(v) => onChange({ pole_b_text: v })}
        />
      </div>
    </div>
  );
}

function PoleEditor({
  poleId,
  label,
  text,
  onLabel,
  onText,
}: {
  poleId: string;
  label: string;
  text: string;
  onLabel: (v: string) => void;
  onText: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-widest text-ink/50 font-mono">
          Pole {poleId}
        </span>
        <input
          type="text"
          value={label}
          onChange={(e) => onLabel(e.target.value)}
          placeholder={`Pole ${poleId} short label`}
          className="flex-1 px-2 py-1 bg-white/60 border border-ink/20 text-xs"
        />
      </div>
      <textarea
        value={text}
        onChange={(e) => onText(e.target.value)}
        rows={3}
        placeholder="A sentence or two characterising this pole of the debate."
        className="w-full px-2 py-1.5 bg-white/60 border border-ink/20 text-xs"
      />
    </div>
  );
}

function DebateResults({ data }: { data: DebatedVsComputedResponse }) {
  const ranked: DebateResult[] = useMemo(
    () => data.ranked_indices.map((i) => data.debates[i]),
    [data],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-x-8 gap-y-1 text-xs text-ink/60">
        <span>
          PC variance:{" "}
          {data.pca_variance_explained
            .slice(0, 6)
            .map((v, i) => `PC${i + 1} ${(v * 100).toFixed(1)}%`)
            .join(" · ")}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {ranked.map((d) => (
          <DebateCard key={d.index} debate={d} />
        ))}
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

function DebateCard({ debate }: { debate: DebateResult }) {
  return (
    <article className="border border-ink/10 bg-white/60 p-4 space-y-3">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="font-display text-base text-ink">{debate.label}</h3>
          <p className="text-xs text-ink/60">
            {debate.pole_a_label}{" "}
            <span className="text-ink/40">→</span> {debate.pole_b_label}
          </p>
        </div>
        <div className="text-xs font-mono text-ink/60 text-right">
          best PC{debate.best_pc + 1} · |cos|{" "}
          {debate.best_abs_cosine.toFixed(3)} ·{" "}
          {(debate.best_variance_explained * 100).toFixed(1)}% variance
          <br />
          dominance score {debate.dominance_score.toFixed(4)}
        </div>
      </header>

      <StabilityBar value={debate.best_abs_cosine} label="alignment" />

      <div className="grid grid-cols-6 gap-1 items-center">
        {debate.per_component.map((c) => {
          const isBest = c.pc === debate.best_pc;
          return (
            <div key={c.pc} className="flex flex-col items-center gap-1">
              <span
                className={[
                  "text-[10px] font-mono",
                  isBest ? "text-ink" : "text-ink/50",
                ].join(" ")}
              >
                PC{c.pc + 1}
              </span>
              <div className="w-full h-12 bg-ink/5 relative overflow-hidden">
                <div
                  className="absolute bottom-0 left-0 right-0 bg-gold"
                  style={{ height: `${Math.max(0, Math.min(1, c.abs_cosine)) * 100}%` }}
                />
              </div>
              <span
                className={[
                  "text-[10px] font-mono tabular-nums",
                  isBest ? "text-ink" : "text-ink/50",
                ].join(" ")}
              >
                {c.signed_cosine.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>
    </article>
  );
}
