import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// アイキャッチ生成の診断用エンドポイント。
// 成功すれば PNG を返し、失敗すれば実際のエラー全文を JSON で返す。
export async function GET() {
  const steps: string[] = [];
  try {
    steps.push("start");

    const { generateEyecatchSvg } = await import("@/lib/eyecatch");
    const svg = generateEyecatchSvg("テスト用タイトル日本語サンプル", "T6", {
      keyword: "iDeCo 節税",
      description: "これは診断用のテキストです",
    });
    steps.push(`svg generated (${svg.length} chars)`);

    // resvg のネイティブバイナリが読めるか
    const resvgMod = await import("@resvg/resvg-js");
    steps.push("@resvg/resvg-js imported ok");

    // フォントデータが読めるか
    const fontData = await import("@/lib/fonts/font-data");
    steps.push(
      `font-data imported: jp=${fontData.FONT_JP_BASE64?.length ?? 0}, lat=${fontData.FONT_LAT_BASE64?.length ?? 0}`
    );

    // /tmp に書けるか
    const { writeFileSync, existsSync } = await import("fs");
    try {
      writeFileSync("/tmp/_diag_test.txt", "ok");
      steps.push(`/tmp writable: ${existsSync("/tmp/_diag_test.txt")}`);
    } catch (e) {
      steps.push(`/tmp write FAILED: ${e instanceof Error ? e.message : String(e)}`);
    }

    // 実際にレンダリング
    const { generateEyecatchPng } = await import("@/lib/eyecatch");
    const png = await generateEyecatchPng("テスト用タイトル日本語サンプル", "T6", {
      keyword: "iDeCo 節税",
      description: "これは診断用のテキストです",
    });
    steps.push(`png rendered (${png.length} bytes)`);

    // 成功 → PNG を返す
    return new NextResponse(new Uint8Array(png), {
      headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        steps,
        error: e instanceof Error ? e.message : String(e),
        stack: e instanceof Error ? e.stack : undefined,
      },
      { status: 500 }
    );
  }
}
