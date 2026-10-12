/* ==========================================================================
   動作点レール — 実測値はすべて HTML の表から読む。ここには数値を持たない。
   JS 無しでも本文と全数値は読める。ここが足すのは「選べること」だけ。
   ========================================================================== */

(function () {
  "use strict";

  var table = document.getElementById("sweep-table");
  if (!table) return;

  var range = document.getElementById("ctx");
  var ctxOut = document.getElementById("ctx-out");
  var readout = document.getElementById("readout");
  var announce = document.getElementById("announce");
  var rating = document.querySelector(".rating");

  /* --- 実測値の読み出し（唯一の出所は HTML の表） ------------------------ */

  var LIMIT = rating ? parseFloat(rating.getAttribute("data-vram-limit")) : NaN;

  var stops = { IQ3_S: [], IQ2_XS: [] };
  var rows = table.querySelectorAll("tbody tr[data-quant]");

  Array.prototype.forEach.call(rows, function (row) {
    var d = row.dataset;
    stops[d.quant].push({
      row: row,
      ctx: Number(d.ctx),
      prefill: Number(d.prefill),
      ngl: Number(d.pngl),
      /* decode は prefill と別の層数で回ることがある。片方だけ出すと半分しか言わない。 */
      dngl: Number(d.dngl),
      vram: Number(d.peak),
      decode: Number(d.decode)
    });
  });

  var XS = [46, 120.5, 195, 269.5, 344];   /* 図の横位置。SVG と同じ座標系 */
  var ORDER = ["IQ3_S", "IQ2_XS"];
  var state = { quant: "IQ3_S", index: 4 };

  /* --- 書式（表と同じ見え方にする） -------------------------------------- */

  function group(n) {
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  var CELLS = [
    { key: "prefill", digits: 1 },
    { key: "decode", digits: 2 },
    { key: "ngl", digits: 0, plain: true },
    { key: "vram", digits: 0, group: true },
    { key: "ratio", digits: 1 }
  ];

  function textFor(cell, values) {
    var v = values[cell.key];
    if (cell.plain) return String(Math.round(v));
    if (cell.group) return group(v);
    return v.toFixed(cell.digits);
  }

  /* --- 動き -----------------------------------------------------------------
     数字は動かさない。補間すれば、その間ずっと「測っていない値」が画面に出る。
     例えば ngl が 20 から 28 へ移る途中の 21〜27 は、存在しない層数だ。
     だから読み出しは行き先の実測値へ即座に切り替え、質量と減衰は針（カーソル）に持たせる。
     計器でも同じで、数字はすぐ確定し、針だけが遅れて追いつく。 */

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  function ease(t) { return 1 - Math.pow(1 - t, 3); }

  function paint(values) {
    var nodes = readout.querySelectorAll("[data-ro]");
    CELLS.forEach(function (cell, i) {
      if (nodes[i]) nodes[i].textContent = textFor(cell, values);
    });
    Array.prototype.forEach.call(readout.querySelectorAll("[data-note]"), function (node) {
      var v = values[node.getAttribute("data-note") + "Note"];
      node.textContent = v == null ? "" : v;
    });
  }

  function metricValues(point) {
    return {
      prefill: point.prefill,
      decode: point.decode,
      ngl: point.ngl,
      nglNote: point.dngl === point.ngl ? "" : "（decode は " + point.dngl + "層）",
      vram: point.vram,
      ratio: (point.vram / LIMIT) * 100
    };
  }

  /* --- 図のカーソル -------------------------------------------------------- */

  var SVGNS = "http://www.w3.org/2000/svg";
  var cursors = [];

  Array.prototype.forEach.call(document.querySelectorAll(".plot"), function (svg) {
    var g = document.createElementNS(SVGNS, "g");
    g.setAttribute("class", "cursor");
    var line = document.createElementNS(SVGNS, "line");
    line.setAttribute("y1", "16");
    line.setAttribute("y2", "214");
    var dot = document.createElementNS(SVGNS, "circle");
    dot.setAttribute("class", "cursor-dot");
    dot.setAttribute("r", "4.6");
    dot.setAttribute("opacity", "0");
    g.appendChild(line);
    g.appendChild(dot);
    svg.appendChild(g);

    var series = {};
    ORDER.forEach(function (q) {
      var pl = svg.querySelector(q === "IQ3_S" ? ".s-iq3 .pt-line" : ".s-iq2 .pt-line");
      if (!pl) return;
      series[q] = pl.getAttribute("points").trim().split(/\s+/).map(function (pt) {
        var xy = pt.split(",");
        return { x: parseFloat(xy[0]), y: parseFloat(xy[1]) };
      });
    });
    cursors.push({ el: line, dot: dot, series: series });
  });

  var cursorX = XS[4];

  function drawCursors() {
    cursors.forEach(function (c) {
      c.el.setAttribute("x1", cursorX);
      c.el.setAttribute("x2", cursorX);
    });
  }

  /* 点は実測点の上にしか置かない。点の間を移動している間は隠す。 */
  function settleDots(index) {
    cursors.forEach(function (c) {
      var pts = c.series[state.quant];
      var p = pts && pts[index];
      if (p && p.x === XS[index]) {
        c.dot.setAttribute("cx", p.x);
        c.dot.setAttribute("cy", p.y);
        c.dot.removeAttribute("opacity");
      } else {
        c.dot.setAttribute("opacity", "0");
      }
    });
  }

  function hideDots() {
    cursors.forEach(function (c) { c.dot.setAttribute("opacity", "0"); });
  }

  function setCursor(index, instant) {
    var target = XS[index];
    if (instant || reduce.matches) {
      cursorX = target;
      drawCursors();
      settleDots(index);
      return;
    }
    var from = cursorX;
    var start = 0;
    var DUR = 380;
    hideDots();
    function step(now) {
      if (!start) start = now;
      var t = Math.min(1, (now - start) / DUR);
      cursorX = from + (target - from) * ease(t);
      drawCursors();
      if (t < 1) { requestAnimationFrame(step); }
      else { cursorX = target; drawCursors(); settleDots(index); }
    }
    requestAnimationFrame(step);
  }

  /* --- 状態の反映 ---------------------------------------------------------- */

  function apply(instant) {
    var list = stops[state.quant];
    var index = Math.min(state.index, list.length - 1);
    state.index = index;
    var point = list[index];
    var values = metricValues(point);

    range.max = String(list.length - 1);
    range.value = String(index);
    range.setAttribute("aria-valuetext", group(point.ctx) + " トークン");
    ctxOut.textContent = group(point.ctx);

    Array.prototype.forEach.call(rows, function (row) { row.classList.remove("is-active"); });
    point.row.classList.add("is-active");

    /* 数字は補間せず、行き先の実測値へ即座に切り替える。針だけが遅れて追いつく。 */
    paint(values);
    setCursor(index, instant);

    if (announce) {
      announce.textContent = state.quant + "、文脈長 " + group(point.ctx) + "。" +
        "prefill " + point.prefill.toFixed(1) + "、" +
        "decode " + point.decode.toFixed(2) + "、" +
        "ngl " + point.ngl + "、" +
        "ピーク VRAM " + group(point.vram) + " MiB、" +
        "定格比 " + values.ratio.toFixed(1) + " パーセント。";
    }
  }

  /* --- 入力 ----------------------------------------------------------------- */

  range.addEventListener("input", function () {
    state.index = Number(range.value);
    apply(false);
  });

  Array.prototype.forEach.call(document.querySelectorAll('input[name="quant"]'), function (radio) {
    radio.addEventListener("change", function () {
      if (!radio.checked) return;
      state.quant = radio.value;
      apply(false);
    });
  });

  reduce.addEventListener("change", function () { apply(true); });

  /* --- レールの高さ --------------------------------------------------------- */

  /* レールの高さは中身で変わる。決め打ちすると、狭い画面で見出しがレールの下に潜る。
     実測して CSS 変数を上書きする。書体が届いた時点でも測り直す。 */
  var railEl = document.querySelector(".rail");
  function syncRailHeight() {
    if (railEl) document.documentElement.style.setProperty("--rail-h", railEl.offsetHeight + "px");
  }
  syncRailHeight();
  window.addEventListener("resize", syncRailHeight);
  /* レールが伸び縮みしたら、現在地の線も引き直す。 */
  function syncAll() { syncRailHeight(); onScroll(); }
  if (railEl && "ResizeObserver" in window) new ResizeObserver(syncAll).observe(railEl);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(syncAll);

  /* --- 目次の現在地 -------------------------------------------------------- */

  /* 「最後に反応した節」ではなく、レールのすぐ下を越えている最後の節を現在地にする。
     前者だと、最上部まで戻しても以前の節が指されたままになる。 */
  var links = document.querySelectorAll(".band-nav a");
  var sections = document.querySelectorAll("main section[id]");
  var byId = {};
  Array.prototype.forEach.call(links, function (a) {
    byId[a.getAttribute("href").slice(1)] = a;
  });

  var marked = null;
  function markCurrent() {
    /* 見出しは scroll-margin-top のぶんだけレールの下に着く。判定線をそこより上に置くと、
       飛んだ節ではなく 1 つ前の節が現在地になる。CSS から実際の値を取る。 */
    var gap = sections[0] ? parseFloat(getComputedStyle(sections[0]).scrollMarginTop) || 0 : 0;
    var line = (railEl ? railEl.offsetHeight : 72) + gap + 8;
    var current = sections[0];
    Array.prototype.forEach.call(sections, function (s) {
      if (s.getBoundingClientRect().top <= line) current = s;
    });
    if (!current || current === marked) return;
    var a = byId[current.id];
    if (!a) return;
    Array.prototype.forEach.call(links, function (x) { x.removeAttribute("aria-current"); });
    a.setAttribute("aria-current", "true");
    marked = current;
  }

  var queued = false;
  function onScroll() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () { queued = false; markCurrent(); });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  markCurrent();

  /* --- 開始 ----------------------------------------------------------------- */

  apply(true);
})();
