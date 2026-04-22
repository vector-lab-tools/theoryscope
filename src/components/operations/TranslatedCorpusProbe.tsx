"use client";

import { useCallback, useEffect, useState } from "react";
import { backendGet, backendPost } from "@/hooks/useBackend";
import { ExportButton } from "@/components/shared/ExportButton";
import { StabilityBar } from "@/components/viz/StabilityBar";
import { useCorpusSource } from "@/context/CorpusSourceContext";
import type {
  TranslationLanguage,
  TranslationProbeResponse,
  TranslationSample,
} from "@/types/critique";

type RunState = "idle" | "loading" | "ready" | "error";

export function TranslatedCorpusProbe() {
  const { buildPayload, selected, zoteroReady } = useCorpusSource();
  const [languages, setLanguages] = useState<TranslationLanguage[]>([]);
  const [targetLang, setTargetLang] = useState<string>("");
  const [nComponents, setNComponents] = useState<number>(5);
  const [state, setState] = useState<RunState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TranslationProbeResponse | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const result = await backendGet<{ languages: TranslationLanguage[] }>(
          "/translation-probe/languages",
        );
        setLanguages(result.languages);
        if (result.languages.length > 0 && !targetLang) {
          setTargetLang(result.languages[0].code);
        }
      } catch {
        // Silent — the backend may not be running yet; the Run button will surface the error.
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canRun =
    state !== "loading" &&
    targetLang.length > 0 &&
    (selected.kind === "hardcoded" || zoteroReady);

  const run = useCallback(async () => {
    setState("loading");
    setError(null);
    try {
      const result = await backendPost<TranslationProbeResponse>(
        "/translation-probe",
        {
          corpus: buildPayload(),
          target_lang: targetLang,
          n_components: nComponents,
          n_samples: 3,
        },
      );
      setData(result);
      setState("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setState("error");
    }
  }, [buildPayload, targetLang, nComponents]);

  return (
    <section className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl text-ink">
            Translated Corpus Probe
          </h2>
          <p className="text-sm text-ink/70 mt-1 max-w-3xl">
            Translate the corpus through a local HelsinkiNLP Marian
            model, re-embed the translation, and align with the
            baseline basis via document projections. Eigendirections
            that survive translation arguably track concepts;
            directions that do not arguably track language-specific
            framings. The translation is not neutral, and the delta
            is what matters. First run per language downloads a model
            of roughly 300 MB.
          </p>
        </div>
        <ExportButton payload={data} filename="theoryscope-translation-probe" />
      </header>

      <div className="flex flex-wrap items-end gap-6 p-4 border border-ink/10 bg-ivory/40">
        <label className="flex flex-col text-xs text-ink/70 gap-1">
          <span className="uppercase tracking-widest text-ink/50">
            Target language
          </span>
          <select
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            className="px-2 py-1.5 bg-white/60 border border-ink/20 text-sm"
          >
            {languages.length === 0 ? (
              <option value="">(load backend first)</option>
            ) : null}
            {languages.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
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
          {state === "loading" ? "Translating…" : "Run translation probe"}
        </button>
      </div>

      {state === "loading" ? (
        <div className="p-8 border border-ink/10 bg-ivory/50 text-ink/70">
          Translating the corpus{" "}
          {languages.find((l) => l.code === targetLang)?.label
            ? `to ${languages.find((l) => l.code === targetLang)!.label}`
            : ""}
          … first run per language downloads a Marian model (~300 MB).
        </div>
      ) : null}

      {state === "error" ? (
        <div className="p-6 border border-rose-300 bg-rose-50/40 text-rose-800 text-sm">
          {error ?? "Unknown error."}
        </div>
      ) : null}

      {data ? <TranslationResults data={data} /> : null}
    </section>
  );
}

function TranslationResults({ data }: { data: TranslationProbeResponse }) {
  return (
    <div className="space-y-6">
      <div className="border border-ink/10 bg-white/60 p-4 space-y-3">
        <div className="flex items-baseline justify-between">
          <h3 className="font-display text-base text-ink">Overall stability</h3>
          <span className="text-xs font-mono text-ink/50">
            mean |Pearson cos| across matched PCs · target{" "}
            {data.language_label} · {data.cache_hit ? "cache hit" : "cache miss"}
          </span>
        </div>
        <StabilityBar value={data.alignment.stability} label="stability" />
        <div className="text-xs text-ink/70 max-w-prose">
          <strong>Baseline:</strong> English corpus, original embedding space.
          <br />
          <strong>Probe:</strong> translated via{" "}
          <code className="px-1 bg-ink/5">{data.translation_model_id}</code> and
          re-embedded in the same space.
        </div>
      </div>

      <div>
        <h3 className="font-display text-base text-ink mb-3">
          Per-component agreement
        </h3>
        <div className="space-y-3">
          {data.alignment.matches.map((m) => (
            <div
              key={`pc-${m.a_index}`}
              className="border border-ink/10 bg-white/50 p-3 space-y-2"
            >
              <div className="flex items-baseline justify-between">
                <span className="font-display text-sm text-ink">
                  Baseline PC{m.a_index + 1} ↔ Translated PC{m.b_index + 1}
                </span>
                <span className="text-xs font-mono text-ink/60">
                  signed cos = {m.signed_cosine.toFixed(3)}
                </span>
              </div>
              <StabilityBar value={m.abs_cosine} />
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-display text-base text-ink mb-3">
          Sample translations
        </h3>
        <div className="space-y-3">
          {data.samples.map((s) => (
            <SampleCard key={s.id} sample={s} />
          ))}
        </div>
      </div>

      <details className="border border-ink/10 bg-ivory/40 p-4">
        <summary className="cursor-pointer text-sm font-semibold text-ink">
          Deep dive · PC variance + provenance
        </summary>
        <div className="mt-4 space-y-3 text-xs text-ink/80">
          <p className="font-mono">
            Baseline variance:{" "}
            {data.baseline_variance_explained
              .map((v, i) => `PC${i + 1} ${(v * 100).toFixed(1)}%`)
              .join(" · ")}
          </p>
          <p className="font-mono">
            Translated variance:{" "}
            {data.translated_variance_explained
              .map((v, i) => `PC${i + 1} ${(v * 100).toFixed(1)}%`)
              .join(" · ")}
          </p>
          <pre className="overflow-x-auto font-mono bg-ivory/40 p-3 border border-ink/10">
{JSON.stringify(data.provenance, null, 2)}
          </pre>
        </div>
      </details>
    </div>
  );
}

function SampleCard({ sample }: { sample: TranslationSample }) {
  return (
    <article className="border border-ink/10 bg-white/60 p-3 space-y-2">
      <header className="flex items-baseline gap-2">
        <span className="font-display text-sm text-ink">
          {sample.author} {sample.year}
        </span>
        <span className="text-xs text-ink/60 truncate">— {sample.title}</span>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs leading-relaxed">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-ink/50 mb-1">
            Original
          </div>
          <p className="text-ink/80 whitespace-pre-wrap">{sample.original_text}</p>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-ink/50 mb-1">
            Translated
          </div>
          <p className="text-ink/80 whitespace-pre-wrap">{sample.translated_text}</p>
        </div>
      </div>
    </article>
  );
}
