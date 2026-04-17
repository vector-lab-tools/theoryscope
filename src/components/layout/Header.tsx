"use client";

import { VERSION } from "@/lib/version";

export function Header() {
  return (
    <header className="border-b border-ink/10 bg-ivory/80 backdrop-blur px-6 py-4 flex items-baseline justify-between">
      <div>
        <h1 className="font-display text-2xl text-ink">Theoryscope</h1>
        <p className="text-xs text-ink/60 mt-1 tracking-wide uppercase">
          Geometry of Theory Space
        </p>
      </div>
      <div className="text-xs text-ink/50 font-mono">v{VERSION}</div>
    </header>
  );
}
