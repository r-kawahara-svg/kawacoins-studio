import { config } from "dotenv";
config({ path: ".env.local" });

const BASE = (process.env.WP_BASE_URL ?? "").replace(/\/$/, "");
const AUTH = "Basic " + Buffer.from(`${process.env.WP_USERNAME}:${process.env.WP_APP_PASSWORD}`).toString("base64");
const postId = process.argv[2] ?? "961";

async function main() {
  const r = await fetch(`${BASE}/?rest_route=/wp/v2/posts/${postId}&context=edit`, {
    headers: { Authorization: AUTH },
  });
  const d = await r.json() as { content?: { raw?: string; rendered?: string } };
  const raw = d?.content?.raw ?? "";
  console.log("=== RAW CONTENT (first 3000 chars) ===");
  console.log(raw.slice(0, 3000));
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
