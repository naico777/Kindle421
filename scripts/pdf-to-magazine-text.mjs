#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
const pdfPath = process.argv[2];

if (!pdfPath || !existsSync(pdfPath)) {
  console.error("Uso: node scripts/pdf-to-magazine-text.mjs /path/al/numero.pdf > numero.txt");
  process.exit(1);
}

let rawText = "";

try {
  rawText = execFileSync("pdftotext", ["-layout", pdfPath, "-"], {
    encoding: "utf8",
    maxBuffer: 25 * 1024 * 1024,
  });
} catch (error) {
  console.error("No pude ejecutar pdftotext. Instalalo con `brew install poppler`.");
  throw error;
}

const cleaned = rawText
  .replace(/\r\n/g, "\n")
  .replace(/\u00a0/g, " ")
  .split("\n")
  .map((line) => line.replace(/[ \t]+$/g, ""))
  .join("\n")
  .replace(/\n{4,}/g, "\n\n\n")
  .trim();

console.log(cleaned);
