"use client";

import { CorpusProvider } from "@/context/CorpusContext";
import { CorpusSourceProvider } from "@/context/CorpusSourceContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CorpusSourceProvider>
      <CorpusProvider>{children}</CorpusProvider>
    </CorpusSourceProvider>
  );
}
