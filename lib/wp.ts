/**
 * WordPress REST API integration.
 * Uses Basic Auth with WP_USERNAME + WP_APP_PASSWORD environment variables.
 */

export interface WpPostInput {
  title: string;
  content: string; // HTML
  status?: "draft" | "publish" | "future";
  date?: string; // ISO 8601 for scheduled posts
  categories?: number[];
  tags?: number[];
  slug?: string;     // URLスラッグ（英数推奨）
  excerpt?: string;  // 抜粋＝メタディスクリプション
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
    ...(input.categories?.length ? { categories: input.categories } : {}),
    ...(input.tags?.length ? { tags: input.tags } : {}),
    ...(input.slug ? { slug: input.slug } : {}),
    ...(input.excerpt ? { excerpt: input.excerpt } : {}),
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
 * 任意の画像ファイルをWPメディアにアップロードし、ID と公開URL を返す。
 */
export async function uploadImage(buffer: Buffer, filename: string, mime: string): Promise<{ id: number; url: string }> {
  const base = getWpBase();
  const auth = getAuthHeader();
  const formData = new FormData();
  formData.append("file", new Blob([new Uint8Array(buffer)], { type: mime || "image/jpeg" }), filename);
  const res = await fetch(`${base}/?rest_route=/wp/v2/media`, {
    method: "POST",
    headers: { Authorization: auth, "Content-Disposition": `attachment; filename="${filename}"` },
    body: formData,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`WordPress image upload error ${res.status}: ${text}`);
  }
  const data = await res.json() as { id: number; source_url?: string };
  return { id: data.id, url: data.source_url ?? "" };
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

interface WpTerm { id: number; name: string; slug: string; count: number; }

export interface WpPostSummary {
  id: number;
  title: string;
  link: string;
  status: string;
  date: string;
}

/**
 * WordPress の投稿一覧を取得する（最大100件）。
 * context=edit + 認証で下書き含む全ステータスを取得。
 */
export async function listWpPosts(): Promise<WpPostSummary[]> {
  const base = getWpBase();
  const auth = getAuthHeader();
  const url = `${base}/?rest_route=/wp/v2/posts&per_page=100&status=any&context=edit&orderby=date&order=desc`;
  const res = await fetch(url, { headers: { Authorization: auth } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`WordPress listPosts error ${res.status}: ${text}`);
  }
  const rows = await res.json() as Array<{
    id: number;
    title?: { rendered?: string; raw?: string };
    link?: string;
    status?: string;
    date?: string;
  }>;
  return rows.map(p => ({
    id: p.id,
    title: (p.title?.raw || p.title?.rendered || "(無題)").replace(/<[^>]+>/g, "").trim(),
    link: p.link ?? "",
    status: p.status ?? "",
    date: p.date ?? "",
  }));
}

/**
 * WordPress の投稿1件の本文(HTML)とタイトルを取得する。
 */
export async function getWpPost(postId: number): Promise<{ title: string; contentHtml: string }> {
  const base = getWpBase();
  const auth = getAuthHeader();
  const url = `${base}/?rest_route=/wp/v2/posts/${postId}&context=edit`;
  const res = await fetch(url, { headers: { Authorization: auth } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`WordPress getPost error ${res.status}: ${text}`);
  }
  const p = await res.json() as {
    title?: { rendered?: string; raw?: string };
    content?: { rendered?: string; raw?: string };
  };
  return {
    title: (p.title?.raw || p.title?.rendered || "").replace(/<[^>]+>/g, "").trim(),
    contentHtml: p.content?.raw || p.content?.rendered || "",
  };
}

/**
 * 既存WP投稿の本文（とタイトル）を更新する。公開状態は維持される。
 */
export async function updatePostContent(
  postId: number, input: { title?: string; content: string; excerpt?: string }
): Promise<void> {
  const base = getWpBase();
  const auth = getAuthHeader();
  const res = await fetch(`${base}/?rest_route=/wp/v2/posts/${postId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: auth },
    body: JSON.stringify({
      content: input.content,
      ...(input.title ? { title: input.title } : {}),
      ...(input.excerpt ? { excerpt: input.excerpt } : {}),
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`WordPress updatePostContent error ${res.status}: ${text}`);
  }
}

/**
 * 既存WP投稿のカテゴリ・タグを更新する。
 */
export async function updatePostTaxonomy(
  postId: number, categories: number[], tags: number[]
): Promise<void> {
  const base = getWpBase();
  const auth = getAuthHeader();
  const res = await fetch(`${base}/?rest_route=/wp/v2/posts/${postId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: auth },
    body: JSON.stringify({
      ...(categories.length ? { categories } : {}),
      ...(tags.length ? { tags } : {}),
    }),
  });
  if (!res.ok) {
    console.warn(`[taxonomy] update post ${postId} failed ${res.status}: ${await res.text()}`);
  }
}

/**
 * WPの既存カテゴリー一覧を取得する（最大100件）。
 */
export async function getWpCategories(): Promise<WpTerm[]> {
  const base = getWpBase();
  const auth = getAuthHeader();
  const res = await fetch(`${base}/?rest_route=/wp/v2/categories&per_page=100`, {
    headers: { Authorization: auth },
  });
  if (!res.ok) return [];
  return res.json() as Promise<WpTerm[]>;
}

/**
 * WPの既存タグ一覧を取得する（最大100件）。
 */
export async function getWpTags(): Promise<WpTerm[]> {
  const base = getWpBase();
  const auth = getAuthHeader();
  const res = await fetch(`${base}/?rest_route=/wp/v2/tags&per_page=100`, {
    headers: { Authorization: auth },
  });
  if (!res.ok) return [];
  return res.json() as Promise<WpTerm[]>;
}

/**
 * カテゴリ名で既存カテゴリを検索し、なければ作成してIDを返す。
 * findOrCreateTag と同じく共通の認証ヘルパーを使う。
 */
export async function findOrCreateCategory(name: string): Promise<number | null> {
  const base = getWpBase();
  const auth = getAuthHeader();

  // まず既存カテゴリを検索（名前一致）
  const searchRes = await fetch(
    `${base}/?rest_route=/wp/v2/categories&search=${encodeURIComponent(name)}&per_page=10`,
    { headers: { Authorization: auth } }
  );
  if (searchRes.ok) {
    const found = (await searchRes.json()) as WpTerm[];
    const exact = found.find(c => c.name === name);
    if (exact) return exact.id;
  }

  // 無ければ作成
  const createRes = await fetch(`${base}/?rest_route=/wp/v2/categories`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: auth },
    body: JSON.stringify({ name }),
  });
  if (!createRes.ok) {
    console.warn(`[category] create failed ${createRes.status}: ${await createRes.text()}`);
    return null;
  }
  const created = (await createRes.json()) as WpTerm;
  return created.id ?? null;
}

/**
 * タグ名で既存タグを検索し、なければ作成してIDを返す。
 */
export async function findOrCreateTag(name: string): Promise<number | null> {
  const base = getWpBase();
  const auth = getAuthHeader();

  // まず既存タグを検索
  const searchRes = await fetch(
    `${base}/?rest_route=/wp/v2/tags&search=${encodeURIComponent(name)}&per_page=5`,
    { headers: { Authorization: auth } }
  );
  if (searchRes.ok) {
    const found = (await searchRes.json()) as WpTerm[];
    const exact = found.find(t => t.name === name || t.slug === name.toLowerCase().replace(/\s+/g, "-"));
    if (exact) return exact.id;
  }

  // 存在しなければ作成
  const createRes = await fetch(`${base}/?rest_route=/wp/v2/tags`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: auth },
    body: JSON.stringify({ name }),
  });
  if (!createRes.ok) return null;
  const created = (await createRes.json()) as WpTerm;
  return created.id ?? null;
}

/**
 * 記事タイトル・キーワードに最も合うカテゴリーIDを返す。
 * マッチしない場合は null（未分類のまま）。
 */
export function pickBestCategory(
  categories: WpTerm[],
  title: string,
  keyword: string | null | undefined
): number | null {
  if (!categories.length) return null;
  const text = `${title} ${keyword ?? ""}`.toLowerCase();

  // キーワードマッチング（部分一致でスコアリング）
  let bestId: number | null = null;
  let bestScore = 0;
  for (const cat of categories) {
    const catName = cat.name.toLowerCase();
    let score = 0;
    if (text.includes(catName)) score += 3;
    // 日本語キーワードとカテゴリ名の部分一致
    for (const word of catName.split(/[\s・/]/)) {
      if (word.length >= 2 && text.includes(word)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestId = cat.id;
    }
  }
  return bestScore > 0 ? bestId : null;
}

/**
 * Injects rel="sponsored nofollow" into all <a> tags for affiliate compliance.
 */
export function injectAffiliateRel(html: string): string {
  // rel が既に付いているリンクは上書きしない（wrapAffiliate で付与済みのCTAボタンを壊さない）
  return html.replace(/<a ([^>]*?)>/gi, (match, attrs: string) => {
    if (/\brel=/i.test(attrs)) return match; // 既に rel あり → そのまま
    return `<a rel="nofollow sponsored" ${attrs}>`;
  });
}
