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
  createdAt: timestamp("created_at").defaultNow(),
});

export const articles = pgTable("articles", {
  id: uuid("id").defaultRandom().primaryKey(),
  topicId: uuid("topic_id").references(() => topics.id),
  title: text("title").notNull(),
  bodyMd: text("body_md").notNull(),          // [JUDGMENT:*] プレースホルダ付きMarkdown
  aiModel: text("ai_model"),
  affiliateSlots: jsonb("affiliate_slots").default("[]"), // [{programId, anchorText, position}]
  status: text("status").notNull().default("gate"), // 'draft'|'gate'|'scheduled'|'published'
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
  createdAt: timestamp("created_at").defaultNow(),
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
