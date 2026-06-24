/**
 * 記事テンプレート定義 T1〜T4
 * skeleton: Claude に渡す骨格プロンプト（プレースホルダ入り）
 * experienceSlots: 体験談・感想の入力項目
 * requiredVisuals: 生成すべき図表の種類 (kind: 'table'|'steps'|'chart')
 * ctaThemes: [AFFILIATE:xxx] に使う統制語彙
 */
export interface ArticleTemplate {
  id: "T1" | "T2" | "T3" | "T4";
  name: string;
  skeleton: string;
  experienceSlots: string[];
  requiredVisuals: { kind: "table" | "steps" | "chart"; label: string }[];
  ctaThemes: string[];
}

export const templates: Record<string, ArticleTemplate> = {
  T1: {
    id: "T1",
    name: "体験レビュー型",
    skeleton: `# {TITLE}

## はじめに
[EXPERIENCE:きっかけ・背景]

## 実際に使ってみた感想
[EXPERIENCE:使用感・メリット]

### デメリット・注意点
[EXPERIENCE:デメリット・気になった点]

## 費用・コスト感
[TABLE:費用比較]

## こんな人に向いている／向いていない
向いている人・向いていない人を箇条書きで整理する。

[AFFILIATE:{CTA_THEME}]

## まとめ
この記事はAIの下書きをもとに運営者が編集しています。金融商品への投資には元本割れのリスクがあります。`,
    experienceSlots: ["きっかけ・背景", "使用感・メリット", "デメリット・気になった点"],
    requiredVisuals: [
      { kind: "table", label: "費用比較" },
    ],
    ctaThemes: ["証券口座", "nisa", "ideco", "投資信託"],
  },

  T2: {
    id: "T2",
    name: "比較ランキング型",
    skeleton: `# {TITLE}

## この記事で比較するサービス
対象サービスを簡潔に紹介する。

## 比較表
[TABLE:サービス比較]

## 各サービスの詳細解説
### 1位
### 2位
### 3位

## 選び方のポイント
[EXPERIENCE:選び方のアドバイス]

[AFFILIATE:{CTA_THEME}]

## まとめ
この記事はAIの下書きをもとに運営者が編集しています。金融商品への投資には元本割れのリスクがあります。`,
    experienceSlots: ["選び方のアドバイス"],
    requiredVisuals: [
      { kind: "table", label: "サービス比較" },
    ],
    ctaThemes: ["証券口座", "nisa", "投資信託", "ipo"],
  },

  T3: {
    id: "T3",
    name: "始め方解説型",
    skeleton: `# {TITLE}

## はじめに
なぜこの方法を始めるべきか、背景と目的を説明する。

## ステップで分かる始め方
[STEPS:開設・登録手順]

## よくある疑問
[FAQ]

## 費用・リスク
リスクやコストについて正直に記載する。デメリットも必ず触れる。

[AFFILIATE:{CTA_THEME}]

## まとめ
この記事はAIの下書きをもとに運営者が編集しています。金融商品への投資には元本割れのリスクがあります。`,
    experienceSlots: [],
    requiredVisuals: [
      { kind: "steps", label: "開設・登録手順" },
    ],
    ctaThemes: ["証券口座", "nisa", "ideco"],
  },

  T4: {
    id: "T4",
    name: "決算個別株型",
    skeleton: `# {TITLE}

## 決算ハイライト
主要指標（売上・営業利益・EPS）を数値で整理する。数値は出典を明記し、捏造しない。

## 業績推移
[CHART:業績推移]

## セグメント別分析
各セグメントの状況を解説する。

## 株価への影響と考えられる要因
断定を避け「〜と考えられる」「〜の可能性がある」表現を使う。

[EXPERIENCE:筆者の見解・注目ポイント]

[AFFILIATE:{CTA_THEME}]

[FAQ]

## 免責事項
この記事はAIの下書きをもとに運営者が編集しています。特定銘柄への投資を推奨するものではなく、金融商品への投資には元本割れのリスクがあります。`,
    experienceSlots: ["筆者の見解・注目ポイント"],
    requiredVisuals: [
      { kind: "chart", label: "業績推移" },
    ],
    ctaThemes: ["個別株", "証券口座", "スイング"],
  },
};

export function getTemplate(id: string | null | undefined): ArticleTemplate | null {
  if (!id) return null;
  return templates[id] ?? null;
}
