import { NextResponse } from "next/server";
import { getPageViews, lookupViews } from "@/lib/analytics";
import { listWpPosts } from "@/lib/wp";

export const dynamic = "force-dynamic";

// GA4連携の診断。認証・プロパティID・パス照合の状況を事実で返す。
export async function GET() {
  const diag: Record<string, unknown> = {};

  // 環境変数の有無（値は出さない）
  diag.GA4_PROPERTY_ID_set = !!process.env.GA4_PROPERTY_ID;
  diag.GA4_PROPERTY_ID_format = /^\d+$/.test(process.env.GA4_PROPERTY_ID ?? "") ? "数字のみ(OK)" : "数字以外を含む/空(NG)";
  const saRaw = process.env.GA_SERVICE_ACCOUNT_JSON ?? "";
  diag.GA_SERVICE_ACCOUNT_JSON_set = !!saRaw;
  try {
    const sa = JSON.parse(saRaw) as { client_email?: string; private_key?: string };
    diag.sa_parseable = true;
    diag.sa_client_email = sa.client_email ?? "(無し)";
    diag.sa_has_private_key = !!sa.private_key;
  } catch {
    diag.sa_parseable = false;
  }

  // GA4 から取得
  const pv = await getPageViews(365);
  diag.configured = pv.configured;
  diag.error = pv.error ?? null;
  diag.ga_path_count = pv.byPath.size;
  // GA側の上位パス(最大10件)を見せる（WPリンクとの照合確認用）
  diag.ga_top_paths = [...pv.byPath.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([path, views]) => ({ path, views }));

  // WP記事と照合した結果
  try {
    const posts = await listWpPosts();
    diag.wp_post_count = posts.length;
    diag.match_sample = posts.slice(0, 10).map(p => ({
      id: p.id,
      title: p.title.slice(0, 24),
      link: p.link,
      matchedViews: lookupViews(pv, p.link, p.id),
    }));
  } catch (e) {
    diag.wp_error = e instanceof Error ? e.message : String(e);
  }

  return NextResponse.json(diag, { headers: { "Cache-Control": "no-store" } });
}
