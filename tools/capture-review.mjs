/* 節ごとの写しを取り直す。
   前の版は scrollIntoView を投げて待つだけだったので、効かなかった回でもそのまま撮ってしまい、
   revision.png と ordering.png が同じ 1 枚になった。ここでは
   (1) なめらかスクロールを切り、(2) 目標位置に着いたことを確かめ、
   (3) 3 フレーム続けて同じ位置になるまで待ってから撮る。
   最後に全枚のハッシュを突き合わせ、二重撮りがあればそこで落とす。 */
import { launch } from "./cdp.mjs";
import { writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, ".impeccable", "review");
const PORT = process.argv[2] || "8129";
const BASE = `http://127.0.0.1:${PORT}/`;
mkdirSync(OUT, { recursive: true });

/* 1 枚で写す節の高さの上限。超えたら落とす（黙って切らない）。 */
const MAX_SECTION = 4000;

const hashes = new Map();
function record(name, h) {
  if (hashes.has(h)) throw new Error(`同じ 1 枚が 2 つある: ${name} と ${hashes.get(h)}`);
  hashes.set(h, name);
}

/* id が null なら文書の先頭を視口で。あれば節を文書座標の切り出しで撮る。
   節を「スクロールして撮る」と、末尾に近い節は最大スクロール位置に張り付いて
   隣の節と同じ 1 枚になる（revision と ordering がこれで同じになっていた）。 */
async function shoot(page, name, id, prep, scrollToId) {
  await page.goto(BASE, { waitMs: 1400 });
  const st = await page.eval(
    `(async () => {
       await document.fonts.ready;
       document.documentElement.style.scrollBehavior = "auto";
       /* 板は loading="lazy"。画面に入るまで取りに行かないので、一度だけ全部の位置を通す。
          通さずに切り出すと、枠だけが写る（実際に application.png がそうなっていた）。 */
       const imgs = [...document.images];
       if (imgs.some(im => !im.complete || !im.naturalWidth)) {
         const H = document.documentElement.scrollHeight;
         const step = Math.max(200, Math.round(window.innerHeight * 0.8));
         for (let y = 0; y <= H; y += step) {
           window.scrollTo(0, y);
           await new Promise(r => requestAnimationFrame(r));
         }
         for (let i = 0; i < 200; i++) {
           if (imgs.every(im => im.complete && im.naturalWidth > 0)) break;
           await new Promise(r => setTimeout(r, 50));
         }
         window.scrollTo(0, 0);
       }
       ${prep || ""}
       /* レールの高さは ResizeObserver が --rail-h を書いてから確定する。その通知はフレーム末なので、
          切り替え直後に読むと 1px 古い値を掴む。送り先が 1px ずれ、131k の朱破線の位相が回ごとに変わる
          （rail-iq2.png がこれで二峰に分かれていた）。落ち着くまで待ってから読む。 */
       const rail = document.querySelector(".rail");
       {
         let ph = -1, calm = 0;
         for (let i = 0; i < 60; i++) {
           await new Promise(r => requestAnimationFrame(r));
           const hh = rail.offsetHeight;
           const vh = Math.round(parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--rail-h")) || 0);
           if (hh === ph && vh === hh) { if (++calm >= 4) break; } else { calm = 0; ph = hh; }
         }
       }
       const ID = ${JSON.stringify(id)};
       const SCROLL = ${JSON.stringify(scrollToId || null)};
       const el = ID ? document.getElementById(ID) : null;
       if (ID && !el) return { ok: false, why: "節が無い: " + ID };
       if (!el) window.scrollTo(0, 0);
       if (SCROLL) {
         /* レールは視口の上に貼り付くので、切り出しでは写らない。ここだけ実際に送る。 */
         const t = document.getElementById(SCROLL);
         /* 端数のまま送ると 1px 未満の位置に落ち、破線の位相が回ごとに変わる。整数へ丸める。 */
         window.scrollTo(0, Math.round(Math.max(0, t.getBoundingClientRect().top + window.scrollY - rail.offsetHeight - 24)));
         let prev = -1, still = 0;
         for (let i = 0; i < 90; i++) {
           await new Promise(r => requestAnimationFrame(r));
           const y = Math.round(window.scrollY);
           if (y === prev) { if (++still >= 3) break; } else { still = 0; prev = y; }
         }
       }
       /* 針は 380ms かけて動く。途中で撮ると同じ状態でも画素が変わる。
          トゥイーンが必ず終わるまで待ってから、動きが止まったことを確かめる。
          「3 フレーム同じ」だけでは、遅い開始を静止と読み違える。 */
       await new Promise(r => setTimeout(r, 520));
       let lastX = null, stillX = 0;
       for (let i = 0; i < 90; i++) {
         const x = [...document.querySelectorAll("g.cursor > line")].map(l => l.getAttribute("x1")).join(",")
                 + "|" + document.querySelector(".readout").textContent;
         if (x === lastX) { if (++stillX >= 6) break; } else { stillX = 0; lastX = x; }
         await new Promise(r => requestAnimationFrame(r));
       }
       await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
       const a = document.querySelector(".band-nav a[aria-current]");
       const r = el && !SCROLL ? el.getBoundingClientRect() : null;
       return {
         ok: true,
         clip: r ? { x: 0, y: Math.round(r.top + window.scrollY), width: document.documentElement.clientWidth,
                     height: Math.round(r.height), scale: 1 } : null,
         gap: Math.round((el || document.getElementById("general")).getBoundingClientRect().top - rail.offsetHeight),
         rail: rail.offsetHeight,
         docH: document.documentElement.scrollHeight,
         imgsBad: imgs.filter(im => !im.complete || !im.naturalWidth).map(im => im.getAttribute("src")),
         nav: a ? a.textContent : "none"
       };
     })()`,
    true
  );
  const s = typeof st === "string" ? JSON.parse(st) : st;
  if (!s.ok) throw new Error(`${name}: ${s.why}`);
  /* 読めていない板が 1 枚でもあれば落とす。空の枠を「節の写し」として残さない。 */
  if (s.imgsBad && s.imgsBad.length)
    throw new Error(`${name}: 読み込めていない画像がある ${JSON.stringify(s.imgsBad)}`);
  /* 切り出しは節の高さをそのまま使う。上限で黙って切ると、filename が名乗るものを
     写していない 1 枚が、二重取りの検査も潜り抜けてしまう。超えたら落とす。 */
  if (s.clip) {
    if (s.clip.height > MAX_SECTION)
      throw new Error(
        `${name}: 節が ${s.clip.height}px あり、切り出しの上限 ${MAX_SECTION}px を超えた。分けて撮ること。`
      );
    if (s.clip.y + s.clip.height > s.docH + 4)
      throw new Error(`${name}: 切り出しが本文の外へ出た`);
  }

  const shot = { format: "png", captureBeyondViewport: !!s.clip };
  if (s.clip) shot.clip = s.clip;
  const data = await page.send("Page.captureScreenshot", shot);
  const buf = Buffer.from(data.data, "base64");
  writeFileSync(join(OUT, name), buf);
  const h = createHash("sha256").update(buf).digest("hex").slice(0, 12);
  const how = s.clip ? `y=${String(s.clip.y).padStart(6)} 高さ=${String(s.clip.height).padStart(5)}` : scrollToId ? `視口（#${scrollToId} へ送った）` : "先頭を視口で";
  console.log(
    `  ${name.padEnd(18)} ${how.padEnd(26)}` +
      `  余白=${String(s.gap).padStart(4)}px  レール=${String(s.rail).padStart(3)}px  目次=${s.nav}  ${h}`
  );
  record(name, h);
}

/* 1. 2 つの視口。main.js の後であることが効くので、ここは必ず撮り直す。 */
for (const [w, height, mobile, tag] of [
  [1440, 900, false, "desktop.png"],
  [390, 844, true, "mobile.png"],
]) {
  const { page, close } = await launch({ width: w, height: height, mobile });
  try {
    await shoot(page, tag, null, "");
  } finally {
    await close();
  }
}

/* 1b. 狭い画面の §1。群の見出しは 390px では 1 行に収まらないので、折り返しを写しておく。 */
{
  const { page, close } = await launch({ width: 390, height: 844, mobile: true });
  try {
    await shoot(page, "mobile-general.png", "general", "");
  } finally {
    await close();
  }
}

/* 2. 節ごと、および反転印刷。 */
const { page, close } = await launch({ width: 1440, height: 1250 });
try {
  for (const id of ["charts", "ladder", "sweep", "application", "conditions", "notes", "revision", "ordering"]) {
    await shoot(page, `${id}.png`, id, "");
  }
  await shoot(
    page,
    "rail-iq2.png",
    null,
    `document.querySelector('input[name="quant"][value="IQ2_XS"]').click();`,
    "charts"
  );
  await page.send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-color-scheme", value: "dark" }],
  });
  await shoot(page, "dark.png", null, "");
} finally {
  await close();
}

/* 撮ったハッシュを道具自身が残す。回をまたいで突き合わせられるようにするため。
   手で書き写した記録は、写し間違えても気づけない。 */
const manifest = [...hashes.entries()]
  .sort((a, b) => a[1].localeCompare(b[1]))
  .map(([h, name]) => `${h.slice(0, 16)}  ${name}\n`)
  .join("");
writeFileSync(join(OUT, "manifest.txt"), manifest);

console.log(`\n  ${hashes.size} 枚、すべて別物。二重撮りなし。`);
console.log(`  ${join(OUT, "manifest.txt")} に書き出した。`);
