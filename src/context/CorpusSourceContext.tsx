"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type {
  CorpusSourcePayload,
  ZoteroCollection,
  ZoteroSourcePayload,
} from "@/types/corpus-source";
import { PHASE_ZERO_CORPUS_NAME } from "@/types/corpus-source";

type ZoteroCreds = {
  library_id: string;
  library_type: "user" | "group";
  api_key: string;
};

export type SelectedSource =
  | { kind: "hardcoded"; name: string }
  | {
      kind: "zotero";
      collection_key: string;
      collection_name: string;
    };

const LOCALSTORAGE_KEY = "theoryscope:corpus-source:v1";
const ZOTERO_CREDS_KEY = "theoryscope:zotero-creds:v1";

type CorpusSourceContextValue = {
  selected: SelectedSource;
  setSelected: (s: SelectedSource) => void;
  zoteroCreds: ZoteroCreds | null;
  setZoteroCreds: (c: ZoteroCreds | null) => void;
  /** Build the request payload for the backend. */
  buildPayload: () => CorpusSourcePayload;
  /** True iff `selected` is a Zotero source and creds are set. */
  zoteroReady: boolean;
};

const CorpusSourceContext = createContext<CorpusSourceContextValue | null>(null);

const DEFAULT_SELECTED: SelectedSource = {
  kind: "hardcoded",
  name: PHASE_ZERO_CORPUS_NAME,
};

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota errors; the app still works without persistence
  }
}

export function CorpusSourceProvider({ children }: { children: React.ReactNode }) {
  const [selected, setSelectedState] = useState<SelectedSource>(DEFAULT_SELECTED);
  const [zoteroCreds, setZoteroCredsState] = useState<ZoteroCreds | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Rehydrate from localStorage once on mount.
  useEffect(() => {
    const storedSelected = readJson<SelectedSource>(LOCALSTORAGE_KEY);
    if (storedSelected) setSelectedState(storedSelected);
    const storedCreds = readJson<ZoteroCreds>(ZOTERO_CREDS_KEY);
    if (storedCreds) setZoteroCredsState(storedCreds);
    setHydrated(true);
  }, []);

  const setSelected = useCallback((s: SelectedSource) => {
    setSelectedState(s);
    writeJson(LOCALSTORAGE_KEY, s);
  }, []);

  const setZoteroCreds = useCallback((c: ZoteroCreds | null) => {
    setZoteroCredsState(c);
    if (c) writeJson(ZOTERO_CREDS_KEY, c);
    else if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(ZOTERO_CREDS_KEY);
      } catch {
        // ignore
      }
    }
  }, []);

  const buildPayload = useCallback((): CorpusSourcePayload => {
    if (selected.kind === "zotero" && zoteroCreds) {
      const zotero: ZoteroSourcePayload = {
        ...zoteroCreds,
        collection_key: selected.collection_key,
        collection_name: selected.collection_name,
      };
      return { zotero };
    }
    return {
      hardcoded_name:
        selected.kind === "hardcoded" ? selected.name : PHASE_ZERO_CORPUS_NAME,
    };
  }, [selected, zoteroCreds]);

  const zoteroReady =
    selected.kind === "zotero" && zoteroCreds !== null;

  const value = useMemo(
    () => ({
      selected,
      setSelected,
      zoteroCreds,
      setZoteroCreds,
      buildPayload,
      zoteroReady,
    }),
    [selected, setSelected, zoteroCreds, setZoteroCreds, buildPayload, zoteroReady],
  );

  // Render children only after hydration so that default state is consistent.
  if (!hydrated) {
    return <CorpusSourceContext.Provider value={value}>{null}</CorpusSourceContext.Provider>;
  }

  return (
    <CorpusSourceContext.Provider value={value}>
      {children}
    </CorpusSourceContext.Provider>
  );
}

export function useCorpusSource(): CorpusSourceContextValue {
  const ctx = useContext(CorpusSourceContext);
  if (!ctx) {
    throw new Error("useCorpusSource must be used within CorpusSourceProvider");
  }
  return ctx;
}

export type { ZoteroCreds, ZoteroCollection };
