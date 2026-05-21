"use client";

import { useState } from "react";

export function CopyChip({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copyValue() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      className={`copy-chip${copied ? " is-copied" : ""}`}
      type="button"
      onClick={copyValue}
      aria-label={`Copiar ${value} al portapapeles`}
    >
      <span className="copy-chip-text">{value}</span>
      <span className="copy-chip-icon" aria-hidden="true">
        {copied ? "✓ copiado" : "⧉"}
      </span>
    </button>
  );
}
