import path from "node:path";
import { pathToFileURL } from "node:url";
import Epub from "epub-gen-memory";
import { FeedArticle } from "@/lib/types";
import { sha256 } from "@/lib/security";

export type Edition = {
  filename: string;
  buffer: Buffer;
  fingerprint: string;
};

export async function buildEdition(articles: FeedArticle[], date = new Date()): Promise<Edition> {
  const editionDate = new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    dateStyle: "long",
  }).format(date);

  const fingerprint = sha256(articles.map((article) => article.fingerprint).join("|"));
  const filename = "421.news.epub";
  const coverImageUrl = pathToFileURL(path.join(process.cwd(), "public", "epub", "cover.jpg")).href;

  const content = [
    {
      title: "Portada",
      content: coverHtml(editionDate, articles.length, coverImageUrl),
      excludeFromToc: true,
    },
    {
      title: "Indice",
      content: indexHtml(articles),
      excludeFromToc: true,
    },
    ...articles.map((article) => ({
      title: article.title,
      content: articleHtml(article),
    })),
  ];

  const buffer = await Epub({
    cover: coverImageUrl,
    title: "421.news",
    author: "421.news",
    publisher: "Kindle421",
    lang: "es",
    tocTitle: "Indice",
    prependChapterTitles: false,
    css: kindleCss(),
    ignoreFailedDownloads: true,
  }, content);

  return { filename, buffer, fingerprint };
}

function coverHtml(date: string, count: number, coverImageUrl: string) {
  return `
    <section class="cover">
      <img class="cover-image" src="${coverImageUrl}" alt="421.news" />
      <p class="date">${date}</p>
      <p>Edicion diaria de 421.news en español.</p>
      <p>${count} articulo${count === 1 ? "" : "s"} nuevo${count === 1 ? "" : "s"}.</p>
    </section>
  `;
}

function indexHtml(articles: FeedArticle[]) {
  return `
    <section>
      <h1>Indice</h1>
      <ol>
        ${articles
          .map(
            (article, index) => `
              <li>
                <a href="#article-${article.fingerprint}">${escapeHtml(article.title)}</a>
                <small>${formatDate(article.pubDate)}</small>
              </li>
            `,
          )
          .join("")}
      </ol>
    </section>
  `;
}

function articleHtml(article: FeedArticle) {
  return `
    <article id="article-${article.fingerprint}">
      <h1>${escapeHtml(article.title)}</h1>
      <p class="meta">${formatDate(article.pubDate)}${article.author ? ` · ${escapeHtml(article.author)}` : ""}</p>
      ${article.html}
      <p class="source"><a href="${article.link}">Leer fuente original en 421.news</a></p>
    </article>
  `;
}

function kindleCss() {
  return `
    body { font-family: Georgia, serif; color: #111; line-height: 1.5; }
    h1 { font-size: 1.65em; line-height: 1.2; margin: 0 0 0.7em; }
    h2, h3, h4 { line-height: 1.25; margin-top: 1.5em; }
    p { margin: 0 0 1em; }
    img { max-width: 100%; height: auto; margin: 1em 0; }
    blockquote { border-left: 3px solid #777; margin-left: 0; padding-left: 1em; color: #333; }
    .cover { text-align: center; padding-top: 5%; }
    .cover-image { display: block; width: 75%; max-width: 520px; margin: 0 auto 2em; }
    .date, .meta, small, .source { color: #555; font-size: 0.85em; }
    li { margin-bottom: 0.7em; }
  `;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
