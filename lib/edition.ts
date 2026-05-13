import path from "node:path";
import { pathToFileURL } from "node:url";
import Epub from "epub-gen-memory";
import { FeedArticle } from "@/lib/types";
import { sha256 } from "@/lib/security";

const EPUB_STABLE_IDENTIFIER = "urn:kindle421:daily:es";

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
    contentOPF: contentOpfTemplate(),
    tocNCX: tocNcxTemplate(),
    css: kindleCss(),
    ignoreFailedDownloads: true,
  }, content);

  return { filename, buffer, fingerprint };
}


function contentOpfTemplate() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf"
         version="3.0"
         unique-identifier="BookId"
         xmlns:dc="http://purl.org/dc/elements/1.1/"
         xmlns:dcterms="http://purl.org/dc/terms/"
         xml:lang="es"
         xmlns:media="http://www.idpf.org/epub/vocab/overlays/#"
         prefix="ibooks: http://vocabulary.itunes.apple.com/rdf/ibooks/vocabulary-extensions-1.0/">

    <metadata xmlns:dc="http://purl.org/dc/elements/1.1/"
              xmlns:opf="http://www.idpf.org/2007/opf">

        <dc:identifier id="BookId">${EPUB_STABLE_IDENTIFIER}</dc:identifier>
        <meta refines="#BookId" property="identifier-type" scheme="onix:codelist5">22</meta>
        <meta property="dcterms:identifier" id="meta-identifier">${EPUB_STABLE_IDENTIFIER}</meta>
        <dc:title><%= title %></dc:title>
        <meta property="dcterms:title" id="meta-title"><%= title %></meta>
        <dc:description><%= description %></dc:description>
        <dc:language><%= lang %></dc:language>
        <meta property="dcterms:language" id="meta-language"><%= lang %></meta>
        <meta property="dcterms:modified"><%= (new Date()).toISOString().split(".")[0]+ "Z" %></meta>
        <dc:creator id="creator"><%= author.join(",") %></dc:creator>
        <meta refines="#creator" property="file-as"><%= author.join(",") %></meta>
        <meta property="dcterms:publisher"><%= publisher %></meta>
        <dc:publisher><%= publisher %></dc:publisher>
        <meta property="dcterms:date"><%= date %></meta>
        <dc:date><%= date %></dc:date>
        <meta property="dcterms:rights">All rights reserved</meta>
        <dc:rights>Copyright &#x00A9; <%= (new Date()).getFullYear() %> by <%= publisher %></dc:rights>
        <% if(cover) { %>
        <meta name="cover" content="image_cover"/>
        <% } %>
        <meta name="generator" content="epub-gen" />
        <meta property="ibooks:specified-fonts">true</meta>

    </metadata>

    <manifest>
        <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml" />
        <item id="toc" href="toc.xhtml" media-type="application/xhtml+xml" properties="nav" />
        <item id="css" href="style.css" media-type="text/css" />

        <% if(cover) { %>
        <item id="image_cover" href="cover.<%= cover.extension %>" media-type="<%= cover.mediaType %>" />
        <% } %>

        <% images.forEach(function(image, index){ %>
        <item id="image_<%= index %>" href="images/<%= image.id %>.<%= image.extension %>" media-type="<%= image.mediaType %>" />
        <% }) %>

        <% content.forEach(function(content, index){ %>
        <item id="content_<%= index %>_<%= content.id %>" href="<%= content.filename %>" media-type="application/xhtml+xml" />
        <% }) %>

        <% fonts.forEach(function(font, index){%>
        <item id="font_<%= index%>" href="fonts/<%= font.filename %>" media-type="<%= font.mediaType %>" />
        <%})%>
    </manifest>

    <spine toc="ncx">
        <% content.forEach(function(content, index){ %>
            <% if(content.beforeToc){ %>
                <itemref idref="content_<%= index %>_<%= content.id %>"/>
            <% } %>
        <% }) %>
        <itemref idref="toc" />
        <% content.forEach(function(content, index){ %>
            <% if(!content.beforeToc){ %>
                <itemref idref="content_<%= index %>_<%= content.id %>"/>
            <% } %>
        <% }) %>
    </spine>
    <guide>
        <reference type="text" title="Table of Content" href="toc.xhtml"/>
    </guide>
</package>`;
}

function tocNcxTemplate() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
    <head>
        <meta name="dtb:uid" content="${EPUB_STABLE_IDENTIFIER}" />
        <meta name="dtb:generator" content="epub-gen"/>
        <meta name="dtb:depth" content="1"/>
        <meta name="dtb:totalPageCount" content="0"/>
        <meta name="dtb:maxPageNumber" content="0"/>
    </head>
    <docTitle>
        <text><%= title %></text>
    </docTitle>
    <docAuthor>
        <text><%= author %></text>
    </docAuthor>
    <navMap>
        <% var _index = 0; %>
        <% content.forEach(function(content, index){ %>
            <% if(!content.excludeFromToc && content.beforeToc){ %>
                <navPoint id="content_<%= index %>_<%= content.id %>" playOrder="<%= _index++ %>" class="chapter">
                    <navLabel>
                        <text><%= (numberChaptersInTOC ? (1+index) + ". " : "") + content.title %></text>
                    </navLabel>
                    <content src="<%= content.filename %>"/>
                </navPoint>
            <% } %>
        <% }) %>

        <% if (tocInTOC){ %>
            <navPoint id="toc" playOrder="<%= _index++ %>" class="chapter">
                <navLabel>
                    <text><%= tocTitle %></text>
                </navLabel>
                <content src="toc.xhtml"/>
            </navPoint>
        <% } %>

        <% content.forEach(function(content, index){ %>
            <% if(!content.excludeFromToc && !content.beforeToc){ %>
                <navPoint id="content_<%= index %>_<%= content.id %>" playOrder="<%= _index++ %>" class="chapter">
                    <navLabel>
                        <text><%= (numberChaptersInTOC ? (1+index) + ". " : "") + content.title %></text>
                    </navLabel>
                    <content src="<%= content.filename %>"/>
                </navPoint>
            <% } %>
        <% }) %>
    </navMap>
</ncx>`;
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
