import { launch, passCheckpoint, BASE } from "./common.mjs";
const { browser, page } = await launch({ width: 1280, height: 720, dsf: 2 });
await page.goto(BASE + "/", { waitUntil: "load" }); await passCheckpoint(page);
await page.goto(BASE + "/", { waitUntil: "networkidle" }).catch(()=>{});
await page.waitForTimeout(4000);
await page.addStyleTag({ content: `header{visibility:hidden !important}` });
await page.waitForTimeout(300);
await page.screenshot({ path: "landing_body_full.png", fullPage: true });
await browser.close();
