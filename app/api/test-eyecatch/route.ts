import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// アイキャッチ生成の診断エンドポイント。
// 既定では事実(フォント整合性・描画判定)を JSON で返す。
// ?png=1 を付けると本番の実際のアイキャッチ PNG を返す。
export async function GET(req: Request) {
  const wantPng = new URL(req.url).searchParams.get("png") === "1";
  const diag: Record<string, unknown> = {};

  try {
    const { generateEyecatchSvg } = await import("@/lib/eyecatch");
    const { FONT_JP_BASE64, FONT_LAT_BASE64 } = await import("@/lib/fonts/font-data");
    const { Resvg } = await import("@resvg/resvg-js");

    // resvg バージョン
    try {
      const pkg = await import("@resvg/resvg-js/package.json");
      diag.resvgVersion = (pkg as { version?: string }).version ?? (pkg as { default?: { version?: string } }).default?.version;
    } catch { diag.resvgVersion = "unknown"; }

    // バンドルされた base64 が本番で壊れていないか (woff2 マジック = wOF2)
    const jpBuf = Buffer.from(FONT_JP_BASE64, "base64");
    const latBuf = Buffer.from(FONT_LAT_BASE64, "base64");
    diag.jpBase64Len = FONT_JP_BASE64.length;
    diag.jpBufferLen = jpBuf.length;
    diag.jpMagicHex = jpBuf.subarray(0, 4).toString("hex");
    diag.jpMagicAscii = jpBuf.subarray(0, 4).toString("latin1");
    diag.jpMagicValid = jpBuf.subarray(0, 4).toString("latin1") === "wOF2";

    const svg = generateEyecatchSvg("文字テスト日本語サンプル", "T6", {
      keyword: "iDeCo 節税",
      description: "これは診断用のテキストです",
    });
    diag.svgLen = svg.length;

    const fontBuffers = [jpBuf, latBuf];

    // A) fontBuffers ありで描画
    let pngWith: Buffer | null = null;
    try {
      const r = new Resvg(svg, {
        font: { fontBuffers, loadSystemFonts: false, defaultFontFamily: "Noto Sans JP", sansSerifFamily: "Noto Sans JP" } as never,
      });
      pngWith = Buffer.from(r.render().asPng());
      diag.pngWithFonts = pngWith.length;
    } catch (e) {
      diag.pngWithFontsError = e instanceof Error ? e.message : String(e);
    }

    // B) フォント無しで描画 (基準。A と同サイズ = 文字が出ていない証拠)
    try {
      const r = new Resvg(svg, {
        font: { loadSystemFonts: false, defaultFontFamily: "Noto Sans JP" } as never,
      });
      diag.pngNoFonts = Buffer.from(r.render().asPng()).length;
    } catch (e) {
      diag.pngNoFontsError = e instanceof Error ? e.message : String(e);
    }

    // 判定: fontBuffers ありの方が明確に大きければ文字が描画されている
    if (typeof diag.pngWithFonts === "number" && typeof diag.pngNoFonts === "number") {
      diag.textRendered = (diag.pngWithFonts as number) > (diag.pngNoFonts as number) + 5000;
    }

    if (wantPng && pngWith) {
      return new NextResponse(new Uint8Array(pngWith), {
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
