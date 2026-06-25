import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// アイキャッチ生成の診断エンドポイント。
// テキストは opentype.js でパス化され SVG に焼き込まれる方式。
// 既定では事実を JSON で返す。?png=1 で実際の PNG を返す。
export async function GET(req: Request) {
  const wantPng = new URL(req.url).searchParams.get("png") === "1";
  const diag: Record<string, unknown> = {};

  try {
    const { generateEyecatchSvg, generateEyecatchPng } = await import("@/lib/eyecatch");

    const svg = generateEyecatchSvg("文字テスト日本語サンプル", "T6", {
      keyword: "iDeCo 節税",
      description: "これは診断用のテキストです",
    });
    diag.svgLen = svg.length;
    // テキストはパス化されているので <path> 数で文字が生成されたか判定
    diag.pathCount = (svg.match(/<path /g) ?? []).length;
    diag.textRendered = diag.pathCount as number > 5;

    const png = await generateEyecatchPng("文字テスト日本語サンプル", "T6", {
      keyword: "iDeCo 節税",
      description: "これは診断用のテキストです",
    });
    diag.pngBytes = png.length;

    if (wantPng) {
      return new NextResponse(new Uint8Array(png), {
        headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
      });
    }

    return NextResponse.json({ ok: true, ...diag }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json(
      { ok: false, ...diag, error: e instanceof Error ? e.message : String(e), stack: e instanceof Error ? e.stack : undefined },
      { status: 500 }
    );
  }
}
