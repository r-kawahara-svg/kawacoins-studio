import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getWpPost, updatePostContent } from "@/lib/wp";
import { trackUsage } from "@/lib/track-usage";

export const dynamic = "force-dynamic";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

    const { title, contentHtml } = await getWpPost(postId);
    if (!contentHtml.trim()) {
      return NextResponse.json({ error: "記事本文が取得できませんでした" }, { status: 404 });
    }

    const currentYear = new Date().getFullYear();

    const systemPrompt = `あなたは投資ブログの編集者です。WordPress記事のHTML本文を、方針に沿って書き直します。

【絶対に守る出力ルール】
- 出力は記事本文のHTMLのみ。説明・前置き・コードフェンス(\`\`\`)は一切付けない。
- <a> リンク（href・rel属性）、<img>、計測ピクセル、style付きの<div>（CTAボタンや囲みボックス）は
  中身のテキストを除き、構造・属性・リンク先を一切変えない。削除も新規追加もしない。
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
