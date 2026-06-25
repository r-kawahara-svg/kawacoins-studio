/**
 * PWA アイコン生成スクリプト
 * icon-source.webp → 192x192, 512x512, 180x180(Apple), maskable 512x512
 */
import sharp from "sharp";
import path from "path";

const src = path.join(process.cwd(), "public", "icon-source.webp");
const out = path.join(process.cwd(), "public");

async function main() {
  // 192x192 (PWA standard small)
  await sharp(src)
    .resize(192, 192, { fit: "cover" })
    .png()
    .toFile(path.join(out, "icon-192.png"));
  console.log("✓ icon-192.png");

  // 512x512 (PWA standard large)
  await sharp(src)
    .resize(512, 512, { fit: "cover" })
    .png()
    .toFile(path.join(out, "icon-512.png"));
  console.log("✓ icon-512.png");

  // 180x180 (Apple touch icon)
  await sharp(src)
    .resize(180, 180, { fit: "cover" })
    .png()
    .toFile(path.join(out, "apple-touch-icon.png"));
  console.log("✓ apple-touch-icon.png");

  // Maskable: 512x512 with 10% safe-zone padding (light blue bg)
  await sharp(src)
    .resize(410, 410, { fit: "cover" })
    .extend({ top: 51, bottom: 51, left: 51, right: 51, background: { r: 214, g: 232, b: 248, alpha: 1 } })
    .resize(512, 512)
    .png()
    .toFile(path.join(out, "icon-512-maskable.png"));
  console.log("✓ icon-512-maskable.png");

  console.log("All PWA icons generated.");
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
