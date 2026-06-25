/**
 * 記事テンプレート定義 T1〜T5
 * skeleton: Claude に渡す骨格プロンプト（プレースホルダ入り）
 * experienceSlots: 体験談・感想の入力項目（必須入力）
 * requiredVisuals: 生成すべき図表の種類
 * ctaThemes: [AFFILIATE:xxx] に使う統制語彙
 */
export interface ArticleTemplate {
  id: "T1" | "T2" | "T3" | "T4" | "T5" | "T6";
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
金融商品への投資には元本割れのリスクがあります。`,
    experienceSlots: ["きっかけ・背景", "使用感・メリット", "デメリット・気になった点"],
    requiredVisuals: [{ kind: "table", label: "費用比較" }],
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
金融商品への投資には元本割れのリスクがあります。`,
    experienceSlots: ["選び方のアドバイス"],
    requiredVisuals: [{ kind: "table", label: "サービス比較" }],
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
金融商品への投資には元本割れのリスクがあります。`,
    experienceSlots: [],
    requiredVisuals: [{ kind: "steps", label: "開設・登録手順" }],
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
特定銘柄への投資を推奨するものではなく、金融商品への投資には元本割れのリスクがあります。`,
    experienceSlots: ["筆者の見解・注目ポイント"],
    requiredVisuals: [{ kind: "chart", label: "業績推移" }],
    ctaThemes: ["個別株", "証券口座", "スイング"],
  },

  T5: {
    id: "T5",
    name: "失敗談・教訓型",
    skeleton: `# {TITLE}

## はじめに ― 先に結末をお伝えします
[EXPERIENCE:失敗の骨子]

> **要点まとめ**: AIが骨子から教訓を整理します。

## 何が起きたか（時系列）
[STEPS:時系列]

## 何が悪かったか（敗因の分解）
[TABLE:敗因分解]

## ここから学んだこと
[EXPERIENCE:今ならどうするか]

## どう改善したか
改善後の行動・考え方の変化を記載する。

[AFFILIATE:{CTA_THEME}]

## 同じ失敗を避けるには
[FAQ]

## まとめ
特定銘柄への投資を推奨するものではなく、金融商品への投資には元本割れのリスクがあります。`,
    experienceSlots: ["失敗の骨子", "今ならどうするか"],
    requiredVisuals: [
      { kind: "steps", label: "時系列" },
      { kind: "table", label: "敗因分解" },
    ],
    ctaThemes: ["証券口座", "スイング", "個別株"],
  },

  T6: {
    id: "T6",
    name: "制度解説型",
    skeleton: `# {TITLE}

## はじめに
なぜこの制度・仕組みを今知っておくべきか、読者のメリットを先に伝える。

## 基本的な仕組み
制度の概要・特徴・対象者を分かりやすく解説する。数値・条件は正確に記載し、捏造しない。

[TABLE:制度概要]

## メリットと注意点
メリットを整理した上で、見落とされがちなデメリット・注意点も正直に書く。

## よくある疑問
[FAQ]

## 今すぐ動くべき理由
制度を知った「今」が行動のタイミングである理由を伝える。
「口座開設だけ先にしておけばOK」「後からでも銘柄は変えられる」など、読者のハードルを下げる視点で書く。
タイミング感・先行者メリット・機会損失の観点から、行動を自然に後押しする。

[AFFILIATE:{CTA_THEME}]

## まとめ
金融商品への投資には元本割れのリスクがあります。`,
    experienceSlots: [],
    requiredVisuals: [{ kind: "table", label: "制度概要" }],
    ctaThemes: ["証券口座", "nisa", "ideco", "投資信託"],
  },
};

export function getTemplate(id: string | null | undefined): ArticleTemplate | null {
  if (!id) return null;
  return templates[id] ?? null;
}
