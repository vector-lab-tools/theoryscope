"use client";

import { useCallback } from "react";

type Props = {
  /** The JSON-serialisable payload to export. */
  payload: unknown;
  /** Base filename without extension. Defaults to "theoryscope-export". */
  filename?: string;
  /** Button label. Defaults to "Export JSON". */
  label?: string;
  /** Render smaller (for inline placement). */
  small?: boolean;
};

/**
 * Download the current operation result as a provenance-stamped JSON file.
 *
 * The export follows Theoryscope's provenance rule: every finding that can
 * travel into a paper carries its corpus definition, embedding model, and
 * operator alongside the data. The payload supplied by a caller should
 * therefore already include a `provenance` field (enforced by the backend
 * response shape).
 */
export function ExportButton({
  payload,
  filename = "theoryscope-export",
  label = "Export JSON",
  small = false,
}: Props) {
  const handleExport = useCallback(() => {
    if (payload == null) return;

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const safeName = filename.replace(/[^a-z0-9._-]/gi, "_");

    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeName}-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [payload, filename]);

  const sizeClasses = small
    ? "px-2.5 py-1 text-xs"
    : "px-3 py-1.5 text-sm";

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={payload == null}
      className={`${sizeClasses} border border-ink/20 bg-white/60 text-ink hover:bg-ivory/60 disabled:opacity-40 disabled:cursor-not-allowed uppercase tracking-wide transition-colors`}
      title="Download operation result + provenance as JSON"
    >
      {label}
    </button>
  );
}
