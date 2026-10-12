/* CDP に直に繋ぐための最小の道具。依存ゼロ（Node 内蔵の WebSocket を使う）。 */

import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";


/* 実行する人の環境で違うので、環境変数を最優先にし、次によくある置き場を探す。
   見つからなければ、何を設定すればよいかを言って止まる。 */
function findChrome() {
  if (process.env.CHROME_BIN) return process.env.CHROME_BIN;
  const cache = join(homedir(), ".cache", "ms-playwright");
  if (existsSync(cache)) {
    const hits = readdirSync(cache)
      .filter(d => d.startsWith("chromium-"))
      .sort()
      .reverse()
      .map(d => join(cache, d, "chrome-linux64", "chrome"))
      .filter(existsSync);
    if (hits.length) return hits[0];
  }
  for (const p of ["/usr/bin/chromium", "/usr/bin/google-chrome", "/usr/bin/chromium-browser"]) {
    if (existsSync(p)) return p;
  }
  throw new Error("Chromium が見つかりません。CHROME_BIN に実行ファイルの場所を入れてください。");
}

export const CHROME = findChrome();
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function launch({ width = 1440, height = 900, mobile = false } = {}) {
  const profile = mkdtempSync(join(tmpdir(), "cdp-"));
  const port = 9500 + Math.floor(Math.random() * 400);

  const chrome = spawn(CHROME, [
    "--headless=new", "--no-sandbox", "--disable-dev-shm-usage", "--hide-scrollbars",
    "--force-device-scale-factor=1",
    `--user-data-dir=${profile}`,
    `--remote-debugging-port=${port}`,
    `--window-size=${width},${height}`,
    "about:blank",
  ], { stdio: ["ignore", "ignore", "pipe"] });

  let stderr = "";
  chrome.stderr.on("data", (d) => { stderr += d.toString(); });

  let wsUrl = null;
  for (let i = 0; i < 100 && !wsUrl; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (r.ok) wsUrl = (await r.json()).webSocketDebuggerUrl;
    } catch { /* まだ起動していない */ }
    if (!wsUrl) await sleep(120);
  }
  if (!wsUrl) throw new Error("chrome did not start\n" + stderr.slice(-800));

  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  const events = [];
  const waiters = [];

  await new Promise((res, rej) => {
    ws.addEventListener("open", res, { once: true });
    ws.addEventListener("error", rej, { once: true });
  });

  ws.addEventListener("message", (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
    } else if (msg.method) {
      events.push(msg);
      for (const w of waiters.slice()) {
        if (w.match(msg)) { waiters.splice(waiters.indexOf(w), 1); w.resolve(msg); }
      }
    }
  });

  const send = (method, params = {}, sessionId) => {
    const mid = ++id;
    return new Promise((resolve, reject) => {
      pending.set(mid, { resolve, reject });
      ws.send(JSON.stringify({ id: mid, method, params, sessionId }));
    });
  };

  const once = (match, timeout = 20000) => {
    const found = events.find(match);
    if (found) return Promise.resolve(found);
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("timeout: " + match)), timeout);
      waiters.push({ match, resolve: (m) => { clearTimeout(t); resolve(m); } });
    });
  };

  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });

  const page = {
    send: (m, p) => send(m, p, sessionId),
    once,
    events,
    async goto(url, { waitMs = 900, js = true } = {}) {
      await page.send("Page.enable");
      await page.send("Emulation.setDeviceMetricsOverride", {
        width, height, deviceScaleFactor: 1, mobile,
      });
      /* JS を切ると CDP の評価も止まるので、読み込みが済んだら必ず戻す。 */
      await page.send("Emulation.setScriptExecutionDisabled", { value: !js });
      events.length = 0;
      const loaded = once((m) => m.method === "Page.loadEventFired");
      await page.send("Page.navigate", { url });
      await loaded;
      await sleep(waitMs);
      if (!js) await page.send("Emulation.setScriptExecutionDisabled", { value: false });
    },
    async eval(expression, awaitPromise = false) {
      const r = await page.send("Runtime.evaluate", { expression, awaitPromise, returnByValue: true });
      if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails.exception));
      return r.result.value;
    },
  };

  return { page, chrome, close: () => { ws.close(); chrome.kill("SIGKILL"); } };
}
