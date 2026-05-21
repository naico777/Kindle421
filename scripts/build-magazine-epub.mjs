#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import EpubModule from "epub-gen-memory";

const createEpub = EpubModule.default?.default ?? EpubModule.default ?? EpubModule.EPub;

const [, , inputPath, outputPath = "tmp/revista-421-preview.epub", ...rawFlags] = process.argv;
const flags = Object.fromEntries(
  rawFlags
    .map((flag) => flag.match(/^--([^=]+)=(.*)$/))
    .filter(Boolean)
    .map((match) => [match[1], match[2]]),
);
const issueTitle = flags.title || "421 #14: Especial Inteligencia Artificial (Abril '26)";
const issueNumber = flags.issue || "14";
const coverImageUrl = flags.cover
  ? pathToFileURL(path.resolve(flags.cover)).href
  : pathToFileURL(path.join(process.cwd(), "public", "epub", "cover.jpg")).href;

if (!inputPath) {
  console.error("Uso: node scripts/build-magazine-epub.mjs tmp/revista.txt tmp/revista.epub");
  process.exit(1);
}

const sourceText = await fs.readFile(inputPath, "utf8");
const chapters = parseChapters(sourceText);

const content = [
  {
    title: "Portada",
    content: `
      <section class="cover">
        <img class="cover-image" src="${coverImageUrl}" alt="${escapeHtml(issueTitle)}" />
        <p class="kicker">421 #${escapeHtml(issueNumber)}</p>
        <h1>${escapeHtml(issueTitle)}</h1>
        <p>Versión e-reader de la revista mensual de 421.news.</p>
      </section>
    `,
    excludeFromToc: true,
  },
  ...chapters.map((chapter) => ({
    title: chapter.title,
    content: chapterHtml(chapter),
  })),
];

const epub = await createEpub({
  cover: coverImageUrl,
  title: issueTitle,
  author: "421.news",
  publisher: "421.news",
  lang: "es",
  tocTitle: "Indice",
  prependChapterTitles: false,
  css: `
    body { font-family: Georgia, serif; color: #111; line-height: 1.55; }
    h1 { font-size: 1.65em; line-height: 1.18; margin: 0 0 0.75em; }
    h2 { font-size: 1.08em; line-height: 1.3; margin: 2.1em 0 0.75em; font-weight: 700; }
    p { margin: 0 0 1em; }
    a { color: inherit; text-decoration: underline; }
    img { max-width: 100%; height: auto; margin: 1em 0; }
    figure { margin: 1.4em 0; page-break-inside: avoid; }
    figcaption { color: #555; font-size: 0.82em; line-height: 1.35; margin-top: 0.4em; text-align: center; }
    .cover { text-align: center; padding-top: 5%; }
    .cover h1 { font-size: 2em; }
    .cover-image { display: block; width: 92%; max-width: 620px; margin: 0 auto 2em; }
    .kicker, .meta { color: #555; font-size: 0.88em; }
    .deck { font-size: 1.05em; font-weight: 700; line-height: 1.35; }
    .article-opening { page-break-before: always; page-break-after: always; text-align: center; padding-top: 4%; }
    .article-opening h1 { font-size: 2em; line-height: 1.1; margin: 0.5em 0; }
    .article-opening .meta { margin-bottom: 1.2em; }
    .hero-image { margin: 0 auto 1.2em; }
    .hero-image img { display: block; width: 100%; max-height: 72vh; object-fit: contain; margin: 0 auto; }
    .inline-image img { display: block; margin-left: auto; margin-right: auto; }
  `,
  ignoreFailedDownloads: true,
}, content);

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, epub);
console.log(outputPath);

function parseChapters(text) {
  const chapters = [];
  let current = null;

  for (const block of text.split(/\n{2,}/).map((value) => value.trim()).filter(Boolean)) {
    const heading = block.match(/^#\s+(.+)$/);

    if (heading) {
      current = { title: heading[1], blocks: [] };
      chapters.push(current);
      continue;
    }

    if (!current) {
      current = { title: "Revista 421", blocks: [] };
      chapters.push(current);
    }

    current.blocks.push(block);
  }

  return chapters;
}

function chapterHtml(chapter) {
  if (chapter.title.toLowerCase() === "editorial") {
    return `
      <article class="editorial">
        <h1>${inlineMarkdown(chapter.title)}</h1>
        ${chapter.blocks.map(blockToHtml).join("\n")}
      </article>
    `;
  }

  const opening = chapterOpening(chapter);

  return `
    <article>
      <section class="article-opening">
        ${opening.image ? imageHtml(opening.image, "hero-image") : ""}
        ${opening.meta ? `<p class="meta">${inlineMarkdown(opening.meta)}</p>` : ""}
        <h1>${inlineMarkdown(chapter.title)}</h1>
        ${opening.deck ? `<p class="deck">${inlineMarkdown(opening.deck)}</p>` : ""}
      </section>
      <section class="article-body">
        ${opening.bodyBlocks.map(blockToHtml).join("\n")}
      </section>
    </article>
  `;
}

function chapterOpening(chapter) {
  const metaIndex = chapter.blocks.findIndex((block) => /^Por\s+/i.test(block));
  const imageIndex = chapter.blocks.findIndex((block, index) => index < 8 && Boolean(parseImageBlock(block)));
  const openingEnd = Math.max(metaIndex, imageIndex, 1);
  const openingBlocks = chapter.blocks.slice(0, openingEnd + 1);
  const image = imageIndex >= 0 ? parseImageBlock(chapter.blocks[imageIndex]) : null;
  const meta = metaIndex >= 0 ? chapter.blocks[metaIndex] : null;
  const deck = openingBlocks.find((block) => block !== meta && !parseImageBlock(block) && !/^#{1,6}\s+/.test(block)) ?? null;
  const consumed = new Set([meta, deck, imageIndex >= 0 ? chapter.blocks[imageIndex] : null].filter(Boolean));
  const bodyBlocks = chapter.blocks.filter((block, index) => index > openingEnd || !consumed.has(block));

  return { meta, deck, image, bodyBlocks };
}

function blockToHtml(block) {
  const image = parseImageBlock(block);
  if (image) return imageHtml(image, "inline-image");

  if (/^Por\s+/i.test(block)) return `<p class="meta">${inlineMarkdown(block)}</p>`;
  if (isSectionBreak(block)) return `<h2>${inlineMarkdown(block)}</h2>`;
  return `<p>${inlineMarkdown(block)}</p>`;
}

function imageHtml(image, className) {
  return `
    <figure class="${className}">
      <img src="${escapeHtml(resolveImageSource(image.src))}" alt="${escapeHtml(image.alt)}" />
      ${image.alt ? `<figcaption>${inlineMarkdown(image.alt)}</figcaption>` : ""}
    </figure>
  `;
}

function parseImageBlock(block) {
  const match = block.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
  if (!match) return null;
  return { alt: match[1].trim(), src: match[2].trim() };
}

function resolveImageSource(src) {
  if (/^(https?:|file:|data:)/i.test(src)) return src;
  return pathToFileURL(path.resolve(src)).href;
}

function isSectionBreak(block) {
  return block.length <= 95 && !/[.!?:;»”)]$/.test(block) && /^[A-ZÁÉÍÓÚÑ¿¡]/.test(block);
}

function inlineMarkdown(value) {
  const placeholders = [];
  const stash = (html) => {
    placeholders.push(html);
    return `\u0000${placeholders.length - 1}\u0000`;
  };

  const escaped = escapeHtml(value)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (_match, label, href) => stash(`<a href="${href}">${label}</a>`))
    .replace(/\*\*([^*]+)\*\*/g, (_match, text) => stash(`<strong>${text}</strong>`))
    .replace(/(^|[\s(])\*([^*\n]+)\*/g, (_match, prefix, text) => `${prefix}${stash(`<em>${text}</em>`)}`);

  return placeholders.reduce((html, placeholder, index) => html.replaceAll(`\u0000${index}\u0000`, placeholder), escaped);
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
