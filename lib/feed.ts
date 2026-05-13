import { XMLParser } from "fast-xml-parser";
import { FeedArticle } from "@/lib/types";
import { sha256 } from "@/lib/security";

const FEED_URL = "https://www.421.news/es/rss/";

type RssItem = {
  title?: string;
  link?: string;
  guid?: string | { "#text"?: string };
  pubDate?: string;
  creator?: string;
  "dc:creator"?: string;
  "content:encoded"?: string;
  description?: string;
};

const parser = new XMLParser({
  ignoreAttributes: false,
  preserveOrder: false,
  parseTagValue: false,
  cdataPropName: "__cdata",
  trimValues: true,
});

export async function fetch421Feed(): Promise<FeedArticle[]> {
  const response = await fetch(FEED_URL, {
    headers: { accept: "application/rss+xml, application/xml, text/xml" },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`No se pudo leer el RSS de 421.news (${response.status}).`);
  }

  const xml = await response.text();
  const parsed = parser.parse(xml) as { rss?: { channel?: { item?: RssItem[] | RssItem } } };
  const rawItems = parsed.rss?.channel?.item;
  const items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];

  return items
    .map(toArticle)
    .filter((article): article is FeedArticle => Boolean(article))
    .sort((a: FeedArticle, b: FeedArticle) => b.pubDate.getTime() - a.pubDate.getTime());
}

export function selectNewArticles(articles: FeedArticle[], lastFingerprint: string | null) {
  if (!lastFingerprint) return articles;

  const index = articles.findIndex((article) => article.fingerprint === lastFingerprint);
  if (index === -1) return articles;

  return articles.slice(0, index);
}

function toArticle(item: RssItem): FeedArticle | null {
  const title = textValue(item.title);
  const link = textValue(item.link);
  const pubDateRaw = textValue(item.pubDate);
  const content = textValue(item["content:encoded"]) || textValue(item.description);

  if (!title || !link || !pubDateRaw || !content) return null;

  const pubDate = new Date(pubDateRaw);
  if (Number.isNaN(pubDate.getTime())) return null;

  const guid = textValue(item.guid) || `${pubDate.toISOString()}-${link}`;
  const html = sanitizeForKindle(content);
  const fingerprint = sha256(`${guid}|${pubDate.toISOString()}|${link}`);

  return {
    guid,
    title: cleanText(title),
    link,
    pubDate,
    author: cleanText(textValue(item.creator) || textValue(item["dc:creator"])),
    html,
    fingerprint,
  };
}

function sanitizeForKindle(html: string) {
  const allowedTags = new Set([
    "p",
    "br",
    "strong",
    "em",
    "b",
    "i",
    "u",
    "blockquote",
    "ul",
    "ol",
    "li",
    "a",
    "h2",
    "h3",
    "h4",
  ]);

  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\son\w+=["'][^"']*["']/gi, "")
    .replace(/\s(?:style|class|id|width|height)=["'][^"']*["']/gi, "")
    .replace(/\s(href|src)=["']\s*javascript:[^"']*["']/gi, "")
    .replace(/<\/?([a-zA-Z0-9:-]+)([^>]*)>/g, (match, rawTag: string, rawAttrs: string) => {
      const tag = rawTag.toLowerCase();
      if (!allowedTags.has(tag)) return "";
      if (match.startsWith("</")) return `</${tag}>`;
      if (tag === "br") return "<br />";

      const attrs = sanitizeAttrs(tag, rawAttrs);
      return `<${tag}${attrs}>`;
    });
}

function sanitizeAttrs(tag: string, attrs: string) {
  const safeAttrs: string[] = [];
  const attrPattern = /\s([a-zA-Z:-]+)=["']([^"']*)["']/g;
  let match: RegExpExecArray | null;

  while ((match = attrPattern.exec(attrs))) {
    const name = match[1].toLowerCase();
    const value = match[2].trim();

    if (tag === "a" && name === "href" && /^https?:\/\//i.test(value)) {
      safeAttrs.push(` href="${escapeAttr(value)}"`);
    }

    if (tag === "a" && ["alt", "title"].includes(name)) {
      safeAttrs.push(` ${name}="${escapeAttr(value)}"`);
    }
  }

  return safeAttrs.join("");
}

function escapeAttr(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}

function textValue(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "object" && value !== null && "#text" in value) {
    return String((value as { "#text"?: unknown })["#text"] ?? "");
  }
  if (typeof value === "object" && value !== null && "__cdata" in value) {
    return String((value as { __cdata?: unknown }).__cdata ?? "");
  }
  return "";
}

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}
