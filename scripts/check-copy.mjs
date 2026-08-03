// UIコピーの禁止語チェック。
// 画面に出る日本語テキスト（文字列リテラル・JSXテキスト）に禁止語が混入していたら失敗する。
// コード内のコメントは対象外（日本語コメントで説明のために禁止語を使うことがあるため）。
// 例外：その行に `copy-lint-ignore` があればスキップ（承認済み文言など正当な例外用）。

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const TARGET_DIRS = ["app", "components"];
const TARGET_EXT = [".tsx", ".ts"];

const FORBIDDEN = [
  "スコア", "歯周病", "歯肉炎", "歯肉", "炎症",
  "リスク", "判定", "スクリーニング", "診断", "疾患", "罹患",
  "受診", "検診", "健診", "陽性", "陰性", "異常",
  "改善", "悪化", "治療", "予防効果", "効果があ",
];

const IGNORE_MARK = "copy-lint-ignore";

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (TARGET_EXT.some((e) => p.endsWith(e))) out.push(p);
  }
  return out;
}

// コメントを空白に置き換える（行数・行内の桁は維持して行番号をずらさない）。
// JSXコメント {/* ... */} は中身が画面に出ないため、これも対象外にする。
function stripComments(src) {
  let out = "";
  let i = 0;
  let mode = "code"; // code | line | block | sq | dq | tpl
  while (i < src.length) {
    const c = src[i];
    const n = src[i + 1];
    if (mode === "code") {
      if (c === "/" && n === "/") { mode = "line"; out += "  "; i += 2; continue; }
      if (c === "/" && n === "*") { mode = "block"; out += "  "; i += 2; continue; }
      if (c === "'") { mode = "sq"; out += c; i++; continue; }
      if (c === '"') { mode = "dq"; out += c; i++; continue; }
      if (c === "`") { mode = "tpl"; out += c; i++; continue; }
      out += c; i++; continue;
    }
    if (mode === "line") {
      if (c === "\n") { mode = "code"; out += c; i++; continue; }
      out += " "; i++; continue;
    }
    if (mode === "block") {
      if (c === "*" && n === "/") { mode = "code"; out += "  "; i += 2; continue; }
      out += c === "\n" ? "\n" : " "; i++; continue;
    }
    // 文字列の中：エスケープを飛ばしつつ、閉じたら code に戻る
    if (c === "\\") { out += c + (src[i + 1] ?? ""); i += 2; continue; }
    if ((mode === "sq" && c === "'") || (mode === "dq" && c === '"') || (mode === "tpl" && c === "`")) {
      mode = "code";
    }
    out += c; i++;
  }
  return out;
}

const files = TARGET_DIRS.flatMap((d) => walk(join(ROOT, d)));
const hits = [];

for (const file of files) {
  const src = readFileSync(file, "utf8");
  const originalLines = src.split("\n");
  const lines = stripComments(src).split("\n");

  lines.forEach((line, idx) => {
    // 元の行に除外マークがあればスキップ（JSXコメントで書けるようにするため元行で判定）
    if (originalLines[idx]?.includes(IGNORE_MARK)) return;
    for (const word of FORBIDDEN) {
      if (line.includes(word)) {
        hits.push({ file: relative(ROOT, file), line: idx + 1, word, text: originalLines[idx].trim() });
      }
    }
  });
}

if (hits.length > 0) {
  console.error(`\n禁止語が ${hits.length} 件見つかりました：\n`);
  for (const h of hits) {
    console.error(`  ${h.file}:${h.line}  「${h.word}」`);
    console.error(`    ${h.text}`);
  }
  console.error(`\n正当な例外は、その行に ${IGNORE_MARK} を書いてください。\n`);
  process.exit(1);
}

console.log(`コピーチェック OK（${files.length} ファイル）`);
