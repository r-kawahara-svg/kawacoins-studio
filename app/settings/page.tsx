import { getSetting, setSetting } from "@/lib/settings";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

async function saveAuthorProfile(formData: FormData) {
  "use server";
  const value = (formData.get("author_profile") as string ?? "").trim();
  await setSetting("author_profile", value);
  revalidatePath("/settings");
}

export default async function SettingsPage() {
  const authorProfile = (await getSetting("author_profile")) ?? "";

  const card: React.CSSProperties = { background: "#fff", border: "1px solid #e3e6ea", borderRadius: 14 };

  return (
    <div style={{ padding: "20px 16px 60px", maxWidth: 760, margin: "0 auto" }}>
      <div style={{ fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase", color: "#9aa3af", fontWeight: 600, fontFamily: "monospace", marginBottom: 12 }}>
        設定
      </div>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: "#1f2937", margin: "0 0 20px" }}>設定</h1>

      <form action={saveAuthorProfile} style={{ ...card, padding: "18px 20px" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#1f2937", marginBottom: 4 }}>著者プロフィール（E-E-A-T）</div>
        <p style={{ fontSize: 12.5, color: "#6b7280", lineHeight: 1.7, margin: "0 0 12px" }}>
          投資はYMYL領域で、Googleは書き手の信頼性を重視します。ここで一度登録すると、公開する全記事の末尾に自動で挿入されます。
          運用歴・実践内容・立場など、信頼性が伝わる内容を書いてください。
        </p>
        <textarea
          name="author_profile"
          defaultValue={authorProfile}
          rows={5}
          placeholder="例：電線株のスイングを実践する個人投資家。新NISA・iDeCoを実運用中。運用歴◯年。実体験ベースで投資情報を発信しています。"
          style={{ width: "100%", border: "1px solid #dce1e8", borderRadius: 9, padding: "11px 13px", fontSize: 15, color: "#1f2937", boxSizing: "border-box", lineHeight: 1.7, fontFamily: "inherit" }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
          <button type="submit" style={{ background: "#0f766b", color: "#fff", border: "none", borderRadius: 9, padding: "10px 22px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            保存する
          </button>
          <span style={{ fontSize: 12, color: "#9aa3af" }}>空にすると挿入されません。次回の公開・リライトから反映されます。</span>
        </div>
      </form>
    </div>
  );
}
