"use client";

import { useCallback, useEffect, useState } from "react";
import { VERSION } from "@/lib/version";

const DOCS = "https://vector-lab-tools.github.io/theoryscope";
const REPO = "https://github.com/vector-lab-tools/theoryscope";

type SectionId =
  | "start"
  | "inspect"
  | "flow"
  | "critique"
  | "models"
  | "method"
  | "tips";

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "start", label: "Getting started" },
  { id: "inspect", label: "Inspect" },
  { id: "flow", label: "Flow" },
  { id: "critique", label: "Critique" },
  { id: "models", label: "Choosing models" },
  { id: "method", label: "Method" },
  { id: "tips", label: "Tips" },
];

export function HelpModal({ onClose }: { onClose: () => void }) {
  const [active, setActive] = useState<SectionId>("start");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const stop = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-modal-title"
    >
      <div
        className="bg-ivory border border-ink/20 max-w-4xl w-full h-[85vh] overflow-hidden flex flex-col shadow-xl"
        onClick={stop}
      >
        <header className="shrink-0 px-6 py-4 border-b border-ink/10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="/icons/vector-lab-theoryscope.svg"
              alt=""
              width={32}
              height={32}
              aria-hidden="true"
            />
            <div>
              <h2
                id="help-modal-title"
                className="font-display text-xl text-ink leading-tight"
              >
                Theoryscope
              </h2>
              <p className="text-xs text-ink/60 tracking-wide uppercase mt-0.5">
                Geometry of Theory Space · v{VERSION}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-ink/60 hover:text-ink text-lg leading-none px-2"
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 min-h-0 flex flex-col md:flex-row">
          <nav
            aria-label="Help sections"
            className="shrink-0 md:w-52 border-b md:border-b-0 md:border-r border-ink/10 flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible md:overflow-y-auto p-2"
          >
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setActive(s.id)}
                aria-current={active === s.id ? "page" : undefined}
                className={[
                  "shrink-0 text-left px-3 py-2 text-sm whitespace-nowrap transition-colors",
                  active === s.id
                    ? "bg-[hsl(var(--gold)/0.12)] text-gold font-semibold"
                    : "text-ink/70 hover:bg-white/60 hover:text-ink",
                ].join(" ")}
              >
                {s.label}
              </button>
            ))}
          </nav>

          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
            {active === "start" ? <StartPane /> : null}
            {active === "inspect" ? <InspectPane /> : null}
            {active === "flow" ? <FlowPane /> : null}
            {active === "critique" ? <CritiquePane /> : null}
            {active === "models" ? <ModelsPane /> : null}
            {active === "method" ? <MethodPane /> : null}
            {active === "tips" ? <TipsPane /> : null}
          </div>
        </div>

        <footer className="shrink-0 border-t border-ink/10 px-6 py-3 flex flex-wrap items-center justify-between gap-x-5 gap-y-2 bg-ivory/60 text-xs">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <a
              href={`${DOCS}/`}
              target="_blank"
              rel="noreferrer"
              className="text-ink/60 hover:text-ink underline decoration-ink/20 hover:decoration-ink"
            >
              Full guide
            </a>
            <a
              href={`${DOCS}/faq.html`}
              target="_blank"
              rel="noreferrer"
              className="text-ink/60 hover:text-ink underline decoration-ink/20 hover:decoration-ink"
            >
              FAQ
            </a>
            <a
              href={REPO}
              target="_blank"
              rel="noreferrer"
              className="text-ink/60 hover:text-ink underline decoration-ink/20 hover:decoration-ink"
            >
              GitHub
            </a>
          </div>
          <a
            href="https://vector-lab-tools.github.io"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-ink/60 hover:text-ink transition-colors"
          >
            <img
              src="/icons/vector-lab-logo-mark.svg"
              alt=""
              width={20}
              height={20}
              aria-hidden="true"
            />
            <span>
              Part of the{" "}
              <span className="underline decoration-ink/20">Vector Lab</span>
            </span>
          </a>
        </footer>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function PaneTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-display text-lg text-ink mb-3">{children}</h3>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm text-ink/75 leading-relaxed max-w-prose">{children}</p>
  );
}

function Items({ children }: { children: React.ReactNode }) {
  return <ul className="text-sm text-ink/80 space-y-2 max-w-prose">{children}</ul>;
}

function StartPane() {
  return (
    <div className="space-y-3">
      <PaneTitle>Getting started</PaneTitle>
      <Prose>
        Theoryscope treats a corpus of theoretical texts as a geometry and asks
        renormalisation-group and eigenvector questions about it. Operations
        fall into three groups: <strong>Inspect</strong> reads the principal
        axes and the cloud itself, <strong>Flow</strong> coarse-grains the
        corpus and finds its fixed points, and <strong>Critique</strong> tests
        whether a finding survives a different embedding, a perturbation, a
        bootstrap or a translation.
      </Prose>
      <Prose>
        <strong>Load a corpus.</strong> Phase 0 ships with twenty
        philosophy-of-technology texts and needs no setup. To use your own
        texts, choose <strong>Zotero…</strong> in the corpus source bar and
        enter a library ID and a read-only API key. The{" "}
        <a
          href={`${DOCS}/zotero-api-key.html`}
          target="_blank"
          rel="noreferrer"
          className="underline decoration-ink/30 hover:decoration-ink"
        >
          Zotero key walkthrough
        </a>{" "}
        covers each field.
      </Prose>
      <Prose>
        <strong>No other keys.</strong> Every model is open-weight and runs on
        your machine. Each downloads once from Hugging Face on first use, with
        no token, and then runs offline.
      </Prose>
      <Prose>
        Every operation writes a provenance record (corpus hash, embedding
        model, operator, chunking spec) into its export, so a Theoryscope
        finding can be cited and re-run.
      </Prose>
    </div>
  );
}

function InspectPane() {
  return (
    <div className="space-y-3">
      <PaneTitle>Inspect</PaneTitle>
      <Items>
        <li>
          <strong>Corpus Map.</strong> 3D PCA scatter of the cloud, coloured by
          year and labelled by author.
        </li>
        <li>
          <strong>Eigendirections.</strong> Annotated principal axes, with the
          documents at the positive and negative pole of each component.
        </li>
        <li>
          <strong>Debated vs Computed.</strong> Name an opposition the field
          says it is structured by; the tool finds the component most aligned
          with it and reports a dominance score.
        </li>
        <li>
          <strong>Concept Locator.</strong> Embed a concept into the corpus
          space and read the nearest documents, nearest authors and
          most-aligned principal component.
        </li>
        <li>
          <strong>Author Constellation.</strong> Each author aggregated to a
          centroid with intra-author spread, on the same PCA basis as the
          Corpus Map.
        </li>
      </Items>
    </div>
  );
}

function FlowPane() {
  return (
    <div className="space-y-3">
      <PaneTitle>Flow</PaneTitle>
      <Items>
        <li>
          <strong>Coarse-Graining Trajectory.</strong> Aggregative k-means flow
          with a Play/Pause scrubber and a schedule bar.
        </li>
        <li>
          <strong>Fixed Point Finder.</strong> Terminal basins with exemplars;
          click a basin to highlight its members.
        </li>
        <li>
          <strong>Universality Classes.</strong> Classes ranked by ascending
          surface cosine. A class whose members were surface-different but
          reached the same basin is the finding to read.
        </li>
        <li>
          <strong>Relevant / Irrelevant Operator Spectrum.</strong> List
          candidate concepts and rank them by how much of their discriminating
          power survives the flow.
        </li>
        <li>
          <strong>Temporal RG Flow.</strong> Coarse-grain by progressively
          wider year windows instead of by k-means, to ask whether the
          field&apos;s variation is historical or conceptual.
        </li>
      </Items>
    </div>
  );
}

function CritiquePane() {
  return (
    <div className="space-y-3">
      <PaneTitle>Critique</PaneTitle>
      <Items>
        <li>
          <strong>Embedding Dependence Probe.</strong> Re-run under a second
          open-weight embedding model and report per-component agreement.
        </li>
        <li>
          <strong>Perturbation Test.</strong> Add one out-of-field text and
          measure per-component rotation.
        </li>
        <li>
          <strong>Forgetting Curve.</strong> Bootstrap over the corpus and
          report per-component stability as mean, IQR and minimum.
        </li>
        <li>
          <strong>Symmetry Breaking Map.</strong> Name a splitter (decade, year
          threshold, first tag, author); the tool reports silhouette score,
          F-statistic and per-component alignment with the between-group
          direction.
        </li>
        <li>
          <strong>Phase Diagram.</strong> One static image of the flow: basin
          hulls, arrows from initial to terminal positions, fixed points as
          large dots.
        </li>
        <li>
          <strong>Translated Corpus Probe.</strong> Translate the corpus with a
          local Helsinki-NLP Marian model (French, German, Spanish, Chinese),
          re-embed it, and align with the baseline basis. Directions that
          survive translation are less likely to be artefacts of English
          phrasing.
        </li>
        <li>
          <strong>Corpus-vs-Model Probe.</strong> An open-weight generative
          model (SmolLM2, GPT-2, Qwen3) reads the corpus in a forward pass and
          mean-pools its last hidden state. Its components are matched to the
          baseline&apos;s by correlating per-document scores, and agreement,
          disagreement and delta directions are reported per component.
        </li>
      </Items>
    </div>
  );
}

function ModelsPane() {
  return (
    <div className="space-y-4">
      <PaneTitle>Choosing models</PaneTitle>
      <Prose>
        Three probes ask you to pick a model. The pickers mark the recommended
        starting point. The{" "}
        <a
          href={`${DOCS}/operations.html#models`}
          target="_blank"
          rel="noreferrer"
          className="underline decoration-ink/30 hover:decoration-ink"
        >
          full notes
        </a>{" "}
        give download sizes and the reasoning.
      </Prose>
      <div className="space-y-1">
        <h4 className="text-[11px] uppercase tracking-widest text-ink/50">
          Embedding Dependence Probe
        </h4>
        <Items>
          <li>
            <strong>MPNet base v2</strong> first: a different architecture from
            the MiniLM baseline, with twice the dimensions.
          </li>
          <li>
            <strong>BGE small en 1.5</strong> as a second check: same dimension
            as MiniLM, different training data.
          </li>
        </Items>
      </div>
      <div className="space-y-1">
        <h4 className="text-[11px] uppercase tracking-widest text-ink/50">
          Corpus-vs-Model Probe
        </h4>
        <Items>
          <li>
            <strong>SmolLM2 135M</strong> first: the fastest run, fits on an
            8 GB machine.
          </li>
          <li>
            <strong>GPT-2 124M</strong> for a 2019 model with a documented
            training set.
          </li>
          <li>
            <strong>SmolLM2 360M</strong> to see whether a result depends on
            scale; <strong>Qwen3 0.6B</strong> for a 2025 model. Both need
            16 GB.
          </li>
        </Items>
      </div>
      <div className="space-y-1">
        <h4 className="text-[11px] uppercase tracking-widest text-ink/50">
          Translated Corpus Probe
        </h4>
        <Items>
          <li>
            <strong>French</strong> or <strong>German</strong> for corpora with
            French or German theory in the canon.
          </li>
          <li>
            <strong>Chinese</strong> as the hardest test, furthest from English
            in script and grammar.
          </li>
        </Items>
      </div>
    </div>
  );
}

function MethodPane() {
  return (
    <div className="space-y-3">
      <PaneTitle>Method</PaneTitle>
      <Items>
        <li>
          Open-weight embedding models only. Commercial APIs hide their
          tokeniser, architecture, training data and update schedule, and their
          outputs cannot be re-run.
        </li>
        <li>
          Every operator is implemented in-process, with its parameters visible
          on screen.
        </li>
        <li>
          A result reports its stability under re-embedding; the Critique
          operations exist to check it.
        </li>
        <li>Corpus provenance travels with every export.</li>
        <li>
          The tool produces geometry; the critical reading is the
          critic&apos;s work.
        </li>
      </Items>
    </div>
  );
}

function TipsPane() {
  return (
    <div className="space-y-3">
      <PaneTitle>Tips</PaneTitle>
      <Items>
        <li>
          <kbd className="px-1.5 py-0.5 text-xs font-mono border border-ink/20 bg-white/60">
            Esc
          </kbd>{" "}
          or a click outside the card closes this dialog and the Zotero
          dialog. If you have typed Zotero credentials without connecting, you
          are asked whether to keep them first.
        </li>
        <li>
          The first run of any model is slow while it downloads; later runs are
          offline and cached.
        </li>
        <li>
          PCA on fewer than about twenty documents is unstable. Run the
          Forgetting Curve before reading much into a small corpus.
        </li>
        <li>
          Export from the deep-dive panel of any operation to get the result
          with its provenance record.
        </li>
        <li>
          Errors and fixes are collected in{" "}
          <a
            href={`${DOCS}/troubleshooting.html`}
            target="_blank"
            rel="noreferrer"
            className="underline decoration-ink/30 hover:decoration-ink"
          >
            Troubleshooting
          </a>
          . If it is not there,{" "}
          <a
            href={`${REPO}/issues`}
            target="_blank"
            rel="noreferrer"
            className="underline decoration-ink/30 hover:decoration-ink"
          >
            open an issue on the Theoryscope repository
          </a>{" "}
          to report the problem. If you have a fix, a pull request is welcome.
        </li>
      </Items>
    </div>
  );
}
