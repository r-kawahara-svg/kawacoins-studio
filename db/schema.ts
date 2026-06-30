import { pgTable, uuid, text, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";

export const topics = pgTable("topics", {
  id: uuid("id").defaultRandom().primaryKey(),
  source: text("source").notNull(),          // 'earnings' | 'news' | 'market' | 'idea'
  title: text("title").notNull(),
  summary: text("summary"),
  sourceUrl: text("source_url"),
  keyword: text("keyword"),
  revenueScore: integer("revenue_score").default(3), // 1-5
  competition: text("competition").default("mid"),   // 'low' | 'mid' | 'high'
  status: text("status").notNull().default("new"),   // 'new'|'drafting'|'drafted'|'dismissed'
  template: text("template"),                        // 'T1'|'T2'|'T3'|'T4'|'T5'
  failureRaw: text("failure_raw"),                   // 失敗談の生データ（事実メモ）
  failureLesson: text("failure_lesson"),             // 今ならどうするか
  failureImages: jsonb("failure_images").default("[]"), // WP画像URL配列
  createdAt: timestamp("created_at").defaultNow(),
});

export const articles = pgTable("articles", {
  id: uuid("id").defaultRandom().primaryKey(),
  topicId: uuid("topic_id").references(() => topics.id),
  title: text("title").notNull(),
  bodyMd: text("body_md").notNull(),          // [JUDGMENT:*] プレースホルダ付きMarkdown
  aiModel: text("ai_model"),
  affiliateSlots: jsonb("affiliate_slots").default("[]"), // [{programId, anchorText, position}]
  template: text("template"),                            // 'T1'|'T2'|'T3'|'T4'|'T5'
  visuals: jsonb("visuals").default("[]"),               // [{id, kind, title, caption, source, ...}]
  faq: jsonb("faq").default("[]"),                       // [{question, answer}]
  status: text("status").notNull().default("gate"), // 'gate'|'review'|'approved'|'published'|'rejected'
  wpPostId: integer("wp_post_id"),
  scheduledAt: timestamp("scheduled_at"),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const judgments = pgTable("judgments", {
  id: uuid("id").defaultRandom().primaryKey(),
  articleId: uuid("article_id").references(() => articles.id).notNull(),
  tradeView: text("trade_view"),
  position: text("position"),
  uniqueTake: text("unique_take"),
  completed: boolean("completed").default(false),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const affiliatePrograms = pgTable("affiliate_programs", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  asp: text("asp").default("a8"),            // 'a8' | 'moshimo' | 'accesstrade'
  themes: jsonb("themes").default("[]"),     // ['nisa','個別株','ideco'] など
  htmlSnippet: text("html_snippet").notNull(),
  payout: integer("payout"),
  active: boolean("active").default(true),
  adType: text("ad_type").default("text"),   // 'text' | 'banner'
  note: text("note"),
  strength: text("strength"),                 // サービス固有の強み(USP) 例:「運営管理手数料がずっと無料」→CTAに表示
  priority: integer("priority").default(100), // 低いほど優先（10=主軸, 20=通常text, 50=banner, 90=暫定）
  createdAt: timestamp("created_at").defaultNow(),
});

// 体験入力テーブル（テンプレート記事のexperienceSlots対応）
export const experiences = pgTable("experiences", {
  id: uuid("id").defaultRandom().primaryKey(),
  articleId: uuid("article_id").references(() => articles.id).notNull(),
  label: text("label").notNull(),           // experienceSlots の各ラベル
  choice: text("choice"),                   // 選択肢（満足/ふつう/不満 等、任意）
  note: text("note"),                       // 自由記述（失敗の骨子等）
  completed: boolean("completed").default(false),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// API使用量トラッキング
export const apiUsage = pgTable("api_usage", {
  id: uuid("id").defaultRandom().primaryKey(),
  operation: text("operation").notNull(), // "generate_body"|"generate_visuals"|"generate_faq"|"rewrite_body"|"rewrite_visuals"|"rewrite_faq"|"suggest"
  model: text("model").notNull(),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  articleId: uuid("article_id"),  // nullable, 参照整合性なし（記事削除後も記録を残す）
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// アプリ設定（著者プロフィール等のkey-value）
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Phase 2用スキーマ（UIは作らない）
export const revenues = pgTable("revenues", {
  id: uuid("id").defaultRandom().primaryKey(),
  date: timestamp("date").notNull(),
  channel: text("channel").notNull(), // 'adsense' | 'affiliate'
  amount: integer("amount").notNull(),
  articleId: uuid("article_id").references(() => articles.id),
  programId: uuid("program_id").references(() => affiliatePrograms.id),
});
