#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import fs from "node:fs";

const args = process.argv.slice(2);
const pdfPath = args.find((arg) => !arg.startsWith("--"));
const imageManifestPath = getFlag("images");
const linkManifestPath = getFlag("links");
const imagesByPage = imageManifestPath ? loadImagesByPage(imageManifestPath) : new Map();
const linksByPage = linkManifestPath ? loadLinksByPage(linkManifestPath) : new Map();

if (!pdfPath || !existsSync(pdfPath)) {
  console.error("Uso: node scripts/pdf-to-magazine-text.mjs /path/al/numero.pdf [--images=manifest.json] [--links=links.json] > numero.txt");
  process.exit(1);
}

const pageCount = getPageCount(pdfPath);
const sections = [];
let currentSection = null;

for (let page = 1; page <= pageCount; page += 1) {
  const pageText = extractPage(pdfPath, page);
  let parsed = parsePage(pageText, page);

  if (parsed?.kind === "body") {
    parsed = parsePage(extractPageByColumns(pdfPath, page), page);
  }

  if (!parsed) continue;

  if (parsed.kind === "cover" || parsed.kind === "back-cover") continue;

  if (parsed.kind === "chapter") {
    currentSection = {
      title: parsed.title,
      blocks: [parsed.meta, parsed.deck].filter(Boolean).map((block) => applyLinks(block, page)).concat(imageBlocksForPage(page)),
    };
    sections.push(currentSection);
    continue;
  }

  if (parsed.kind === "editorial") {
    currentSection = {
      title: "Editorial",
      blocks: [...parsed.blocks.map((block) => applyLinks(block, page)), ...imageBlocksForPage(page)],
    };
    sections.push(currentSection);
    continue;
  }

  if (!currentSection) {
    currentSection = {
      title: "Revista 421",
      blocks: [],
    };
    sections.push(currentSection);
  }

  currentSection.blocks.push(...parsed.blocks.map((block) => applyLinks(block, page)), ...imageBlocksForPage(page));
}

console.log(
  sections
    .map((section) => [`# ${section.title}`, ...section.blocks.filter(Boolean)].join("\n\n"))
    .join("\n\n"),
);

function getPageCount(path) {
  try {
    const info = execFileSync("pdfinfo", [path], { encoding: "utf8" });
    const match = info.match(/^Pages:\s+(\d+)$/m);
    if (!match) throw new Error("No pude detectar la cantidad de paginas.");
    return Number(match[1]);
  } catch (error) {
    console.error("No pude ejecutar pdfinfo. Instalalo con `brew install poppler`.");
    throw error;
  }
}

function getFlag(name) {
  const prefix = `--${name}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? null;
}

function loadImagesByPage(manifestPath) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const byPage = new Map();

  for (const image of manifest) {
    if (!byPage.has(image.page)) byPage.set(image.page, []);
    byPage.get(image.page).push(image);
  }

  return byPage;
}

function loadLinksByPage(manifestPath) {
  const byPage = new Map();
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"))
    .filter((link) => link.text && link.href)
    .sort((a, b) => b.text.length - a.text.length);

  for (const link of manifest) {
    if (!byPage.has(link.page)) byPage.set(link.page, []);
    byPage.get(link.page).push(link);
  }

  return byPage;
}

function imageBlocksForPage(page) {
  return (imagesByPage.get(page) ?? []).map((image) => `![${image.alt}](${image.src})`);
}

function applyLinks(block, page) {
  const links = linksByPage.get(page) ?? [];
  if (!links.length || block.startsWith("![") || block.includes("](")) return block;

  let linked = block;

  for (const link of links) {
    const pattern = new RegExp(`(?<!\\[)${escapeRegExp(link.text)}(?!\\]\\()`, "g");
    linked = linked.replace(pattern, `[${link.text}](${link.href})`);
  }

  return linked;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractPage(path, page) {
  try {
    return execFileSync("pdftotext", ["-f", String(page), "-l", String(page), path, "-"], {
      encoding: "utf8",
      maxBuffer: 25 * 1024 * 1024,
    });
  } catch (error) {
    console.error("No pude ejecutar pdftotext. Instalalo con `brew install poppler`.");
    throw error;
  }
}

function extractPageByColumns(path, page) {
  const left = extractPageCrop(path, page, 0, 0, 300, 842);
  const right = extractPageCrop(path, page, 300, 0, 295, 842);

  if (right.replace(/\s/g, "").length < 120) return left;
  return `${left}\n\n${right}`;
}

function extractPageCrop(path, page, x, y, width, height) {
  try {
    return execFileSync("pdftotext", [
      "-f",
      String(page),
      "-l",
      String(page),
      "-x",
      String(x),
      "-y",
      String(y),
      "-W",
      String(width),
      "-H",
      String(height),
      path,
      "-",
    ], {
      encoding: "utf8",
      maxBuffer: 25 * 1024 * 1024,
    });
  } catch (error) {
    console.error("No pude ejecutar pdftotext con recorte por columnas.");
    throw error;
  }
}

function parsePage(rawPageText, pageNumber) {
  const withoutPageNumber = rawPageText
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/\f/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== `#${pageNumber}` && line !== "421 — Broadcasting network")
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!withoutPageNumber) return null;
  if (pageNumber === 1) return { kind: "cover" };
  if (/^Información de calidad para\s+tu dieta cognitiva\s+421\.news$/s.test(withoutPageNumber)) {
    return { kind: "back-cover" };
  }

  const lines = withoutPageNumber.split("\n").map((line) => line.trim()).filter(Boolean);

  if (lines[0] === "Editorial") {
    const body = lines.slice(1).join("\n");
    const editorialBody = body.split(/\nAño 2026\b/)[0]?.trim() ?? body;
    return { kind: "editorial", blocks: normalizeBlocks(editorialBody) };
  }

  const chapter = parseChapterOpening(lines);
  if (chapter) return chapter;

  return { kind: "body", blocks: normalizeBlocks(withoutPageNumber) };
}

function parseChapterOpening(lines) {
  const bylineIndex = lines.findIndex((line) => /^Por\s+/i.test(line));
  if (bylineIndex < 0 || lines.length > 12) return null;

  if (bylineIndex === 0) {
    const titleAndDeck = lines.slice(1);
    const splitAt = titleAndDeck.length > 2 ? titleAndDeck.length - 1 : titleAndDeck.length;

    return {
      kind: "chapter",
      title: joinTitle(titleAndDeck.slice(0, splitAt)),
      deck: titleAndDeck.slice(splitAt).join(" "),
      meta: lines[0],
    };
  }

  const beforeByline = lines.slice(0, bylineIndex);
  const splitAt = Math.min(3, beforeByline.length);

  return {
    kind: "chapter",
    title: joinTitle(beforeByline.slice(0, splitAt)),
    deck: beforeByline.slice(splitAt).join(" "),
    meta: lines[bylineIndex],
  };
}

function normalizeBlocks(text) {
  const dehyphenated = text.replace(/([\p{L}])-\n+\s*([\p{Ll}])/gu, "$1$2");

  return dehyphenated
    .split(/\n{2,}/)
    .flatMap((block) => splitSoftWrappedBlock(block))
    .map((block) => block.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function splitSoftWrappedBlock(block) {
  const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  const blocks = [];
  let current = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const previous = current.at(-1);
    const startsQuestion = /^[¿¡]/.test(line);
    const looksLikeHeading = line.length < 95 && !/[.!?:;»”)]$/.test(line) && /^[A-ZÁÉÍÓÚÑ¿¡]/.test(line);
    const knownStandaloneHeading = /^(Conclusión|El profeta McLuhan|La extensión algorítmica del lenguaje|Claude Code y la caída de los fosos del software|AGI, burbujas y el mundo que viene)$/.test(line);

    if (current.length === 0 && knownStandaloneHeading) {
      blocks.push(line);
      continue;
    }

    if (current.length > 0 && (startsQuestion || (looksLikeHeading && previous && /[.!?]$/.test(previous)))) {
      blocks.push(current.join(" "));
      current = [line];
      continue;
    }

    current.push(line);
  }

  if (current.length > 0) blocks.push(current.join(" "));
  return blocks;
}

function joinTitle(lines) {
  return lines.join(" ").replace(/\s+/g, " ").trim();
}
