import { execSync } from "node:child_process";
import { existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const apiDir = resolve(root, "src/app/api");
const stashDir = resolve(root, ".static-stash/api");

if (!existsSync(apiDir)) {
  console.error("No API routes found to stash.");
  process.exit(1);
}

mkdirSync(dirname(stashDir), { recursive: true });
renameSync(apiDir, stashDir);
console.log("• API routes stashed (static export cannot include a server runtime).");

try {
  execSync("npx next build", {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, NEXT_PUBLIC_STORAGE: "local" },
  });
  console.log("• Static build finished. Upload the 'out' folder to GitHub Pages.");
} finally {
  if (existsSync(stashDir)) {
    renameSync(stashDir, apiDir);
    rmSync(resolve(root, ".static-stash"), { recursive: true, force: true });
    console.log("• API routes restored.");
  }
}
