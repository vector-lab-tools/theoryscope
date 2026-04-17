"use client";

import { CorpusProvider } from "@/context/CorpusContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return <CorpusProvider>{children}</CorpusProvider>;
}
