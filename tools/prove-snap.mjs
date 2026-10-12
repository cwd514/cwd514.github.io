/* 読み出しの数字が「その場で確定する」ことを、コードではなく画素と時系列で示す。
   スライダを動かした直後の各フレームで
     (a) 読み出しの文字列
     (b) グラフのカーソル（縦線）の x 座標
   を記録する。もし数字を補間していたら、途中の値が (a) に現れる。
   針だけが動くなら、(a) は 1 フレーム目で最終値に一致し、(b) は数百 ms 動き続ける。 */
import { launch } from "./cdp.mjs";

const URL = process.argv[2] || "http://127.0.0.1:8129/";
const { page, close } = await launch({ width: 1440, height: 1000 });

try {
  await page.goto(URL, { waitMs: 1500 });
  const raw = await page.eval(
    `(async () => {
       await document.fonts.ready;
       const range = document.querySelector('.rail-ctx input[type="range"]');
       const readout = document.querySelector('.readout');
       const lines = () => [...document.querySelectorAll('g.cursor > line')];
       const snap = () => ({
         ms: Math.round(performance.now()),
         text: (readout.textContent || '').replace(/\\s+/g, ' ').trim(),
         x: lines().map(l => Number(l.getAttribute('x1')).toFixed(2)).join(' ')
       });

       /* まず小さい側へ寄せて、そこから大きい側へ一息で動かす。 */
       range.value = range.min;
       range.dispatchEvent(new Event('input', { bubbles: true }));
       await new Promise(r => setTimeout(r, 700));
       const from = snap();

       const t0 = performance.now();
       range.value = range.max;
       range.dispatchEvent(new Event('input', { bubbles: true }));

       const out = [];
       for (let i = 0; i < 80; i++) {
         await new Promise(r => requestAnimationFrame(r));
         const s = snap();
         s.dt = Math.round(performance.now() - t0);
         out.push(s);
         if (s.dt > 1000) break;
       }
       return JSON.stringify({ from, samples: out });
     })()`,
    true
  );
  const d = typeof raw === "string" ? JSON.parse(raw) : raw;

  const finalText = d.samples[d.samples.length - 1].text;
  const finalX = d.samples[d.samples.length - 1].x;
  const firstText = d.samples.find((s) => s.text === finalText);
  const firstX = d.samples.find((s) => s.x === finalX);
  const midValues = new Set(d.samples.map((s) => s.text));

  console.log(`  出発点      ${d.from.text}`);
  console.log(`  到達点      ${finalText}\n`);
  console.log(`  文字列が最終値になったのは   ${firstText.dt} ms（${firstText.ms} ms 時点）`);
  console.log(`  針が最終位置に着いたのは     ${firstX.dt} ms`);
  console.log(`  途中で観測された文字列       ${midValues.size} 通り`);
  for (const t of midValues) console.log(`      ${t === finalText ? "（最終値）" : ""} ${t}`);

  const passed = firstText.dt <= 34 && firstX.dt >= 300 && midValues.size === 1;
  console.log(
    `\n  ${passed ? "確かめられた" : "確かめられなかった"}: 数字は 1 フレーム目で確定し、` +
      `針は ${firstX.dt} ms かけて動いた。間に観測された値は ${midValues.size - 1} 個。`
  );
  process.exitCode = passed ? 0 : 1;
} finally {
  await close();
}
