import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getWpPost, updatePostContent } from "@/lib/wp";
import { trackUsage } from "@/lib/track-usage";

export const dynamic = "force-dynamic";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// アンカー(style等)を含む <div> ブロックを、入れ子を考慮して丸ごと除去する。
// 廃止した「運営者：カワコイン」ボックス等の旧ブロックを確実に消すために使う。
function stripDivContaining(html: string, marker: string, anchor: string): string {
  let result = html;
  for (let guard = 0; guard < 6; guard++) {
    const m = result.indexOf(marker);
    if (m === -1) break;
    // marker より前で anchor を含む <div を探す（ボックスの外枠）
    let start = -1;
    let from = m;
    while (true) {
      const idx = result.lastIndexOf("<div", from);
      if (idx === -1) break;
      const tagEnd = result.indexOf(">", idx);
      if (tagEnd !== -1 && result.slice(idx, tagEnd).includes(anchor)) { start = idx; break; }
      from = idx - 1;
    }
    // anchor が見つからなければ marker 直近の <div を使う
    if (start === -1) start = result.lastIndexOf("<div", m);
    if (start === -1) break;
    // <div>/</div> の対応を数えて閉じ位置を特定
    const re = /<div\b|<\/div>/gi;
    re.lastIndex = start;
    let depth = 0, end = -1, mm: RegExpExecArray | null;
    while ((mm = re.exec(result))) {
      if (mm[0].toLowerCase().startsWith("</")) { depth--; if (depth === 0) { end = re.lastIndex; break; } }
      else depth++;
    }
    if (end === -1) break;
    result = result.slice(0, start) + result.slice(end);
  }
  return result;
}

// 旧仕様の不要ブロックをまとめて除去
function stripLegacyBlocks(html: string): string {
  // 運営者ボックス（テーマ側に著者情報があるため廃止）
  let out = stripDivContaining(html, "運営者：カワコイン", "f7f8fa");
  // アフィリ開示文（不要）
  out = out.replace(/<p[^>]*>[^<]*アフィリエイト(パートナー|プログラム)[^<]*<\/p>\s*/gi, "");
  return out;
}

// WordPress の記事を直接読み込み、方針に沿って本文を書き直してWPに書き戻す。
// アプリDBを介さないので「連携切れ」が起きない。
export async function POST(request: NextRequest) {
  try {
    const { postId, direction } = await request.json() as { postId?: number; direction?: string };
    if (!postId || !direction?.trim()) {
      return NextResponse.json({ error: "postId と direction が必要です" }, { status: 400 });
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY 未設定" }, { status: 500 });
    }

    const wp = await getWpPost(postId);
    const title = wp.title;
    // 旧仕様の不要ブロック（運営者ボックス等）はAIに渡す前に除去
    const contentHtml = stripLegacyBlocks(wp.contentHtml);
    if (!contentHtml.trim()) {
      return NextResponse.json({ error: "記事本文が取得できませんでした" }, { status: 404 });
    }

    const currentYear = new Date().getFullYear();

    const systemPrompt = `あなたは投資ブログの編集者です。WordPress記事のHTML本文を、方針に沿って書き直します。

【絶対に守る出力ルール】
- 出力は記事本文のHTMLのみ。説明・前置き・コードフェンス(\`\`\`)は一切付けない。
- <a> リンク（href・rel属性）、<img>、計測ピクセル、style付きの<div>（CTAボタンや囲みボックス）は
  中身のテキストを除き、構造・属性・リンク先を一切変えない。新規追加もしない。
- ただし、同一のCTAボタン／広告ブロックが複数（重複して）ある場合は、1つだけ残して残りを削除してよい
  （リンク先・属性は保持したまま、重複分のみ除去）。
- 見出し(h2/h3)構成は維持する。マークダウン記法は使わずHTMLのまま。
- 事実・数値を捏造しない。断定的な投資助言（必ず儲かる等）にしない。

【年号ルール】現在は${currentYear}年。古い年号や「今年」「最新」は${currentYear}年基準に直す。
未確定の制度は「予定」「審議中」と明記し断定しない。`;

    const userPrompt = `記事タイトル: ${title}

【書き直しの方針（最優先）】
${direction}

【現在の本文HTML（これを上記方針で改善する）】
${contentHtml}`;

    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });
    void trackUsage({ operation: "wp_rewrite", model: "claude-sonnet-4-6", inputTokens: msg.usage.input_tokens, outputTokens: msg.usage.output_tokens });

    let newHtml = msg.content.filter(b => b.type === "text").map(b => (b as { text: string }).text).join("").trim();
    // 念のためコードフェンスを除去
    newHtml = newHtml.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim();
    // 出力にも旧ブロックが残っていれば最終除去（保険）
    newHtml = stripLegacyBlocks(newHtml);

    if (newHtml.length < 50) {
      return NextResponse.json({ error: "書き直し結果が短すぎます（中断）" }, { status: 500 });
    }

    await updatePostContent(postId, { content: newHtml });

    return NextResponse.json({ ok: true, postId, chars: newHtml.length });
  } catch (e) {
    console.error("[wp-rewrite] failed:", e instanceof Error ? e.stack ?? e.message : e);
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
