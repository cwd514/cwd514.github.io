/* OG カードを作り直し、来歴を書き残す。
   板と同じ約束をこの 1 枚にも適用する — 何から作ったかを辿れない画像は置かない。

   使い方: node tools/make-og.mjs [port]   （先に tools/serve.sh を動かしておく） */
import { spawnSync } from "node:child_process";
import { writeFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = process.argv[2] || "8129";
const OUT = join(ROOT, "assets", "img", "og.png");

const shot = spawnSync(
  process.execPath,
  [join(ROOT, "tools", "shot.mjs"), `http://127.0.0.1:${PORT}/tools/og.html`, OUT, "1200", "630", "--wait=1500"],
  { stdio: "inherit" }
);
if (shot.status !== 0) process.exit(shot.status ?? 1);

const prompt =
  "tools/og.html を原稿とし、これを headless Chromium で 1200x630 に描画したものが og.png。\n" +
  "写真も生成画像も使っていない。紙・インク・朱・青の 4 役と、本編と同じ書体（Hack / DejaVu Sans Condensed）だけで組んである。\n" +
  "加筆・合成・色調整はしていない。\n";

writeFileSync(
  OUT + ".json",
  JSON.stringify({ prompt, createdAt: new Date().toISOString() }, null, 2) + "\n",
  "utf-8"
);

console.log(`\n  ${OUT.replace(ROOT + "/", "")}  ${statSync(OUT).size.toLocaleString()} B`);
console.log(`  ${OUT.replace(ROOT + "/", "")}.json  来歴を書き残した`);
