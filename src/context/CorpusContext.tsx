"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { backendPost } from "../hooks/useBackend";
import type { CorpusMapResponse } from "../types/corpus";

type LoadState = "idle" | "loading" | "ready" | "error";

type CorpusContextValue = {
  state: LoadState;
  error: string | null;
  data: CorpusMapResponse | null;
  loadPhaseZero: () => Promise<void>;
};

const CorpusContext = createContext<CorpusContextValue | null>(null);

export function CorpusProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<LoadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CorpusMapResponse | null>(null);

  const loadPhaseZero = useCallback(async () => {
    setState("loading");
    setError(null);
    try {
      const result = await backendPost<CorpusMapResponse>("/corpus-map", {
        corpus_name: "philosophy-of-technology-v1",
      });
      setData(result);
      setState("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setState("error");
    }
  }, []);

  const value = useMemo(
    () => ({ state, error, data, loadPhaseZero }),
    [state, error, data, loadPhaseZero],
  );

  return <CorpusContext.Provider value={value}>{children}</CorpusContext.Provider>;
}

export function useCorpus(): CorpusContextValue {
  const ctx = useContext(CorpusContext);
  if (!ctx) {
    throw new Error("useCorpus must be used within a CorpusProvider");
  }
  return ctx;
}
