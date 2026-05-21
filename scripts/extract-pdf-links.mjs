#!/usr/bin/env node
import { execFileSync } from "node:child_process";

const [, , pdfPath] = process.argv;

if (!pdfPath) {
  console.error("Uso: node scripts/extract-pdf-links.mjs /path/al/numero.pdf > links.json");
  process.exit(1);
}

const xml = execFileSync("pdftohtml", ["-xml", "-i", "-stdout", pdfPath], {
  encoding: "utf8",
  maxBuffer: 50 * 1024 * 1024,
});

const links = [];
let page = 0;

for (const line of xml.split("\n")) {
  const pageMatch = line.match(/<page\b[^>]*number="(\d+)"/);
  if (pageMatch) page = Number(pageMatch[1]);
  if (!line.includes("<a href=")) continue;

  for (const match of line.matchAll(/<a href="([^"]+)">([\s\S]*?)<\/a>/g)) {
    const href = decodeXml(match[1]);
    if (!/^https?:\/\//i.test(href)) continue;

    const text = normalizeLinkText(decodeXml(stripTags(match[2])));
    if (!isUsefulLinkText(text)) continue;

    const previous = links.at(-1);
    if (previous && previous.page === page && previous.href === href && previous.text.endsWith("-")) {
      previous.text = `${previous.text.slice(0, -1)}${text}`;
      continue;
    }

    links.push({ page, text, href });
  }
}

const deduped = [];
const seen = new Set();

for (const link of links) {
  const key = `${link.text}\u0000${link.href}`;
  if (seen.has(key)) continue;
  seen.add(key);
  deduped.push(link);
}

console.log(JSON.stringify(deduped.sort((a, b) => b.text.length - a.text.length), null, 2));

function stripTags(value) {
  return value.replace(/<[^>]+>/g, "");
}

function decodeXml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function normalizeLinkText(value) {
  return value
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim()
    .replace(/^[“"']+|[”"']+$/g, "");
}

function isUsefulLinkText(value) {
  if (value.length < 10) return false;
  if (!/\p{L}/u.test(value)) return false;
  if (/^https?:\/\//i.test(value)) return false;
  return true;
}
