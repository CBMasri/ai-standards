import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const build = path.join(root, "build");
const base = (process.env.BASE_PATH ?? "").replace(/\/$/, "");

marked.setOptions({ gfm: true });

function pageHref(filename) {
  if (filename === "standards.md") return `${base}/`;
  return `${base}/${filename.slice(0, -3)}/`;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function titleOf(markdown, filename) {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : filename.replace(/\.md$/, "");
}

function separateReadingList(html) {
  const heading = "<h2>Inspiration and recommended reading</h2>";
  const index = html.indexOf(heading);
  if (index === -1) return html;
  return `${html.slice(0, index)}<aside class="reading" id="reading">\n${html.slice(index)}</aside>\n`;
}

function rewriteLinks(markdown) {
  return markdown.replace(/\]\(([^)\s]+)\)/g, (match, href) => {
    if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("#") || href.startsWith("/")) {
      return match;
    }
    const hashIndex = href.indexOf("#");
    const pathPart = hashIndex === -1 ? href : href.slice(0, hashIndex);
    const hash = hashIndex === -1 ? "" : href.slice(hashIndex);
    if (!pathPart.endsWith(".md")) return match;
    return `](${pageHref(path.posix.basename(pathPart))}${hash})`;
  });
}

const sourceRepo = "https://github.com/CBMasri/ai-standards";

function sourceHref(filename) {
  return `${sourceRepo}/edit/main/${encodeURIComponent(filename)}`;
}

function layout({ title, nav, body, source }) {
  const navigation = nav ? `\n    <nav>${nav}</nav>` : "";
  const sourceLink = source
    ? `\n  <footer>\n    <a href="${source}">Edit source</a>\n  </footer>`
    : "";
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="${base}/site.css">
</head>
<body>
  <header>
    <a class="home" href="${base}/">AI standards</a>${navigation}
  </header>
  <main>
${body}
  </main>${sourceLink}
</body>
</html>
`;
}

const filenames = (await readdir(root))
  .filter((name) => name.endsWith(".md") && name !== "README.md")
  .sort((a, b) => a.localeCompare(b));

const pages = await Promise.all(
  filenames.map(async (filename) => {
    const markdown = await readFile(path.join(root, filename), "utf8");
    const title = titleOf(markdown, filename);
    return {
      filename,
      title,
      label: title,
      href: pageHref(filename),
      html: separateReadingList(marked.parse(rewriteLinks(markdown))),
    };
  }),
);

await rm(build, { recursive: true, force: true });
await mkdir(build, { recursive: true });
await writeFile(path.join(build, "site.css"), await readFile(path.join(root, "src", "site.css")));
await writeFile(path.join(build, ".nojekyll"), "");

const nav =
  pages.length < 2
    ? ""
    : pages
        .map((item) => `<a href="${item.href}">${escapeHtml(item.label)}</a>`)
        .join("");

for (const page of pages) {
  const currentNav = nav.replace(
    `href="${page.href}"`,
    `href="${page.href}" aria-current="page"`,
  );
  const html = layout({
    title: page.title,
    nav: currentNav,
    body: page.html,
    source: sourceHref(page.filename),
  });
  const dir =
    page.filename === "standards.md" ? build : path.join(build, page.filename.slice(0, -3));
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "index.html"), html);
}

await writeFile(
  path.join(build, "404.html"),
  layout({
    title: "Page not found",
    nav: "",
    body: `<h1>Page not found</h1>\n<p>That page is not in the <a href="${base}/">AI standards</a>.</p>\n`,
  }),
);
