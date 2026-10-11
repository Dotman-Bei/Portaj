// One continuous, real take of the Portaj flow on testnet.
// Headed Chrome inside Xvfb, captured with ffmpeg x11grab at 30fps (2560x1440, DSF 2).
// A cursor is drawn in-page (headless X has none); every move is eased and logged.
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

const OUT = process.argv[2] ?? "take";
const W = 1280, H = 720, DSF = 2;
const BASE = "https://portaj.ambit.surf";

const browser = await chromium.launch({
  headless: false,
  executablePath: process.env.HOME + "/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome",
  args: ["--no-sandbox", "--disable-blink-features=AutomationControlled", "--hide-scrollbars", `--force-device-scale-factor=${DSF}`,
    `--window-size=${W},${H + 120}`, "--window-position=0,0", "--no-first-run", "--disable-infobars", "--disable-features=Translate"],
  ignoreDefaultArgs: ["--enable-automation"],
});
const ctx = await browser.newContext({ viewport: null, colorScheme: "light", locale: "en-US" });
const page = await ctx.newPage();
page.on("response", async (r) => { if (r.url().includes("/api/")) console.log("API", r.status(), r.url().split("/api/")[1], (await r.text().catch(() => "")).slice(0, 160).replace(/\s+/g, " ")); });
page.on("pageerror", (e) => console.log("pageerror", String(e).slice(0, 160)));

// ---- in-page cursor -------------------------------------------------------
await page.addInitScript(() => {
  const ARROW = `<svg width="26" height="26" viewBox="0 0 26 26" xmlns="http://www.w3.org/2000/svg"><path d="M4 2.5 L4 20.2 L8.6 15.9 L11.6 22.6 L14.6 21.3 L11.7 14.7 L17.9 14.7 Z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
  const install = () => {
    if (document.getElementById("__cur") || !document.body) return;
    const st = document.createElement("style");
    st.textContent = `#__cur{position:fixed;left:0;top:0;width:26px;height:26px;pointer-events:none;z-index:2147483647;will-change:transform;filter:drop-shadow(0 1px 1.5px rgba(0,0,0,.28))}
#__cur svg{display:block;transform-origin:4px 3px;transition:transform 90ms ease-out}#__cur.down svg{transform:scale(.84)}
html{scroll-behavior:auto !important}`;
    document.head.appendChild(st);
    const c = document.createElement("div"); c.id = "__cur"; c.innerHTML = ARROW; document.body.appendChild(c);
    let p = { x: -60, y: -60 };
    try { p = JSON.parse(sessionStorage.getItem("__curpos")) || p; } catch {}
    const put = (x, y) => { c.style.transform = `translate(${x - 4}px,${y - 3}px)`; };
    put(p.x, p.y);
    addEventListener("mousemove", (e) => { put(e.clientX, e.clientY); try { sessionStorage.setItem("__curpos", JSON.stringify({ x: e.clientX, y: e.clientY })); } catch {} }, true);
    addEventListener("mousedown", () => c.classList.add("down"), true);
    addEventListener("mouseup", () => c.classList.remove("down"), true);
    window.__hideCursor = (h) => { c.style.opacity = h ? "0" : "1"; };
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install); else install();
  new MutationObserver(() => install()).observe(document, { childList: true, subtree: true });
});

// ---- virtual passkey (same as e2e/live.mjs) --------------------------------
const cdp = await ctx.newCDPSession(page);
await cdp.send("WebAuthn.enable");
await cdp.send("WebAuthn.addVirtualAuthenticator", { options: { protocol: "ctap2", ctap2Version: "ctap2_1", transport: "internal",
  hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true, hasPrf: true } });

// ---- helpers --------------------------------------------------------------
const sleep = (ms) => page.waitForTimeout(ms);
let rec = null, recT0 = 0;
const marks = [];
const now = () => (Date.now() - recT0) / 1000;
async function mark(name, extra = {}) {
  const m = { t: +now().toFixed(3), name, scrollY: await page.evaluate(() => scrollY).catch(() => null), ...extra };
  marks.push(m); console.log(m.t.toFixed(2), name);
}
async function box(locator) {
  const b = await locator.boundingBox();
  return b ? { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) } : null;
}
let cur = { x: 560, y: 600 };
// Minimum-jerk motion along a gentle arc; duration scales with distance.
async function moveTo(x, y, ms) {
  const from = { ...cur }, dx = x - from.x, dy = y - from.y, dist = Math.hypot(dx, dy);
  if (dist < 1) return;
  ms = ms ?? Math.min(1100, Math.max(420, 260 + dist * 0.9));
  const bend = Math.min(60, dist * 0.08) * (dx > 0 ? 1 : -1);
  const nx = -dy / dist, ny = dx / dist;
  const t0 = Date.now();
  for (;;) {
    const p = Math.min(1, (Date.now() - t0) / ms);
    const e = p * p * p * (10 - 15 * p + 6 * p * p);
    const arc = Math.sin(Math.PI * e) * bend;
    const px = from.x + dx * e + nx * arc, py = from.y + dy * e + ny * arc;
    await page.mouse.move(px, py);
    if (p >= 1) break;
    await new Promise((r) => setTimeout(r, 12));
  }
  cur = { x, y };
}
// Click, then wait for success; on a transient sponsor/firewall error, wait and click again.
async function clickUntil(locator, success, { tries = 4, timeout = 120000, recover, ...opts } = {}) {
  for (let i = 0; i < tries; i++) {
    await click(locator, opts);
    if (i === 0) await mark(opts.name ?? "click");
    else await mark((opts.name ?? "click") + "_retry" + i);
    const err = page.getByText(/sponsor service returned|Too many requests|Failed to (fetch|load)|Loading chunk|returned [45]\d\d/).first();
    const r = await Promise.race([success.waitFor({ timeout }).then(() => "ok"), err.waitFor({ timeout }).then(() => "err")]).catch(() => "timeout");
    if (r === "ok") return;
    console.log("retry", opts.name, r, await err.textContent().catch(() => ""));
    await mark((opts.name ?? "click") + "_failed" + i);
    await sleep(15000);
    if (recover) await recover();
  }
  throw new Error("gave up " + opts.name);
}
async function pointAt(locator, { dx = 0, dy = 0, ms, align = 0.5 } = {}) {
  await locator.waitFor({ state: "visible", timeout: 120000 });
  let b = await locator.boundingBox();
  if (b.y < 70 || b.y + b.height > H - 30) { await scrollIntoComfort(locator, 0.55, 1000); await sleep(150); b = await locator.boundingBox(); }
  await moveTo(b.x + b.width * align + dx, b.y + b.height / 2 + dy, ms);
  return b;
}
async function click(locator, opts = {}) {
  const b = await pointAt(locator, opts);
  await sleep(opts.settle ?? 260);
  await page.mouse.down(); await sleep(95); await page.mouse.up();
  return b;
}
// Eased programmatic scroll, the way a trackpad glide looks.
async function scrollTo(y, ms = 1200) {
  await page.evaluate(async ({ y, ms }) => {
    const s0 = scrollY, d = y - s0, t0 = performance.now();
    await new Promise((r) => { const f = (t) => { const p = Math.min(1, (t - t0) / ms); const e = p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; scrollTo({ top: s0 + d * e, behavior: "instant" }); p < 1 ? requestAnimationFrame(f) : r(); }; requestAnimationFrame(f); });
  }, { y, ms });
}
async function scrollIntoComfort(locator, topFrac = 0.35, ms = 1100) {
  const b = await locator.boundingBox();
  const sy = await page.evaluate(() => scrollY);
  const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  const target = Math.max(0, Math.min(max, sy + b.y - H * topFrac));
  if (Math.abs(target - sy) > 4) await scrollTo(target, ms);
}
async function passCheckpoint() {
  for (let i = 0; i < 40; i++) { const c = await page.content().catch(() => "Vercel Security Checkpoint"); if (!/Vercel Security Checkpoint/.test(c)) return; await sleep(1000); }
  throw new Error("checkpoint");
}
async function fitWindow() {
  const { windowId } = await cdp.send("Browser.getWindowForTarget");
  for (let i = 0; i < 4; i++) {
    const [ow, oh, iw, ih] = await page.evaluate(() => [outerWidth, outerHeight, innerWidth, innerHeight]);
    if (iw === W && ih === H) return;
    await cdp.send("Browser.setWindowBounds", { windowId, bounds: { left: 0, top: 0, width: ow + (W - iw), height: oh + (H - ih) } });
    await sleep(600);
  }
}
async function startRec() {
  await fitWindow();
  const off = await page.evaluate(() => [outerHeight - innerHeight, innerWidth, innerHeight]);
  console.log("chrome offset", off);
  if (off[1] !== W || off[2] !== H) throw new Error(`viewport ${off}`);
  const y = off[0] * DSF;
  rec = spawn("ffmpeg", ["-hide_banner", "-loglevel", "warning", "-y", "-use_wallclock_as_timestamps", "1", "-f", "x11grab", "-framerate", "30", "-video_size", `${W * DSF}x${H * DSF}`, "-draw_mouse", "0",
    "-i", `${process.env.DISPLAY}.0+0,${y}`, "-c:v", "mjpeg", "-q:v", "2", "-fps_mode", "cfr", "-r", "30", `${OUT}.avi`], { stdio: ["pipe", "inherit", "inherit"] });
  recT0 = Date.now();
  await sleep(700);
  // Sync flash: one black frame block we can find in the video.
  await page.evaluate(() => { const d = document.createElement("div"); d.id = "__sync"; d.style.cssText = "position:fixed;inset:0;background:#000;z-index:2147483647"; document.body.appendChild(d); });
  await mark("sync_on");
  await sleep(400);
  await page.evaluate(() => document.getElementById("__sync")?.remove());
  await mark("sync_off");
}
async function stopRec() { rec.stdin.write("q"); await new Promise((r) => rec.on("close", r)); }

// ---- the take -------------------------------------------------------------
const ready = () => page.getByText(/RPC (healthy|unreachable)/).first().waitFor({ timeout: 30000 });
await page.goto(BASE + "/app", { waitUntil: "load" });
await passCheckpoint();
await ready();
await sleep(1500);
await page.goto(BASE + "/app", { waitUntil: "networkidle" }).catch(() => {});
await passCheckpoint();
await ready();
await sleep(2500);
await page.mouse.move(cur.x, cur.y);
await startRec();

try {
  await sleep(1000);
  await mark("wallet_page", { create: await box(page.getByRole("button", { name: "Create test wallet" })) });
  await sleep(1600);

  // Wallet: one passkey, then test USDC.
  const create = page.getByRole("button", { name: "Create test wallet" });
  const reloadWallet = async () => { await page.reload({ waitUntil: "load" }); await passCheckpoint(); await ready(); await sleep(1500); };
  await clickUntil(create, page.locator("a", { hasText: /^C[A-Z2-7]{55}$/ }).first(), { settle: 350, name: "create_click", timeout: 60000, recover: reloadWallet });
  await mark("wallet_created", { usdcBtn: await box(page.getByRole("button", { name: "Get test USDC" })), bal: await box(page.getByTestId("wallet-usdc")) });
  await sleep(1300);
  const getUsdc = page.getByRole("button", { name: "Get test USDC" });
  await clickUntil(getUsdc, page.getByTestId("wallet-usdc").filter({ hasText: /25\.0000000/ }), { name: "usdc_click", timeout: 60000, recover: reloadWallet });
  await mark("usdc_arrived", { bal: await box(page.getByTestId("wallet-usdc")) });
  await sleep(2200);
  const toCarry = page.getByRole("link", { name: /Carry to an exchange/ }).first();
  await click(toCarry);
  await mark("carry_click");
  await page.waitForURL(/\/app\/carry/, { timeout: 30000 });
  await ready();
  await page.getByTestId("wallet-balance").filter({ hasText: /USDC/ }).waitFor({ timeout: 30000 });
  await sleep(300);
  await mark("carry_page");
  await sleep(1200);

  // Exchange details from the simulator.
  const sim = page.getByRole("button", { name: /Use the exchange simulator/ });
  await click(sim, { align: 0.3 });
  await mark("sim_click");
  await page.getByText("Memo required (SEP-29)").waitFor({ timeout: 30000 });
  await mark("sim_filled", { dest: await box(page.locator('input[name="destination"]')), memo: await box(page.locator('input[name="memo"]')) });
  await sleep(1800);

  // The normal way: refused by the network.
  const tryNormal = page.getByTestId("try-normal");
  await mark("normal_move", { normal: await box(tryNormal) });
  const result = page.getByTestId("before-result");
  await clickUntil(tryNormal, result, { settle: 350, name: "normal_click" });
  await sleep(250);
  await mark("normal_result", { result: await box(result) });
  await sleep(300);
  await scrollIntoComfort(result, 0.2, 1200);
  await mark("normal_scrolled", { result: await box(result) });
  // Let the eye read it; drift the cursor off the text.
  await sleep(500);
  const rb = await result.boundingBox();
  await moveTo(rb.x + rb.width - 30, rb.y + 30, 900);
  await sleep(3500);
  await mark("normal_read_done");

  // Drop the memo: it lands, uncredited.
  const noMemo = page.getByRole("button", { name: "Send without the memo" });
  const landed = page.getByRole("link", { name: "It landed on chain" });
  await clickUntil(noMemo, landed, { name: "nomemo_click" });
  await mark("nomemo_landed", { landed: await box(landed), result: await box(result) });
  await sleep(2400);

  // With Portaj: amount, passkey, setup, send.
  const amount = page.locator('input[name="amount"]');
  await scrollIntoComfort(amount, 0.55, 900);
  await click(amount, { align: 0.15 });
  await sleep(250);
  await page.keyboard.type("20", { delay: 170 });
  await mark("amount_typed", { amount: await box(amount) });
  await sleep(700);
  const cont = page.getByRole("button", { name: "Continue with passkey" });
  const exitAcct = page.getByTestId("exit-account");
  await clickUntil(cont, exitAcct, { name: "continue_click" });
  await sleep(300);
  await mark("exit_account", { exit: await box(exitAcct) });
  await sleep(900);
  const setup = page.getByRole("button", { name: "Set up (paid by Portaj)" });
  await scrollIntoComfort(exitAcct, 0.12, 1300);
  await mark("exit_scrolled", { exit: await box(exitAcct), setup: await box(setup) });
  await sleep(2200);
  const send = page.getByTestId("send");
  await clickUntil(setup, send, { name: "setup_click" });
  await sleep(300);
  await mark("setup_done", { send: await box(send) });
  await sleep(1500);
  const receipt = page.getByTestId("receipt");
  await clickUntil(send, receipt, { settle: 350, name: "send_click", timeout: 150000 });
  await sleep(200);
  await mark("receipt", { receipt: await box(receipt) });
  await sleep(1500);
  await scrollIntoComfort(receipt, 0.08, 1300);
  await mark("receipt_scrolled", { receipt: await box(receipt) });
  await moveTo(560, 380, 900);
  await sleep(4200);
  await mark("receipt_read_done");

  // The exchange credits the memo.
  const seeIt = page.getByRole("link", { name: "See it credited" });
  await click(seeIt);
  await mark("seeit_click");
  await page.waitForURL(/\/app\/exchange/, { timeout: 30000 });
  const credited = page.getByTestId("credited");
  await credited.waitFor({ timeout: 30000 });
  await page.getByText("yours").first().waitFor({ timeout: 30000 }).catch(() => {});
  await sleep(300);
  await mark("exchange", { credited: await box(credited) });
  await sleep(2600);
  const unc = page.getByTestId("uncredited");
  await scrollIntoComfort(unc, 0.3, 1600);
  await mark("uncredited", { unc: await box(unc) });
  await sleep(3500);
  await mark("end");
} catch (e) {
  console.log("ERROR", e.message.split("\n")[0]);
  await mark("error", { msg: e.message.split("\n")[0] });
  await page.screenshot({ path: `${OUT}-error.png` }).catch(() => {});
} finally {
  await stopRec();
  writeFileSync(`${OUT}.marks.json`, JSON.stringify(marks, null, 1));
  await browser.close();
}
