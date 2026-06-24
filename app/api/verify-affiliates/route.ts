/**
 * GET /api/verify-affiliates — アフィリ置換ロジック検証（開発用）
 * action=map   : テーマ→広告の解決マップを返す
 * action=replace: ダミー本文の置換結果を返す
 */
import { NextRequest, NextResponse } from "next/server";
import { resolveAllThemes, replaceAffiliatePlaceholders } from "@/lib/affiliate";

const DUMMY_BODY = `
# テスト記事

本文...

[AFFILIATE:スイング]

iDeCoの節税効果について。

[AFFILIATE:ideco]

この記事はAIの下書きをもとに運営者が編集しています
`;

export async function GET(req: NextRequest) {
  const action = new URL(req.url).searchParams.get("action") ?? "map";

  if (action === "map") {
    const map = await resolveAllThemes();
    return NextResponse.json(map);
  }

  if (action === "replace") {
    const replaced = await replaceAffiliatePlaceholders(DUMMY_BODY);
    const hasNoPlaceholder = !replaced.includes("[AFFILIATE:");
    const hasWrapper = replaced.includes("overflow-x:auto");
    const hasSponsoredRel = replaced.includes('rel="sponsored nofollow"');
    const hasMatsuiText = replaced.includes("px.a8.net");
    return NextResponse.json({
      replaced,
      checks: {
        noPlaceholderRemaining: hasNoPlaceholder,
        hasResponsiveWrapper: hasWrapper,
        hasSponsoredNofollow: hasSponsoredRel,
        hasA8Link: hasMatsuiText,
      },
    });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
