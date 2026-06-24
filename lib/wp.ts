/**
 * WordPress REST API integration.
 * Uses Basic Auth with WP_USERNAME + WP_APP_PASSWORD environment variables.
 */

export interface WpPostInput {
  title: string;
  content: string; // HTML
  status?: "draft" | "publish" | "future";
  date?: string; // ISO 8601 for scheduled posts
}

export interface WpPostResult {
  id: number;
  link: string;
  status: string;
}

function getWpBase(): string {
  const base = process.env.WP_BASE_URL;
  if (!base) throw new Error("WP_BASE_URL is not set");
  return base.replace(/\/$/, "");
}

function getAuthHeader(): string {
  const username = process.env.WP_USERNAME;
  const password = process.env.WP_APP_PASSWORD;
  if (!username || !password) {
    throw new Error("WP_USERNAME or WP_APP_PASSWORD is not set");
  }
  return "Basic " + Buffer.from(`${username}:${password}`).toString("base64");
}

/**
 * Creates a draft post in WordPress and returns the post ID and link.
 */
export async function createDraftPost(input: WpPostInput): Promise<WpPostResult> {
  const base = getWpBase();
  const auth = getAuthHeader();

  const payload = {
    title: input.title,
    content: input.content,
    status: input.status ?? "draft",
    ...(input.date ? { date: input.date } : {}),
  };

  // kawacoins.com はパーマリンク未設定のため ?rest_route= 形式を使用
  const url = `${base}/?rest_route=/wp/v2/posts`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: auth,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`WordPress API error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as { id: number; link: string; status: string };
  return { id: data.id, link: data.link, status: data.status };
}

/**
 * Uploads a media file (PNG buffer) to WordPress and returns the media ID.
 */
export async function uploadMedia(png: Buffer, filename: string): Promise<number> {
  const base = getWpBase();
  const auth = getAuthHeader();

  const url = `${base}/?rest_route=/wp/v2/media`;
  const formData = new FormData();
  formData.append("file", new Blob([new Uint8Array(png)], { type: "image/png" }), filename);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: auth,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`WordPress media upload error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as { id: number };
  return data.id;
}

/**
 * Sets the featured_image (eyecatch) on a WordPress post.
 */
export async function setFeaturedMedia(postId: number, mediaId: number): Promise<void> {
  const base = getWpBase();
  const auth = getAuthHeader();

  const url = `${base}/?rest_route=/wp/v2/posts/${postId}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: auth,
    },
    body: JSON.stringify({ featured_media: mediaId }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`WordPress setFeaturedMedia error ${res.status}: ${text}`);
  }
}

/**
 * Injects rel="sponsored nofollow" into all <a> tags for affiliate compliance.
 */
export function injectAffiliateRel(html: string): string {
  return html.replace(/<a /g, '<a rel="sponsored nofollow" ');
}
