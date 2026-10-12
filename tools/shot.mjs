#!/usr/bin/env node
/* 画面を撮る。依存ゼロ（Node 内蔵の WebSocket で CDP を直に叩く）。
   使い方: node tools/shot.mjs <url> <out.png> <width> <height> [--full] [--dark] [--wait=ms] */

import { spawn } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { CHROME } from "./cdp.mjs";

const [url, out, wArg, hArg, ...rest] = process.argv.slice(2);
if (!url || !out) {
  console.error("usage: shot.mjs <url> <out.png> <width> <height> [--full] [--dark] [--wait=ms]");
  process.exit(2);
}
const width = Number(wArg || 1440);
const height = Number(hArg || 900);
const full = rest.includes("--full");
const dark = rest.includes("--dark");
const atSel = (rest.find((a) => a.startsWith("--at=")) || "").split("=").slice(1).join("=");
const doJs = (rest.find((a) => a.startsWith("--do=")) || "").split("=").slice(1).join("=");
const waitMs = Number((rest.find((a) => a.startsWith("--wait=")) || "--wait=1200").split("=")[1]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const profile = mkdtempSync(join(tmpdir(), "shot-"));
const port = 9500 + Math.floor(Math.random() * 400);

const chrome = spawn(CHROME, [
  "--headless=new",
  "--no-sandbox",
  "--disable-dev-shm-usage",
  "--hide-scrollbars",
  "--force-device-scale-factor=1",
  `--user-data-dir=${profile}`,
  `--remote-debugging-port=${port}`,
  `--window-size=${width},${height}`,
  "about:blank",
], { stdio: ["ignore", "ignore", "pipe"] });

let stderr = "";
chrome.stderr.on("data", (d) => { stderr += d.toString(); });

async function endpoint() {
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (r.ok) return (await r.json()).webSocketDebuggerUrl;
    } catch { /* まだ起動中 */ }
    await sleep(120);
  }
  throw new Error("chrome did not start\n" + stderr.slice(-800));
}

function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let id = 0;
    const pending = new Map();
    const events = [];
    const waiters = [];
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && pending.has(msg.id)) {
        const { resolve: res, reject: rej } = pending.get(msg.id);
        pending.delete(msg.id);
        msg.error ? rej(new Error(JSON.stringify(msg.error))) : res(msg.result);
      } else if (msg.method) {
        events.push(msg);
        waiters.slice().forEach((w) => {
          if (w.match(msg)) { waiters.splice(waiters.indexOf(w), 1); w.resolve(msg); }
        });
      }
    });
    ws.addEventListener("error", reject);
    ws.addEventListener("open", () => resolve({
      send(method, params = {}, sessionId) {
        const mid = ++id;
        return new Promise((res, rej) => {
          pending.set(mid, { resolve: res, reject: rej });
          ws.send(JSON.stringify({ id: mid, method, params, sessionId }));
        });
      },
      once(match, timeout = 15000) {
        const found = events.find(match);
        if (found) return Promise.resolve(found);
        return new Promise((res, rej) => {
          const t = setTimeout(() => rej(new Error("timeout waiting for " + match)), timeout);
          waiters.push({ match, resolve: (m) => { clearTimeout(t); res(m); } });
        });
      },
      close() { ws.close(); },
    }));
  });
}

try {
  const wsUrl = await endpoint();
  const cdp = await connect(wsUrl);

  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
  const S = (m, p) => cdp.send(m, p, sessionId);

  await S("Page.enable");
  await S("Emulation.setDeviceMetricsOverride", {
    width, height, deviceScaleFactor: 1, mobile: width < 600,
  });
  await S("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-color-scheme", value: dark ? "dark" : "light" }],
  });

  const loaded = cdp.once((m) => m.method === "Page.loadEventFired", 20000);
  await S("Page.navigate", { url });
  await loaded;
  await sleep(waitMs);

  const metrics = await S("Page.getLayoutMetrics");

  /* loading="lazy" の画像は画面外だと読み込まれない。撮る前に一度通す。 */
  await S("Runtime.evaluate", {
    expression: `(async () => {
      const step = window.innerHeight;
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 120));
      }
      window.scrollTo(0, ${atSel ? `document.querySelector(${JSON.stringify(atSel)}).getBoundingClientRect().top + window.scrollY - 8` : "0"});
      await new Promise((r) => setTimeout(r, 250));
      return document.images.length + "/" + Array.from(document.images).filter((i) => i.complete && i.naturalWidth > 0).length;
    })()`,
    awaitPromise: true,
    returnByValue: true,
  }).then((r) => {
    if (r.result && r.result.value) console.log("images loaded: " + r.result.value);
  });

  let clip = null;

  if (doJs) {
    const out = await S("Runtime.evaluate", { expression: doJs, awaitPromise: true, returnByValue: true });
    console.log("do: " + JSON.stringify(out.result && out.result.value));
    await sleep(700);
  }
  if (atSel) {
    const probe = await S("Runtime.evaluate", {
      expression: `(() => {
        const e = document.querySelector(${JSON.stringify(atSel)});
        if (!e) return "";
        const r = e.getBoundingClientRect();
        return JSON.stringify({ x: r.x + window.scrollX, y: r.y + window.scrollY, w: r.width, h: r.height });
      })()`,
      returnByValue: true,
    });
    const box = probe.result && probe.result.value ? JSON.parse(probe.result.value) : null;
    if (!box) throw new Error("selector not found: " + atSel);
    clip = { x: Math.max(0, box.x - 8), y: Math.max(0, box.y - 8), width: box.w + 16, height: box.h + 16, scale: 1 };
  } else if (full) {
    clip = {
      x: 0, y: 0,
      width: Math.min(metrics.cssContentSize.width, 2000),
      height: Math.min(metrics.cssContentSize.height, 12000),
      scale: 1,
    };
  }

  const shot = await S("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: Boolean(clip),
    ...(clip ? { clip } : {}),
  });

  writeFileSync(out, Buffer.from(shot.data, "base64"));
  const h = (metrics.cssContentSize.height).toFixed(0);
  console.log(`${out}  ${width}x${height}  pageHeight=${h}px${full ? " (full)" : ""}${dark ? " dark" : ""}`);

  cdp.close();
} finally {
  chrome.kill("SIGKILL");
}
