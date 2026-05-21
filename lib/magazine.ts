import path from "node:path";
import { pathToFileURL } from "node:url";
import Epub from "epub-gen-memory";
import { MagazineIssue } from "@/lib/types";
import { sha256 } from "@/lib/security";

export type MagazineEdition = {
  filename: string;
  buffer: Buffer;
  fingerprint: string;
  chapterCount: number;
};

type Chapter = {
  title: string;
  body: string;
};

export async function buildMagazineEdition(issue: Pick<MagazineIssue, "issue_number" | "title" | "publication_date" | "source_text">): Promise<MagazineEdition> {
  const chapters = parseMagazineText(issue.source_text);
  const fingerprint = sha256(`${issue.issue_number}|${issue.title}|${issue.publication_date}|${issue.source_text}`);
  const filename = `revista-421-${issue.issue_number}.epub`;
  const coverImageUrl = pathToFileURL(path.join(process.cwd(), "public", "epub", "cover.jpg")).href;
  const issueDate = formatIssueDate(issue.publication_date);

  const content = [
    {
      title: "Portada",
      content: magazineCoverHtml(issue, issueDate, coverImageUrl, chapters.length),
      beforeToc: true,
      excludeFromToc: true,
    },
    ...chapters.map((chapter) => ({
      title: chapter.title,
      content: chapterHtml(chapter),
    })),
  ];

  const buffer = await Epub({
    cover: coverImageUrl,
    title: "Revista 421",
    author: "421.news",
    publisher: "421.news",
    lang: "es",
    tocTitle: "Indice",
    prependChapterTitles: false,
    contentOPF: contentOpfTemplate(issue.issue_number),
    tocNCX: tocNcxTemplate(issue.issue_number),
    css: kindleCss(),
    ignoreFailedDownloads: true,
  }, content);

  return { filename, buffer, fingerprint, chapterCount: chapters.length };
}

export function parseMagazineText(sourceText: string): Chapter[] {
  const cleaned = sourceText
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();

  if (!cleaned) return [{ title: "Revista 421", body: "Sin contenido." }];

  const markedChapters = parseMarkedChapters(cleaned);
  if (markedChapters.length > 0) return markedChapters;

  return splitFallback(cleaned);
}

function parseMarkedChapters(text: string) {
  const chapters: Chapter[] = [];
  let currentTitle: string | null = null;
  let currentLines: string[] = [];

  for (const line of text.split("\n")) {
    const match = line.match(/^#{1,2}\s+(.+)$/);

    if (match) {
      if (currentTitle) {
        chapters.push({ title: currentTitle, body: currentLines.join("\n").trim() });
      }

      currentTitle = match[1].trim();
      currentLines = [];
      continue;
    }

    currentLines.push(line);
  }

  if (currentTitle) {
    chapters.push({ title: currentTitle, body: currentLines.join("\n").trim() });
  }

  return chapters.filter((chapter) => chapter.title && chapter.body);
}

function splitFallback(text: string): Chapter[] {
  const pages = text
    .split(/\f+/)
    .map((page) => page.trim())
    .filter(Boolean);

  if (pages.length <= 1) {
    return [{ title: "Revista 421", body: text }];
  }

  const chapters: Chapter[] = [];
  let currentTitle = "Editorial";
  let currentPages: string[] = [];

  for (const page of pages) {
    const inferredTitle = inferTitle(page);

    if (inferredTitle && currentPages.length > 0) {
      chapters.push({ title: currentTitle, body: currentPages.join("\n\n") });
      currentTitle = inferredTitle;
      currentPages = [page];
      continue;
    }

    if (inferredTitle) currentTitle = inferredTitle;
    currentPages.push(page);
  }

  if (currentPages.length > 0) {
    chapters.push({ title: currentTitle, body: currentPages.join("\n\n") });
  }

  return chapters.length > 0 ? chapters : [{ title: "Revista 421", body: text }];
}

function inferTitle(page: string) {
  const lines = page
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !/^#?\d+$/.test(line) && !/^(Abril|Mayo|Junio|Julio|Agosto|Septiembre|Octubre|Noviembre|Diciembre)/i.test(line));

  const bylineIndex = lines.findIndex((line) => /^Por\s+/i.test(line));
  if (bylineIndex >= 0 && lines[bylineIndex + 1]) return lines[bylineIndex + 1];

  return lines.find((line) => line.length >= 8 && line.length <= 90) ?? null;
}

function magazineCoverHtml(issue: Pick<MagazineIssue, "issue_number" | "title">, issueDate: string, coverImageUrl: string, chapterCount: number) {
  return `
    <section class="cover">
      <img class="cover-image" src="${coverImageUrl}" alt="Revista 421" />
      <p class="kicker">Revista 421 #${issue.issue_number}</p>
      <h1>${escapeHtml(issue.title)}</h1>
      <p class="date">${escapeHtml(issueDate)}</p>
      <p>${chapterCount} capitulo${chapterCount === 1 ? "" : "s"} adaptado${chapterCount === 1 ? "" : "s"} para e-reader.</p>
    </section>
  `;
}

function chapterHtml(chapter: Chapter) {
  return `
    <article>
      <h1>${escapeHtml(chapter.title)}</h1>
      ${paragraphsHtml(chapter.body)}
    </article>
  `;
}

function paragraphsHtml(text: string) {
  return text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      if (/^#{1,6}\s+/.test(block)) return "";
      if (/^Por\s+/i.test(block)) return `<p class="meta">${escapeHtml(block)}</p>`;
      return `<p>${escapeHtml(block).replace(/\n/g, "<br />")}</p>`;
    })
    .join("\n");
}

function formatIssueDate(date: string) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00-03:00`));
}

function contentOpfTemplate(issueNumber: number) {
  const identifier = `urn:revista421:issue:${issueNumber}`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf"
         version="3.0"
         unique-identifier="BookId"
         xmlns:dc="http://purl.org/dc/elements/1.1/"
         xmlns:dcterms="http://purl.org/dc/terms/"
         xml:lang="es">
    <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
        <dc:identifier id="BookId">${identifier}</dc:identifier>
        <dc:title><%= title %></dc:title>
        <dc:description><%= description %></dc:description>
        <dc:language><%= lang %></dc:language>
        <meta property="dcterms:modified"><%= (new Date()).toISOString().split(".")[0]+ "Z" %></meta>
        <dc:creator id="creator"><%= author.join(",") %></dc:creator>
        <dc:publisher><%= publisher %></dc:publisher>
        <dc:date><%= date %></dc:date>
        <dc:rights>Copyright &#x00A9; <%= (new Date()).getFullYear() %> by <%= publisher %></dc:rights>
        <% if(cover) { %><meta name="cover" content="image_cover"/><% } %>
        <meta name="generator" content="Kindle421" />
    </metadata>
    <manifest>
        <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml" />
        <item id="toc" href="toc.xhtml" media-type="application/xhtml+xml" properties="nav" />
        <item id="css" href="style.css" media-type="text/css" />
        <% if(cover) { %><item id="image_cover" href="cover.<%= cover.extension %>" media-type="<%= cover.mediaType %>" /><% } %>
        <% images.forEach(function(image, index){ %><item id="image_<%= index %>" href="images/<%= image.id %>.<%= image.extension %>" media-type="<%= image.mediaType %>" /><% }) %>
        <% content.forEach(function(content, index){ %><item id="content_<%= index %>_<%= content.id %>" href="<%= content.filename %>" media-type="application/xhtml+xml" /><% }) %>
        <% fonts.forEach(function(font, index){%><item id="font_<%= index%>" href="fonts/<%= font.filename %>" media-type="<%= font.mediaType %>" /><%})%>
    </manifest>
    <spine toc="ncx">
        <% content.forEach(function(content, index){ %><% if(content.beforeToc){ %><itemref idref="content_<%= index %>_<%= content.id %>"/><% } %><% }) %>
        <itemref idref="toc" />
        <% content.forEach(function(content, index){ %><% if(!content.beforeToc){ %><itemref idref="content_<%= index %>_<%= content.id %>"/><% } %><% }) %>
    </spine>
</package>`;
}

function tocNcxTemplate(issueNumber: number) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
    <head>
        <meta name="dtb:uid" content="urn:revista421:issue:${issueNumber}" />
        <meta name="dtb:generator" content="Kindle421"/>
        <meta name="dtb:depth" content="1"/>
        <meta name="dtb:totalPageCount" content="0"/>
        <meta name="dtb:maxPageNumber" content="0"/>
    </head>
    <docTitle><text><%= title %></text></docTitle>
    <docAuthor><text><%= author %></text></docAuthor>
    <navMap>
        <% var _index = 0; %>
        <% content.forEach(function(content, index){ %>
            <% if(!content.excludeFromToc){ %>
                <navPoint id="content_<%= index %>_<%= content.id %>" playOrder="<%= _index++ %>" class="chapter">
                    <navLabel><text><%= content.title %></text></navLabel>
                    <content src="<%= content.filename %>"/>
                </navPoint>
            <% } %>
        <% }) %>
    </navMap>
</ncx>`;
}

function kindleCss() {
  return `
    body { font-family: Georgia, serif; color: #111; line-height: 1.55; }
    h1 { font-size: 1.65em; line-height: 1.18; margin: 0 0 0.75em; }
    p { margin: 0 0 1em; }
    img { max-width: 100%; height: auto; margin: 1em 0; }
    .cover { text-align: center; padding-top: 5%; }
    .cover h1 { font-size: 2em; }
    .cover-image { display: block; width: 78%; max-width: 520px; margin: 0 auto 2em; }
    .kicker, .date, .meta { color: #555; font-size: 0.88em; }
  `;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
