/**
 * Runner for scripts/eligibility-features.check.ts.
 * Bundles the checks with esbuild (already in node_modules) so the app's
 * extensionless imports and `@/` aliases resolve exactly as they do in the build.
 */
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { rmSync } from "node:fs";

const here = dirname(fileURLToPath(import.meta.url));
const outfile = join(here, ".eligibility-features.tmp.mjs");

await build({
  entryPoints: [join(here, "eligibility-features.check.ts")],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile,
  logLevel: "error",
});

process.on("exit", () => { try { rmSync(outfile, { force: true }); } catch {} });
await import(`file://${outfile}`);
