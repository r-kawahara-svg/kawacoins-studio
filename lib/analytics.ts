/**
 * Google Analytics (GA4) Data API 連携。
 * ページパス別の閲覧数(PV)を取得する。
 *
 * 必要な環境変数:
 *   GA4_PROPERTY_ID        … GA4 プロパティID（数字のみ。例: 123456789）
 *   GA_SERVICE_ACCOUNT_JSON … サービスアカウントのJSON文字列（GA4プロパティに閲覧権限を付与）
 */

export interface PageViews {
  // 正規化したパス(+クエリ) → PV
  byPath: Map<string, number>;
  configured: boolean;
  error?: string;
}

function normalizePath(p: string): string {
  try {
    let path = p;
    // フルURLならパス+クエリを取り出す
    if (/^https?:\/\//i.test(p)) {
      const u = new URL(p);
      path = u.pathname + u.search;
    }
    path = decodeURIComponent(path);
    if (path.length > 1) path = path.replace(/\/$/, ""); // 末尾スラッシュ除去
    return path.toLowerCase();
  } catch {
    return p.toLowerCase();
  }
}

let cached: { at: number; data: PageViews } | null = null;

// GA4 から直近 N 日のページPVを取得（5分キャッシュ）
export async function getPageViews(days = 365): Promise<PageViews> {
  const propertyId = process.env.GA4_PROPERTY_ID;
  const saJson = process.env.GA_SERVICE_ACCOUNT_JSON;
  if (!propertyId || !saJson) {
    return { byPath: new Map(), configured: false, error: "GA4_PROPERTY_ID / GA_SERVICE_ACCOUNT_JSON 未設定" };
  }

  if (cached && Date.now() - cached.at < 5 * 60 * 1000) return cached.data;

  try {
    const credentials = JSON.parse(saJson) as { client_email: string; private_key: string };
    const { BetaAnalyticsDataClient } = await import("@google-analytics/data");
    const client = new BetaAnalyticsDataClient({
      credentials: {
        client_email: credentials.client_email,
        private_key: credentials.private_key.replace(/\\n/g, "\n"),
      },
    });

    const [resp] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
      dimensions: [{ name: "pagePathPlusQueryString" }],
      metrics: [{ name: "screenPageViews" }],
      limit: 5000,
    });

    const byPath = new Map<string, number>();
    for (const row of resp.rows ?? []) {
      const path = row.dimensionValues?.[0]?.value ?? "";
      const views = Number(row.metricValues?.[0]?.value ?? "0");
      if (path) byPath.set(normalizePath(path), views);
    }
    const data: PageViews = { byPath, configured: true };
    cached = { at: Date.now(), data };
    return data;
  } catch (e) {
    return { byPath: new Map(), configured: true, error: e instanceof Error ? e.message : String(e) };
  }
}

// 記事のWPリンク(と投稿ID)からPVを引く。複数の候補パスで照合する。
export function lookupViews(pv: PageViews, link: string, postId: number): number | null {
  if (!pv.configured || pv.byPath.size === 0) return null;
  const candidates = new Set<string>();
  if (link) {
    candidates.add(normalizePath(link));
    try {
      const u = new URL(link);
      candidates.add(normalizePath(u.pathname));        // クエリ無し
      candidates.add(normalizePath(u.pathname + u.search));
    } catch { /* ignore */ }
  }
  // パーマリンク未設定サイト向け: /?p=ID
  candidates.add(normalizePath(`/?p=${postId}`));

  for (const c of candidates) {
    const v = pv.byPath.get(c);
    if (v != null) return v;
  }
  return null;
}
