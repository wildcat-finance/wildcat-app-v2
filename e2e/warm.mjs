// Warm a freshly created fork: load the app's heavy pages once, sequentially, so the first real user/test
// does not trigger the full cold-storage fetch storm mid-transaction. Usage: node e2e/warm.mjs [baseUrl]
import { chromium } from "@playwright/test";
const base = process.argv[2] || "http://127.0.0.1:3000";
const pins = JSON.parse(
  (await import("node:fs")).readFileSync(
    new URL("../harness/fork/pins.json", import.meta.url),
    "utf8",
  ),
);
const b = await chromium.launch();
const p = await b.newPage();
for (const path of [
  `/lender/market/${pins.smoke.market}`,
  "/lender",
  "/lender/all-markets",
  `/lender/market/${pins.smoke.market}`,
]) {
  const t0 = Date.now();
  await p
    .goto(base + path, { waitUntil: "networkidle", timeout: 300_000 })
    .catch((e) => console.log(`  ${path}: ${e.message.split("\n")[0]}`));
  await p.waitForTimeout(5_000);
  console.log(`warm ${path} ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
await b.close();
const rpc = async (method, params = []) =>
  (
    await (
      await fetch("http://127.0.0.1:18545", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      })
    ).json()
  ).result;
const t0 = Date.now();
await rpc("anvil_mine", ["0x1"]);
console.log(
  `anvil_mine after warm-up: ${Date.now() - t0} ms; txpool ${JSON.stringify(
    await rpc("txpool_status"),
  )}`,
);
