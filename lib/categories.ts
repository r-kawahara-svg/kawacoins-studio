/**
 * 投資ブログの「世の中で重要なカテゴリ」基準と、自サイト記事の充足度分析。
 * 記事タイトルをキーワードで分類し、各カテゴリの本数と充足ステータスを返す。
 */

export interface RefCategory {
  key: string;
  label: string;
  keywords: string[];
  why: string; // なぜ重要か（不足時のヒント）
}

// 投資メディアで定番・収益貢献の高いカテゴリ群（世の中の基準）
export const REF_CATEGORIES: RefCategory[] = [
  { key: "nisa", label: "新NISA", keywords: ["nisa", "ニーサ", "つみたて", "積立投資"], why: "検索数が多く口座開設に直結。最重要テーマ" },
  { key: "ideco", label: "iDeCo・年金", keywords: ["ideco", "イデコ", "確定拠出", "年金", "老後"], why: "節税×老後資金で成約率が高い" },
  { key: "account", label: "証券口座・比較", keywords: ["証券", "口座", "sbi", "楽天証券", "松井", "マネックス", "比較"], why: "口座開設アフィリの本丸" },
  { key: "beginner", label: "始め方・初心者", keywords: ["始め方", "初心者", "入門", "やり方", "基礎", "とは"], why: "新規読者の入口。回遊の起点になる" },
  { key: "jpstock", label: "日本株・個別株", keywords: ["個別株", "日本株", "銘柄", "株式投資"], why: "中上級者の関心が高い" },
  { key: "usstock", label: "米国株・海外", keywords: ["米国株", "アメリカ", "s&p", "sp500", "海外", "etf", "オルカン"], why: "人気の伸長分野" },
  { key: "fund", label: "投資信託・インデックス", keywords: ["投資信託", "インデックス", "ファンド"], why: "初心者の主力商品で需要大" },
  { key: "dividend", label: "高配当・配当", keywords: ["高配当", "配当", "インカム"], why: "根強い人気テーマ" },
  { key: "earnings", label: "決算・業績分析", keywords: ["決算", "業績", "eps", "四半期"], why: "独自性を出しやすく差別化に有効" },
  { key: "risk", label: "失敗談・リスク管理", keywords: ["失敗", "損切り", "暴落", "リスク", "溶かし"], why: "一次体験で信頼を得やすい" },
  { key: "tax", label: "節税・税金", keywords: ["節税", "税金", "確定申告", "控除"], why: "実利が明確で読まれやすい" },
  { key: "fx", label: "FX・為替", keywords: ["fx", "為替", "ドル円", "円安", "円高"], why: "高単価案件が多い" },
  { key: "crypto", label: "暗号資産", keywords: ["暗号資産", "仮想通貨", "ビットコイン", "btc", "イーサ"], why: "新規層の流入が見込める" },
  { key: "macro", label: "市況・マクロ", keywords: ["相場", "市況", "金利", "日銀", "インフレ", "gdp"], why: "鮮度の高い集客記事になる" },
];

export interface CategoryStat {
  key: string;
  label: string;
  count: number;
  status: "充実" | "普通" | "不足" | "未着手";
  why: string;
}

function statusOf(count: number): CategoryStat["status"] {
  if (count === 0) return "未着手";
  if (count <= 2) return "不足";
  if (count <= 5) return "普通";
  return "充実";
}

// タイトル一覧をカテゴリ分類して充足度を返す（不足が上に来るよう並べる）
export function analyzeCategories(titles: string[]): CategoryStat[] {
  const lower = titles.map(t => t.toLowerCase());
  const stats = REF_CATEGORIES.map(c => {
    const count = lower.filter(t => c.keywords.some(k => t.includes(k))).length;
    return { key: c.key, label: c.label, count, status: statusOf(count), why: c.why };
  });
  const order: Record<CategoryStat["status"], number> = { 未着手: 0, 不足: 1, 普通: 2, 充実: 3 };
  return stats.sort((a, b) => order[a.status] - order[b.status] || b.count - a.count);
}
