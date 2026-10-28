import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "out");
const port = Number(process.env.PORT ?? 4173);
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

if (!existsSync(root)) {
  console.error("No 'out' folder found. Run `npm run build:static` first.");
  process.exit(1);
}

createServer((request, response) => {
  const url = decodeURIComponent((request.url ?? "/").split("?")[0]);
  let filePath = join(root, url);
  if (existsSync(filePath) && statSync(filePath).isDirectory()) filePath = join(filePath, "index.html");
  if (!existsSync(filePath)) {
    // Mirror GitHub Pages behaviour: unknown paths are a 404, not the homepage.
    response.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    response.end(readFileSync(join(root, "404.html")));
    return;
  }
  const type = types[extname(filePath)] ?? "application/octet-stream";
  response.writeHead(200, { "Content-Type": type });
  response.end(readFileSync(filePath));
}).listen(port, () => console.log(`Static preview running at http://127.0.0.1:${port}`));
