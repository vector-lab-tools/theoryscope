"use client";

import { useCallback, useState } from "react";
import { useCorpusSource } from "@/context/CorpusSourceContext";
import { backendPost } from "@/hooks/useBackend";
import type { ZoteroCollection } from "@/types/corpus-source";
import { PHASE_ZERO_CORPUS_NAME } from "@/types/corpus-source";

export function CorpusSourcePanel() {
  const { selected, setSelected, zoteroCreds } = useCorpusSource();
  const [dialogOpen, setDialogOpen] = useState(false);

  const label =
    selected.kind === "hardcoded"
      ? `Phase 0 corpus · ${PHASE_ZERO_CORPUS_NAME}`
      : `Zotero · ${selected.collection_name || selected.collection_key}`;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="text-[10px] uppercase tracking-widest text-ink/50">
        Corpus source
      </div>
      <div className="text-sm text-ink">{label}</div>
      <div className="flex items-center gap-2 ml-auto">
        <button
          type="button"
          onClick={() =>
            setSelected({ kind: "hardcoded", name: PHASE_ZERO_CORPUS_NAME })
          }
          className={[
            "px-2.5 py-1 text-xs uppercase tracking-wide border transition-colors",
            selected.kind === "hardcoded"
              ? "border-gold text-ink bg-white/60"
              : "border-ink/20 text-ink/70 bg-white/40 hover:bg-white/60",
          ].join(" ")}
        >
          Phase 0
        </button>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className={[
            "px-2.5 py-1 text-xs uppercase tracking-wide border transition-colors",
            selected.kind === "zotero"
              ? "border-gold text-ink bg-white/60"
              : "border-ink/20 text-ink/70 bg-white/40 hover:bg-white/60",
          ].join(" ")}
        >
          {selected.kind === "zotero" ? "Zotero · change" : "Zotero…"}
        </button>
      </div>

      {dialogOpen ? (
        <ZoteroDialog
          onClose={() => setDialogOpen(false)}
          hasCreds={zoteroCreds !== null}
        />
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function ZoteroDialog({ onClose, hasCreds }: { onClose: () => void; hasCreds: boolean }) {
  const { zoteroCreds, setZoteroCreds, setSelected } = useCorpusSource();
  const [step, setStep] = useState<"creds" | "pick">(hasCreds ? "pick" : "creds");

  // Local form state for credentials step.
  const [libraryId, setLibraryId] = useState(zoteroCreds?.library_id ?? "");
  const [libraryType, setLibraryType] = useState<"user" | "group">(
    zoteroCreds?.library_type ?? "user",
  );
  const [apiKey, setApiKey] = useState(zoteroCreds?.api_key ?? "");

  // Collection pick state.
  const [collections, setCollections] = useState<ZoteroCollection[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCollections = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await backendPost<{ collections: ZoteroCollection[] }>(
        "/zotero/collections",
        {
          library_id: libraryId.trim(),
          library_type: libraryType,
          api_key: apiKey.trim(),
        },
      );
      setCollections(result.collections);
      setZoteroCreds({
        library_id: libraryId.trim(),
        library_type: libraryType,
        api_key: apiKey.trim(),
      });
      setStep("pick");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }, [libraryId, libraryType, apiKey, setZoteroCreds]);

  const reloadCollections = useCallback(async () => {
    if (!zoteroCreds) return;
    setBusy(true);
    setError(null);
    try {
      const result = await backendPost<{ collections: ZoteroCollection[] }>(
        "/zotero/collections",
        zoteroCreds,
      );
      setCollections(result.collections);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }, [zoteroCreds]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-ivory border border-ink/20 max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-5 py-4 border-b border-ink/10 flex items-center justify-between">
          <h2 className="font-display text-lg text-ink">Zotero corpus source</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-ink/60 hover:text-ink text-sm"
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        <div className="p-5 overflow-y-auto space-y-4">
          {step === "creds" ? (
            <>
              <p className="text-sm text-ink/70 max-w-prose">
                Enter your Zotero library ID (the number in your library URL)
                and a private API key from{" "}
                <a
                  href="https://www.zotero.org/settings/keys"
                  target="_blank"
                  rel="noreferrer"
                  className="underline decoration-ink/30 hover:decoration-ink"
                >
                  zotero.org/settings/keys
                </a>
                . Credentials are stored in your browser only and sent to the
                local backend on request.
              </p>
              <div className="grid gap-3">
                <Field
                  label="Library ID"
                  value={libraryId}
                  onChange={setLibraryId}
                  placeholder="e.g. 123456"
                />
                <label className="flex flex-col text-xs text-ink/70 gap-1">
                  <span className="uppercase tracking-widest text-ink/50">
                    Library type
                  </span>
                  <select
                    value={libraryType}
                    onChange={(e) =>
                      setLibraryType(e.target.value as "user" | "group")
                    }
                    className="px-2 py-1.5 bg-white/60 border border-ink/20 text-sm"
                  >
                    <option value="user">user</option>
                    <option value="group">group</option>
                  </select>
                </label>
                <Field
                  label="API key"
                  value={apiKey}
                  onChange={setApiKey}
                  placeholder="Zotero private key"
                  type="password"
                />
              </div>
              {error ? (
                <div className="text-sm text-rose-800 bg-rose-50/60 border border-rose-300 p-2">
                  {error}
                </div>
              ) : null}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 text-sm border border-ink/20 bg-white/60 text-ink hover:bg-ivory/60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void fetchCollections()}
                  disabled={busy || !libraryId.trim() || !apiKey.trim()}
                  className="px-3 py-1.5 text-sm bg-gold text-ivory uppercase tracking-wide disabled:opacity-50 hover:bg-gold-700"
                >
                  {busy ? "Connecting…" : "Connect"}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-baseline justify-between">
                <p className="text-sm text-ink/70">
                  Choose a collection to treat as the corpus.
                </p>
                <button
                  type="button"
                  onClick={() => setStep("creds")}
                  className="text-xs underline decoration-ink/30 hover:decoration-ink text-ink/70"
                >
                  change credentials
                </button>
              </div>

              {collections === null ? (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void reloadCollections()}
                    disabled={busy}
                    className="px-3 py-1.5 text-sm bg-gold text-ivory uppercase tracking-wide disabled:opacity-50 hover:bg-gold-700"
                  >
                    {busy ? "Loading…" : "Load collections"}
                  </button>
                  {error ? (
                    <span className="text-xs text-rose-700">{error}</span>
                  ) : null}
                </div>
              ) : null}

              {collections !== null ? (
                <CollectionList
                  collections={collections}
                  onPick={(c) => {
                    setSelected({
                      kind: "zotero",
                      collection_key: c.key,
                      collection_name: c.name,
                    });
                    onClose();
                  }}
                />
              ) : null}

              {error && collections !== null ? (
                <div className="text-sm text-rose-800 bg-rose-50/60 border border-rose-300 p-2">
                  {error}
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CollectionList({
  collections,
  onPick,
}: {
  collections: ZoteroCollection[];
  onPick: (c: ZoteroCollection) => void;
}) {
  const [filter, setFilter] = useState("");
  const filtered = collections.filter((c) =>
    c.name.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter…"
        className="w-full px-2 py-1.5 bg-white/60 border border-ink/20 text-sm"
      />
      <div className="border border-ink/10 max-h-[50vh] overflow-y-auto divide-y divide-ink/5">
        {filtered.length === 0 ? (
          <div className="p-4 text-sm text-ink/60">No collections found.</div>
        ) : null}
        {filtered.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => onPick(c)}
            className="w-full text-left px-3 py-2 hover:bg-ivory/60 flex items-baseline justify-between gap-3"
          >
            <span className="text-sm text-ink truncate">{c.name}</span>
            <span className="text-xs font-mono text-ink/50 shrink-0">
              {c.num_items} item{c.num_items === 1 ? "" : "s"}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: "text" | "password";
}) {
  return (
    <label className="flex flex-col text-xs text-ink/70 gap-1">
      <span className="uppercase tracking-widest text-ink/50">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="px-2 py-1.5 bg-white/60 border border-ink/20 text-sm font-mono"
      />
    </label>
  );
}
