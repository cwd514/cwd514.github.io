#!/usr/bin/env node
/* 作った物を機械で確かめる。使い方: node tools/verify.mjs <url>
   見るもの: 外部リクエスト / コンソール / コントラスト / 横溢れ / タップ領域 /
             JS 無効時の可読性 / 図と表と読み出しの一致 / 画像の実体 */

import { launch } from "./cdp.mjs";

const url = process.argv[2] || "http://127.0.0.1:8129/";
const fails = [];
const notes = [];
const ok = (m) => console.log("  ok    " + m);
const bad = (m) => { console.log("  FAIL  " + m); fails.push(m); };

const CONTRAST_JS = `(() => {
  const lum = ([r, g, b]) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const parse = (c) => {
    const m = c.match(/rgba?\\(([^)]+)\\)/);
    if (!m) return null;
    const p = m[1].split(/[,\\s/]+/).filter(Boolean).map(Number);
    return { rgb: [p[0], p[1], p[2]], a: p.length > 3 ? p[3] : 1 };
  };
  const over = (fg, bg, a) => fg.map((v, i) => v * a + bg[i] * (1 - a));
  const bgStack = (el) => {
    const layers = [];
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const c = parse(getComputedStyle(n).backgroundColor);
      if (c && c.a > 0) layers.push(c);
      if (c && c.a === 1) break;
    }
    let base = [255, 255, 255];
    for (let i = layers.length - 1; i >= 0; i--) base = over(layers[i].rgb, base, layers[i].a);
    return base;
  };
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };
  const out = [];
  for (const el of document.querySelectorAll("body *")) {
    const own = Array.from(el.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join("");
    if (!own) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) === 0) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    const fg = parse(cs.color);
    if (!fg) continue;
    const bg = bgStack(el);
    const eff = fg.a < 1 ? over(fg.rgb, bg, fg.a) : fg.rgb;
    const size = parseFloat(cs.fontSize);
    const bold = Number(cs.fontWeight) >= 700;
    const large = size >= 24 || (bold && size >= 18.66);
    const need = large ? 3 : 4.5;
    const got = ratio(eff, bg);
    if (got < need) {
      out.push({
        sel: el.tagName.toLowerCase() + (el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\\s+/).join(".") : ""),
        text: own.slice(0, 26), size: +size.toFixed(1), need, got: +got.toFixed(2),
      });
    }
  }
  return out;
})()`;

const OVERFLOW_JS = `(() => {
  const de = document.documentElement;
  /* スクロールできる容器の中身と、画面外に待機させている要素は溢れではない。 */
  const clipped = (el) => {
    for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
      const ox = getComputedStyle(n).overflowX;
      if (ox === "auto" || ox === "scroll" || ox === "hidden" || ox === "clip") return true;
    }
    return false;
  };
  const wide = [];
  for (const el of document.querySelectorAll("body *")) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    if (r.bottom < -20 || r.top > de.scrollHeight + 20) continue;
    if (r.right > de.clientWidth + 1.5 || r.left < -1.5) {
      if (clipped(el)) continue;
      wide.push(el.tagName.toLowerCase() + (typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\\s+/)[0] : "") +
        " [" + Math.round(r.left) + ".." + Math.round(r.right) + "]");
    }
  }
  return { scrollW: de.scrollWidth, clientW: de.clientWidth, offenders: [...new Set(wide)].slice(0, 8) };
})()`;

const TAP_JS = `(() => {
  const small = [];
  for (const el of document.querySelectorAll("a[href], button, input, label, summary, [tabindex]:not([tabindex='-1'])")) {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.height < 44 || r.width < 44) {
      small.push({ tag: el.tagName.toLowerCase(), cls: typeof el.className === "string" ? el.className.split(/\\s+/)[0] : "",
        text: (el.textContent || "").trim().slice(0, 20), w: Math.round(r.width), h: Math.round(r.height) });
    }
  }
  return small;
})()`;

/* JS を切って、本文と主要な数字がそのまま読めるか */
const NOJS_NEEDLES = ["131,072", "7,790", "1,075", "Qwen3.8-27B", "6,944", "89.1", "n-cpu-moe", "8 GB", "定格"];

const { page, close } = await launch({ width: 1440, height: 900 });

try {
  /* --- 1. 外部リクエストとコンソール ------------------------------------- */
  console.log("\n[1] ネットワークとコンソール");
  await page.send("Network.enable");
  const requests = [];
  page.events.length = 0;

  page.send("Runtime.enable");
  await page.goto(url, { waitMs: 1500 });

  for (const ev of page.events) {
    if (ev.method === "Network.requestWillBeSent") requests.push(ev.params.request.url);
  }
  const host = new URL(url).host;
  const external = [...new Set(requests.filter((u) => !u.startsWith("http://" + host) && !u.startsWith("data:") && !u.startsWith("blob:")))];
  external.length === 0
    ? ok(`外部リクエスト 0（総リクエスト ${requests.length} 本、すべて自ホスト）`)
    : bad("外部リクエストあり: " + external.join(", "));

  const consoleErrors = page.events
    .filter((e) => e.method === "Log.entryAdded" && e.params.entry.level === "error")
    .map((e) => e.params.entry.text);
  consoleErrors.length === 0 ? ok("コンソールエラー 0") : bad("コンソールエラー: " + consoleErrors.join(" | "));

  /* --- 2. 画像が実体として読めているか ----------------------------------- */
  console.log("\n[2] 画像");
  const imgs = await page.eval(`(async () => {
    const step = innerHeight;
    for (let y = 0; y < document.body.scrollHeight; y += step) { scrollTo(0, y); await new Promise(r => setTimeout(r, 100)); }
    scrollTo(0, 0);
    return Array.from(document.images).map(i => ({ src: i.currentSrc.split('/').pop(), w: i.naturalWidth, h: i.naturalHeight, ok: i.complete && i.naturalWidth > 0 }));
  })()`, true);
  const broken = imgs.filter((i) => !i.ok);
  broken.length === 0 ? ok(`${imgs.length} 枚すべて描画可能`) : bad("読めない画像: " + JSON.stringify(broken));

  /* --- 3. コントラスト ---------------------------------------------------- */
  console.log("\n[3] コントラスト（ライト）");
  const lowLight = await page.eval(CONTRAST_JS);
  lowLight.length === 0 ? ok("本文・大見出しとも AA を満たす") : bad(`${lowLight.length} 件が AA 未満: ` + JSON.stringify(lowLight.slice(0, 6)));

  console.log("\n[3b] コントラスト（反転印刷 / ダーク）");
  await page.send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-color-scheme", value: "dark" }],
  });
  await new Promise((r) => setTimeout(r, 400));
  const lowDark = await page.eval(CONTRAST_JS);
  lowDark.length === 0 ? ok("暗所でも AA を満たす") : bad(`ダークで ${lowDark.length} 件が AA 未満: ` + JSON.stringify(lowDark.slice(0, 6)));
  await page.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "light" }] });
  await new Promise((r) => setTimeout(r, 300));

  /* --- 4. 横溢れ ---------------------------------------------------------- */
  console.log("\n[4] 横溢れ（幅を変えて）");
  for (const w of [320, 390, 768, 1024, 1440, 1920]) {
    await page.send("Emulation.setDeviceMetricsOverride", { width: w, height: 900, deviceScaleFactor: 1, mobile: w < 600 });
    await new Promise((r) => setTimeout(r, 350));
    const o = await page.eval(OVERFLOW_JS);
    o.scrollW <= o.clientW + 1 && o.offenders.length === 0
      ? ok(`${w}px: 溢れなし`)
      : bad(`${w}px: scrollW=${o.scrollW} clientW=${o.clientW} ${JSON.stringify(o.offenders)}`);
  }

  /* --- 5. タップ領域 ------------------------------------------------------ */
  console.log("\n[5] タップ領域（44px 以上）");
  await page.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await new Promise((r) => setTimeout(r, 400));
  const small = await page.eval(TAP_JS);
  small.length === 0 ? ok("すべて 44×44 以上") : bad(`${small.length} 件が小さい: ` + JSON.stringify(small.slice(0, 8)));

  /* --- 6. 図・表・読み出しの一致 ----------------------------------------- */
  console.log("\n[6] 読み出しと表の一致（全 9 通り）");
  await page.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await new Promise((r) => setTimeout(r, 300));
  const mismatches = await page.eval(`(async () => {
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const bad = [];
    const radios = Array.from(document.querySelectorAll('input[name="quant"]'));
    const rng = document.getElementById('ctx');
    const num = (s) => parseFloat(String(s).replace(/,/g, ''));
    for (const radio of radios) {
      radio.click(); await sleep(120);
      for (let i = 0; i <= Number(rng.max); i++) {
        rng.value = String(i); rng.dispatchEvent(new Event('input'));
        await sleep(650);
        const row = document.querySelector('#sweep-table tr.is-active');
        const d = row.dataset;
        const got = Array.from(document.querySelectorAll('#readout [data-ro]')).map(e => e.textContent.trim());
        const want = [
          Number(d.prefill).toFixed(1),
          Number(d.decode).toFixed(2),
          d.pngl,
          Number(d.peak).toLocaleString('en-US'),
          (Number(d.peak) / 7790 * 100).toFixed(1),
        ];
        const ctx = document.getElementById('ctx-out').textContent;
        const wantCtx = Number(d.ctx).toLocaleString('en-US');
        if (JSON.stringify(got) !== JSON.stringify(want) || ctx !== wantCtx) {
          bad.push({ quant: radio.value, i, got, want, ctx, wantCtx });
        }
        const dot = document.querySelector('#charts .cursor-dot');
        if (dot && dot.getAttribute('opacity') === '0') bad.push({ quant: radio.value, i, dot: 'cursor dot hidden at rest' });
      }
    }
    return bad;
  })()`, true);
  mismatches.length === 0 ? ok("9 通りすべて一致（数値・文脈長・カーソル位置）") : bad("不一致: " + JSON.stringify(mismatches));

  /* --- 7. JS を切って読めるか -------------------------------------------- */
  console.log("\n[7] JS 無効でも読めるか");
  await page.goto(url, { waitMs: 900, js: false });
  const jsOff = await page.eval(`({
    text: document.body.innerText,
    rows: document.querySelectorAll('#sweep-table tbody tr').length,
    tableNums: Array.from(document.querySelectorAll('#readout [data-ro]')).map(e => e.textContent.trim()),
  })`);
  const missing = NOJS_NEEDLES.filter((n) => !jsOff.text.includes(n));
  missing.length === 0
    ? ok(`本文と主要な数値がそのまま読める（${NOJS_NEEDLES.length} 項目すべて）`)
    : bad("JS 無効時に欠ける: " + missing.join(", "));
  notes.push(`JS 無効時も読み出しは初期値 [${jsOff.tableNums.join(" / ")}]、スイープ表 ${jsOff.rows} 行が HTML のまま読める`);
  const navDead = await page.eval(`document.querySelectorAll('#charts .cursor').length`);
  navDead === 0 ? ok("JS 無効時はカーソルを描かない（静的図として成立）") : notes.push(`JS 無効時のカーソル数: ${navDead}`);

  /* --- 8. キーボード ------------------------------------------------------ */
  console.log("\n[8] キーボード");
  await page.goto(url, { waitMs: 900 });
  const tabs = await page.eval(`(async () => {
    const seen = [];
    const handler = (e) => {
      const el = e.target;
      if (el && el.tagName !== 'BODY') seen.push(el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.textContent ? ':' + el.textContent.trim().slice(0, 14) : ''));
    };
    document.addEventListener('focusin', handler);
    for (let i = 0; i < 7; i++) {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
      const focusables = Array.from(document.querySelectorAll('a[href], button, input, [tabindex]:not([tabindex="-1"])')).filter(e => e.offsetParent !== null);
      const idx = focusables.indexOf(document.activeElement);
      const next = focusables[idx + 1] || focusables[0];
      if (next) next.focus();
      await new Promise(r => setTimeout(r, 60));
    }
    document.removeEventListener('focusin', handler);
    return seen;
  })()`, true);
  tabs.length >= 5 ? ok("Tab で辿れる: " + tabs.slice(0, 7).join(" → ")) : bad("フォーカス可能な要素が少なすぎる: " + JSON.stringify(tabs));
  const skip = await page.eval(`!!document.querySelector('.skip')`);
  skip ? ok("スキップリンクあり") : bad("スキップリンクなし");
} finally {
  close();
}

console.log("\n" + "=".repeat(64));
if (fails.length === 0) console.log("結果: すべて通過");
else { console.log(`結果: ${fails.length} 件の失敗`); fails.forEach((f) => console.log("  - " + f)); }
notes.forEach((n) => console.log("  · " + n));
process.exit(fails.length === 0 ? 0 : 1);
