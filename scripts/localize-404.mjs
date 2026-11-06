// Runs after `next build`. Cloudflare Pages serves the 404.html nearest to a missing path, but
// `trailingSlash` can only write <locale>/404/index.html, so this moves each one into place.
import { existsSync, renameSync, rmSync } from "node:fs";
import { join } from "node:path";

const OUT = "out";
const LOCALES = ["en", "nl", "es"];

const fail = (message) => {
  console.error(`localize-404: ${message}`);
  process.exit(1);
};

// Without this file Pages turns every unknown path into a 200, so a missing one must stop the build.
if (!existsSync(join(OUT, "404.html"))) fail("out/404.html is missing");

for (const locale of LOCALES) {
  const folder = join(OUT, locale, "404");
  const page = join(folder, "index.html");
  if (!existsSync(page)) fail(`${page} is missing`);

  renameSync(page, join(OUT, locale, "404.html"));
  rmSync(folder, { recursive: true });
}

console.log(`localize-404: wrote ${LOCALES.map((locale) => `${locale}/404.html`).join(", ")}`);
