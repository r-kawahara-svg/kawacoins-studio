import { db } from "@/db";
import { affiliatePrograms } from "@/db/schema";
import { addAffiliate, toggleAffiliate } from "@/app/actions/affiliates";

const ASP_LABELS: Record<string, string> = {
  a8: "A8.net",
  moshimo: "もしもアフィリエイト",
  accesstrade: "アクセストレード",
};

export default async function AffiliatesPage() {
  const programs = await db.select().from(affiliatePrograms);

  return (
    <div style={{ padding: "20px 16px 60px", maxWidth: 900, margin: "0 auto" }}>
      <div
        style={{
          fontSize: 10.5,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "#697587",
          fontWeight: 600,
          fontFamily: "monospace",
          marginBottom: 16,
        }}
      >
        アフィリリンクライブラリ
      </div>

      {/* Add form */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #dce1e8",
          borderRadius: 14,
          marginBottom: 20,
          padding: "20px 24px",
          boxShadow: "0 1px 2px rgba(22,29,43,.04)",
        }}
      >
        <div
          style={{
            fontFamily: "monospace",
            fontWeight: 700,
            fontSize: 14,
            marginBottom: 16,
          }}
        >
          新しいアフィリエイトプログラムを追加
        </div>
        <form action={addAffiliate}>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <div style={{ gridColumn: "1/-1" }}>
              <Label>プログラム名 *</Label>
              <Input name="name" placeholder="例: SBI証券 口座開設" required />
            </div>
            <div>
              <Label>ASP</Label>
              <Select name="asp" defaultValue="a8">
                <option value="a8">A8.net</option>
                <option value="moshimo">もしもアフィリエイト</option>
                <option value="accesstrade">アクセストレード</option>
              </Select>
            </div>
            <div>
              <Label>報酬単価（円）</Label>
              <Input
                name="payout"
                type="number"
                min="0"
                placeholder="例: 3000"
              />
            </div>
            <div style={{ gridColumn: "1/-1" }}>
              <Label>テーマ（カンマ区切り）</Label>
              <Input
                name="themes"
                placeholder="例: NISA, 個別株, iDeCo"
              />
            </div>
            <div style={{ gridColumn: "1/-1" }}>
              <Label>HTMLスニペット *</Label>
              <textarea
                name="html_snippet"
                required
                placeholder='<a href="https://...">SBI証券で口座開設</a>'
                style={inputStyle}
                rows={3}
              />
            </div>
          </div>
          <button
            type="submit"
            style={{
              marginTop: 16,
              background: "#0f766b",
              color: "#fff",
              border: "none",
              borderRadius: 9,
              padding: "9px 20px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            追加する
          </button>
        </form>
      </div>

      {/* List */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #dce1e8",
          borderRadius: 14,
          boxShadow: "0 1px 2px rgba(22,29,43,.04)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "16px 20px",
            borderBottom: "1px solid #dce1e8",
          }}
        >
          <span
            style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 14 }}
          >
            登録済みプログラム
          </span>
          <span
            style={{
              marginLeft: "auto",
              fontFamily: "monospace",
              fontSize: 11,
              color: "#697587",
            }}
          >
            {programs.length}件
          </span>
        </div>

        {programs.length === 0 && (
          <div
            style={{
              padding: "40px 20px",
              textAlign: "center",
              color: "#697587",
              fontSize: 13,
            }}
          >
            まだプログラムがありません。上のフォームから追加してください。
          </div>
        )}

        {programs.map((p) => {
          const themes = Array.isArray(p.themes) ? (p.themes as string[]) : [];
          return (
            <div
              key={p.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 14,
                padding: "16px 20px",
                borderBottom: "1px solid #dce1e8",
                opacity: p.active ? 1 : 0.5,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 14,
                    color: "#161d2b",
                    marginBottom: 4,
                  }}
                >
                  {p.name}
                </div>
                <div
                  style={{
                    fontSize: 11.5,
                    color: "#697587",
                    fontFamily: "monospace",
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                    marginBottom: 6,
                  }}
                >
                  <span>{ASP_LABELS[p.asp ?? "a8"] ?? p.asp}</span>
                  {p.payout != null && <span>¥{p.payout.toLocaleString()}/件</span>}
                  {themes.length > 0 && (
                    <span>
                      テーマ:{" "}
                      {themes.map((t) => (
                        <span
                          key={t}
                          style={{
                            background: "#f0fdf4",
                            border: "1px solid #0f766b",
                            color: "#065f46",
                            borderRadius: 4,
                            padding: "0 5px",
                            fontSize: 10.5,
                            marginLeft: 3,
                          }}
                        >
                          {t}
                        </span>
                      ))}
                    </span>
                  )}
                </div>
                <code
                  style={{
                    fontSize: 11,
                    color: "#697587",
                    background: "#f8f9fb",
                    padding: "3px 6px",
                    borderRadius: 4,
                    display: "block",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: 500,
                  }}
                >
                  {p.htmlSnippet}
                </code>
              </div>

              <form action={toggleAffiliate} style={{ flexShrink: 0 }}>
                <input type="hidden" name="id" value={p.id} />
                <input
                  type="hidden"
                  name="active"
                  value={p.active ? "true" : "false"}
                />
                <button
                  type="submit"
                  style={{
                    background: p.active ? "#fef3c7" : "#f0fdf4",
                    color: p.active ? "#92400e" : "#065f46",
                    border: `1px solid ${p.active ? "#b07d2e" : "#0f766b"}`,
                    borderRadius: 7,
                    padding: "5px 12px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {p.active ? "無効化" : "有効化"}
                </button>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #dce1e8",
  borderRadius: 9,
  padding: "10px 12px",
  fontSize: 16,
  color: "#161d2b",
  background: "#fff",
  fontFamily: "inherit",
  boxSizing: "border-box",
};

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 12,
        fontWeight: 600,
        color: "#697587",
        marginBottom: 4,
      }}
    >
      {children}
    </div>
  );
}
function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={inputStyle} />;
}
function Select({
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  children: React.ReactNode;
}) {
  return (
    <select {...props} style={inputStyle}>
      {children}
    </select>
  );
}
