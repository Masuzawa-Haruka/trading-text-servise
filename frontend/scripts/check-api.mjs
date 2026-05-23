import { readFileSync } from "node:fs";

loadDotEnvLocal();

const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001").replace(
  /\/$/,
  "",
);

const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 3000);

try {
  const response = await fetch(`${apiBaseUrl}/health`, { signal: controller.signal });
  if (!response.ok) {
    console.error(`API health check failed: ${response.status} ${response.statusText}`);
    process.exit(1);
  }
  console.log(`API is reachable: ${apiBaseUrl}`);
} catch (error) {
  const detail = error instanceof Error ? error.message : String(error);
  console.error(`API is not reachable: ${apiBaseUrl}`);
  console.error(detail);
  console.error("Start backend first, or set NEXT_PUBLIC_API_BASE_URL to the reachable backend URL.");
  process.exit(1);
} finally {
  clearTimeout(timeoutId);
}

function loadDotEnvLocal() {
  try {
    const env = readFileSync(".env.local", "utf8");
    for (const line of env.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex === -1) continue;

      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed
        .slice(separatorIndex + 1)
        .trim()
        .replace(/^['"]|['"]$/g, "");

      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env.local is optional; fall back to process.env/defaults.
  }
}
