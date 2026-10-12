/* 実寸の測り方 — 指定値ではなく、画面に出ている大きさを測る。
   SVG の中の文字は viewBox で拡大されるので、CSS に書いた px は実寸ではない。 */
import { launch } from "./cdp.mjs";

const URL = process.argv[2] || "http://127.0.0.1:8129/";
const W = Number(process.argv[3] || 1440);

const { page, close } = await launch({ width: W, height: 1000 });
try {
  await page.goto(URL, { waitMs: 1400 });
  const out = await page.eval(`(() => {
    const px = (el) => {
      const r = el.getBoundingClientRect();
      return { w: +r.width.toFixed(1), h: +r.height.toFixed(1) };
    };
    const svgText = [...document.querySelectorAll(".plot text")].slice(0, 3).map(t => {
      const r = t.getBoundingClientRect();
      const fs = parseFloat(getComputedStyle(t).fontSize);
      const svg = t.ownerSVGElement;
      const scale = svg.getBoundingClientRect().width / svg.viewBox.baseVal.width;
      return {
        text: t.textContent.slice(0, 10),
        cssPx: +fs.toFixed(2),
        scale: +scale.toFixed(3),
        renderedPx: +(fs * scale).toFixed(2),
        boxH: +r.height.toFixed(1)
      };
    });
    // 画面に出ている実効サイズの小さい順に、本文系の要素を拾う
    const small = [];
    document.querySelectorAll("p, li, td, th, span, label, a, dt, dd, output, b, em, strong, figcaption, svg text, svg tspan").forEach(el => {
      /* SVG の text は tspan を子に持つ。子持ちを外す判定は HTML にだけ掛ける。 */
      const svgText = !!el.ownerSVGElement;
      if (el.children.length && !svgText) return;
      const t = (el.textContent || "").trim();
      if (!t) return;
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") return;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return;
      const inSvg = svgText;
      const fs = parseFloat(cs.fontSize);
      const rendered = inSvg ? fs * (el.ownerSVGElement.getBoundingClientRect().width / el.ownerSVGElement.viewBox.baseVal.width) : fs;
      if (rendered < 11) small.push({ t: t.slice(0, 22), rendered: +rendered.toFixed(2), tag: el.tagName.toLowerCase(), cls: (el.className.baseVal ?? el.className ?? "").toString().slice(0, 24) });
    });
    small.sort((a, b) => a.rendered - b.rendered);
    return JSON.stringify({ viewport: innerWidth, svgText, smallest: small.slice(0, 14), smallCount: small.length }, null, 1);
  })()`);
  console.log(out);
} finally {
  await close();
}
