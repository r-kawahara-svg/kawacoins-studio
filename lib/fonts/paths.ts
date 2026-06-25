import { join } from "path";

// __dirname を使うことで webpack/Vercel のファイルトレーサーが
// このディレクトリのファイルを確実にバンドルに含める
export const FONTS_DIR = join(__dirname, ".");
export const FONT_JP_PATH  = join(__dirname, "noto-sans-jp-japanese-700-normal.woff2");
export const FONT_LAT_PATH = join(__dirname, "noto-sans-jp-latin-700-normal.woff2");
