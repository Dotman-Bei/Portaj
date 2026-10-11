import { chromium } from "playwright-core";
export const BASE = "https://portaj.ambit.surf";
export async function launch({ width = 1440, height = 810, dsf = 1 } = {}) {
  const browser = await chromium.launch({ executablePath: process.env.HOME + "/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome", args: ["--no-sandbox", "--disable-blink-features=AutomationControlled", "--hide-scrollbars"] });
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dsf, colorScheme: "light", userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("pageerror", String(e).slice(0, 200)));
  await page.addInitScript(() => {
    const c = navigator.credentials; const get = c.get.bind(c); const create = c.create.bind(c);
    window.__prompts = 0; c.get = (o) => (window.__prompts++, get(o)); c.create = (o) => (window.__prompts++, create(o));
  });
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("WebAuthn.enable");
  await cdp.send("WebAuthn.addVirtualAuthenticator", { options: { protocol: "ctap2", ctap2Version: "ctap2_1", transport: "internal", hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true, hasPrf: true } });
  return { browser, ctx, page, cdp };
}
export async function passCheckpoint(page) {
  for (let i = 0; i < 30; i++) { const c = await page.content().catch(() => "Vercel Security Checkpoint"); if (!/Vercel Security Checkpoint/.test(c)) return; await page.waitForTimeout(1000); }
  throw new Error("checkpoint");
}
