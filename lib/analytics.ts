/**
 * Google Analytics (GA4) Data API 連携。
 * ページパス別の指標（PV・ユーザー数・平均エンゲージ時間）を取得する。
 *
 * 必要な環境変数:
 *   GA4_PROPERTY_ID        … GA4 プロパティID（数字のみ。例: 123456789）
 *   GA_SERVICE_ACCOUNT_JSON … サービスアカウントのJSON文字列（GA4プロパティに閲覧権限を付与）
 */

export interface PageMetric {
  views: number;        // ページビュー
  users: number;        // ユーザー数
  engagementSec: number; // 1ユーザーあたり平均エンゲージ時間(秒)
}

export interface PageMetrics {
  byPath: Map<string, PageMetric>;
  configured: boolean;
  error?: string;
}

// 後方互換（PVのみ）
export interface PageViews {
  byPath: Map<string, number>;
  configured: boolean;
  error?: string;
}

function normalizePath(p: string): string {
  try {
    let path = p;
    if (/^https?:\/\//i.test(p)) {
      const u = new URL(p);
      path = u.pathname + u.search;
    }
    path = decodeURIComponent(path);
    if (path.length > 1) path = path.replace(/\/$/, "");
    return path.toLowerCase();
  } catch {
    return p.toLowerCase();
  }
}

let cached: { at: number; data: PageMetrics } | null = null;

export async function getPageMetrics(days = 365): Promise<PageMetrics> {
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
      metrics: [
        { name: "screenPageViews" },
        { name: "totalUsers" },
        { name: "userEngagementDuration" }, // 全体の合計秒
      ],
      limit: 5000,
    });

    const byPath = new Map<string, PageMetric>();
    for (const row of resp.rows ?? []) {
      const path = row.dimensionValues?.[0]?.value ?? "";
      if (!path) continue;
      const views = Number(row.metricValues?.[0]?.value ?? "0");
      const users = Number(row.metricValues?.[1]?.value ?? "0");
      const engTotal = Number(row.metricValues?.[2]?.value ?? "0");
      const engagementSec = users > 0 ? Math.round(engTotal / users) : 0;
      byPath.set(normalizePath(path), { views, users, engagementSec });
    }
    const data: PageMetrics = { byPath, configured: true };
    cached = { at: Date.now(), data };
    return data;
  } catch (e) {
    return { byPath: new Map(), configured: true, error: e instanceof Error ? e.message : String(e) };
  }
}

export interface TrafficTrend {
  configured: boolean;
  error?: string;
  days: number;
  current: { views: number; users: number };
  previous: { views: number; users: number };
}

// 直近N日 と その前N日 のサイト全体のPV/ユーザーを取得して比較する
export async function getTrafficTrend(days = 28): Promise<TrafficTrend> {
  const empty: TrafficTrend = { configured: false, days, current: { views: 0, users: 0 }, previous: { views: 0, users: 0 } };
  const propertyId = process.env.GA4_PROPERTY_ID;
  const saJson = process.env.GA_SERVICE_ACCOUNT_JSON;
  if (!propertyId || !saJson) return { ...empty, error: "GA4 未設定" };

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
      dateRanges: [
        { startDate: `${days - 1}daysAgo`, endDate: "today" },          // date_range_0 = 直近
        { startDate: `${days * 2 - 1}daysAgo`, endDate: `${days}daysAgo` }, // date_range_1 = その前
      ],
      metrics: [{ name: "screenPageViews" }, { name: "totalUsers" }],
    });
    const out = { current: { views: 0, users: 0 }, previous: { views: 0, users: 0 } };
    for (const row of resp.rows ?? []) {
      const dr = row.dimensionValues?.[0]?.value;
      const views = Number(row.metricValues?.[0]?.value ?? 0);
      const users = Number(row.metricValues?.[1]?.value ?? 0);
      if (dr === "date_range_0") out.current = { views, users };
      else if (dr === "date_range_1") out.previous = { views, users };
    }
    return { configured: true, days, ...out };
  } catch (e) {
    return { ...empty, configured: true, error: e instanceof Error ? e.message : String(e) };
  }
}

export interface TodayActivity {
  configured: boolean;
  error?: string;
  users: number;
  views: number;
  pages: { title: string; views: number; users: number }[];
}

// 今日のアクセス状況（訪問ユーザー数・PV・ページ別内訳）
export async function getTodayActivity(): Promise<TodayActivity> {
  const empty: TodayActivity = { configured: false, users: 0, views: 0, pages: [] };
  const propertyId = process.env.GA4_PROPERTY_ID;
  const saJson = process.env.GA_SERVICE_ACCOUNT_JSON;
  if (!propertyId || !saJson) return { ...empty, error: "GA4 未設定" };

  try {
    const credentials = JSON.parse(saJson) as { client_email: string; private_key: string };
    const { BetaAnalyticsDataClient } = await import("@google-analytics/data");
    const client = new BetaAnalyticsDataClient({
      credentials: { client_email: credentials.client_email, private_key: credentials.private_key.replace(/\\n/g, "\n") },
    });
    const property = `properties/${propertyId}`;
    const today = [{ startDate: "today", endDate: "today" }];

    // ① 今日の合計（ユニークユーザー・PV）
    const [totals] = await client.runReport({
      property, dateRanges: today,
      metrics: [{ name: "totalUsers" }, { name: "screenPageViews" }],
    });
    const users = Number(totals.rows?.[0]?.metricValues?.[0]?.value ?? 0);
    const views = Number(totals.rows?.[0]?.metricValues?.[1]?.value ?? 0);

    // ② 今日のページ別内訳
    const [byPage] = await client.runReport({
      property, dateRanges: today,
      dimensions: [{ name: "pageTitle" }],
      metrics: [{ name: "screenPageViews" }, { name: "totalUsers" }],
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
      limit: 20,
    });
    const pages = (byPage.rows ?? []).map(r => ({
      title: r.dimensionValues?.[0]?.value ?? "(不明)",
      views: Number(r.metricValues?.[0]?.value ?? 0),
      users: Number(r.metricValues?.[1]?.value ?? 0),
    }));

    return { configured: true, users, views, pages };
  } catch (e) {
    return { ...empty, configured: true, error: e instanceof Error ? e.message : String(e) };
  }
}

function candidatePaths(link: string, postId: number): string[] {
  const set = new Set<string>();
  if (link) {
    set.add(normalizePath(link));
    try {
      const u = new URL(link);
      set.add(normalizePath(u.pathname));
      set.add(normalizePath(u.pathname + u.search));
    } catch { /* ignore */ }
  }
  set.add(normalizePath(`/?p=${postId}`));
  return [...set];
}

export function lookupMetric(pm: PageMetrics, link: string, postId: number): PageMetric | null {
  if (!pm.configured || pm.byPath.size === 0) return null;
  for (const c of candidatePaths(link, postId)) {
    const v = pm.byPath.get(c);
    if (v != null) return v;
  }
  return null;
}

// ── 後方互換: PVのみ版（リライト画面で使用） ──────────────────
export async function getPageViews(days = 365): Promise<PageViews> {
  const pm = await getPageMetrics(days);
  const byPath = new Map<string, number>();
  for (const [k, v] of pm.byPath) byPath.set(k, v.views);
  return { byPath, configured: pm.configured, error: pm.error };
}

export function lookupViews(pv: PageViews, link: string, postId: number): number | null {
  if (!pv.configured || pv.byPath.size === 0) return null;
  for (const c of candidatePaths(link, postId)) {
    const v = pv.byPath.get(c);
    if (v != null) return v;
  }
  return null;
}
