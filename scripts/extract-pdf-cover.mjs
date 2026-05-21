#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const [, , pdfPath, outputPath = "tmp/revista-421-cover"] = process.argv;

if (!pdfPath || !existsSync(pdfPath)) {
  console.error("Uso: node scripts/extract-pdf-cover.mjs /path/al/numero.pdf tmp/cover");
  process.exit(1);
}

const outputWithoutExtension = outputPath.replace(/\.jpe?g$/i, "");

execFileSync("pdftoppm", [
  "-f",
  "1",
  "-l",
  "1",
  "-singlefile",
  "-jpeg",
  "-r",
  "180",
  pdfPath,
  outputWithoutExtension,
], { stdio: "inherit" });

console.log(`${path.resolve(outputWithoutExtension)}.jpg`);
