#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

const [, , pdfPath, outputDir = "tmp/revista-421-images"] = process.argv;

if (!pdfPath) {
  console.error("Uso: node scripts/extract-pdf-images.mjs /path/al/numero.pdf tmp/imagenes > manifest.json");
  process.exit(1);
}

const absoluteOutputDir = path.resolve(outputDir);
const rawPrefix = path.join(absoluteOutputDir, "raw");
await fs.mkdir(absoluteOutputDir, { recursive: true });

const images = parsePdfImagesList(pdfPath)
  .filter((image) => image.type === "image")
  .filter((image) => image.page > 1)
  .filter((image) => image.width >= 250 && image.height >= 220)
  .filter((image) => image.width * image.height >= 80_000);

execFileSync("pdfimages", ["-png", pdfPath, rawPrefix], {
  stdio: ["ignore", "ignore", "inherit"],
});

const manifest = [];

for (const image of images) {
  const rawPath = await findExtractedImage(rawPrefix, image.num);
  if (!rawPath) continue;

  const extension = path.extname(rawPath).toLowerCase() || ".png";
  const filename = `page-${String(image.page).padStart(3, "0")}-image-${String(image.num).padStart(3, "0")}${extension}`;
  const destination = path.join(absoluteOutputDir, filename);

  await fs.copyFile(rawPath, destination);

  manifest.push({
    page: image.page,
    num: image.num,
    width: image.width,
    height: image.height,
    src: path.relative(process.cwd(), destination),
    alt: `Imagen de Revista 421, pagina ${image.page}`,
  });
}

console.log(JSON.stringify(manifest, null, 2));

function parsePdfImagesList(filePath) {
  const output = execFileSync("pdfimages", ["-list", filePath], {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });

  return output
    .split("\n")
    .slice(2)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\s+/);
      return {
        page: Number(parts[0]),
        num: Number(parts[1]),
        type: parts[2],
        width: Number(parts[3]),
        height: Number(parts[4]),
        color: parts[5],
      };
    })
    .filter((image) => Number.isFinite(image.page) && Number.isFinite(image.num));
}

async function findExtractedImage(prefix, imageNumber) {
  const base = `${prefix}-${String(imageNumber).padStart(3, "0")}`;
  const candidates = [".png", ".jpg", ".jpeg", ".ppm", ".pbm"].map((extension) => `${base}${extension}`);

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Try the next extension produced by pdfimages.
    }
  }

  return null;
}
