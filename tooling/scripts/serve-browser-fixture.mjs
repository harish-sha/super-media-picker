import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const fixtureRoot = resolve(repositoryRoot, "tests/browser");
const browserDistribution = resolve(
  process.env.SMP_BROWSER_DIST ??
    resolve(repositoryRoot, "packages/super-media-picker/dist/browser"),
);
const host = process.env.SMP_BROWSER_HOST ?? "127.0.0.1";
const port = Number(process.env.SMP_BROWSER_PORT ?? "4174");

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".webp": "image/webp",
};

function safeFile(root, relativePath) {
  const candidate = resolve(root, `.${relativePath}`);
  return candidate === root || candidate.startsWith(`${root}${sep}`)
    ? candidate
    : undefined;
}

function sendJson(response, value, status = 200) {
  response.writeHead(status, {
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(value));
}

function serveFile(response, file) {
  if (file === undefined || !existsSync(file) || !statSync(file).isFile()) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }
  response.writeHead(200, {
    "cache-control": "no-store",
    "content-type": contentTypes[extname(file)] ?? "application/octet-stream",
    "x-content-type-options": "nosniff",
  });
  createReadStream(file).pipe(response);
}

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://${host}:${port}`);
  if (url.pathname === "/fixture/api/gifs") {
    const query = url.searchParams.get("q")?.toLocaleLowerCase() ?? "";
    const matches = query === "" || "browser provider wave".includes(query);
    sendJson(response, {
      items: matches
        ? [
            {
              type: "gif",
              id: "browser-gif-1",
              provider: "fixture",
              name: "Browser provider wave",
              alt: "Browser provider wave",
              previewUrl: "/fixture/media/demo.svg",
              thumbnailUrl: "/fixture/media/demo.svg",
              url: "/fixture/media/demo.svg",
              width: 160,
              height: 120,
            },
          ]
        : [],
      hasMore: false,
    });
    return;
  }
  if (url.pathname === "/fixture/media/demo.svg") {
    response.writeHead(200, {
      "cache-control": "public, max-age=60",
      "content-type": "image/svg+xml; charset=utf-8",
      "x-content-type-options": "nosniff",
    });
    response.end(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 120"><rect width="160" height="120" rx="20" fill="#7c3aed"/><circle cx="52" cy="58" r="12" fill="#fef08a"/><circle cx="108" cy="58" r="12" fill="#fef08a"/><path d="M45 84 Q80 106 115 84" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round"/></svg>',
    );
    return;
  }
  if (url.pathname === "/" || url.pathname === "/index.html") {
    serveFile(response, resolve(fixtureRoot, "index.html"));
    return;
  }
  if (url.pathname.startsWith("/fixture/")) {
    serveFile(
      response,
      safeFile(fixtureRoot, url.pathname.slice("/fixture".length)),
    );
    return;
  }
  const distributionPrefix = "/npm/super-media-picker@candidate/dist/browser/";
  if (url.pathname.startsWith(distributionPrefix)) {
    serveFile(
      response,
      safeFile(
        browserDistribution,
        url.pathname.slice(distributionPrefix.length - 1),
      ),
    );
    return;
  }
  response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
  response.end("Not found");
});

server.listen(port, host, () => {
  console.log(`Browser SDK fixture listening on http://${host}:${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => server.close(() => process.exit(0)));
}
