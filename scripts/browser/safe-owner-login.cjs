const assert = require("node:assert/strict")
const fs = require("node:fs/promises")
const http = require("node:http")
const os = require("node:os")
const path = require("node:path")
const esbuild = require("esbuild")
const puppeteer = require("puppeteer")
const chromium = require("@sparticuz/chromium")

const app =
  process.env.WILDCAT_BROWSER_APP_ROOT || path.resolve(__dirname, "../..")
const fixture = path.join(__dirname, "safe-owner-login")

async function run() {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "wildcat-safe-login-browser-"),
  )
  let browser
  let server
  try {
    await esbuild.build({
      absWorkingDir: app,
      entryPoints: [path.join(fixture, "entry.jsx")],
      bundle: true,
      outfile: path.join(directory, "bundle.js"),
      platform: "browser",
      jsx: "automatic",
      tsconfig: path.join(app, "tsconfig.json"),
      nodePaths: [path.join(app, "node_modules")],
      alias: { "wagmi/connectors": path.join(fixture, "connectors.js") },
      define: {
        "process.env.NODE_ENV": '"production"',
        "process.env.NEXT_PUBLIC_TARGET_NETWORK": '"Sepolia"',
        "process.env": "{}",
      },
      loader: { ".svg": "dataurl" },
      logLevel: "error",
    })
    const bundle = await fs.readFile(path.join(directory, "bundle.js"))
    server = http.createServer((req, res) => {
      if (req.url === "/")
        return res.end(
          '<iframe src="/frame" style="width:800px;height:900px"></iframe>',
        )
      if (req.url === "/frame")
        return res.end(
          '<div id="root"></div><script src="/bundle.js"></script>',
        )
      if (req.url === "/bundle.js") {
        res.setHeader("Content-Type", "application/javascript")
        return res.end(bundle)
      }
      res.statusCode = 404
      return res.end()
    })
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve))
    browser = await puppeteer.launch({
      executablePath: await chromium.executablePath(),
      args: chromium.args,
      headless: true,
    })
    const page = await browser.newPage()
    await page.setViewport({ width: 1000, height: 1000 })
    const errors = []
    page.on("pageerror", (error) => errors.push(error.message))
    await page.setRequestInterception(true)
    page.on("request", (req) => {
      if (req.url().startsWith("http://127.0.0.1:")) return req.continue()
      if (req.url().includes("Listings"))
        return req.respond({
          contentType: "application/json",
          headers: { "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify({ listings: {}, total: 0 }),
        })
      return req.abort()
    })
    await page.goto(`http://127.0.0.1:${server.address().port}/`)
    await page.bringToFront()
    const frame = page.frames().find((f) => f.url().endsWith("/frame"))
    await frame.waitForSelector("#login")
    await frame.evaluate(() => {
      window.findTestElement = (selector, root = document) => {
        for (const el of Array.from(root.querySelectorAll("*")).reverse()) {
          if (el.matches(selector)) return el
          if (el.shadowRoot) {
            const match = window.findTestElement(selector, el.shadowRoot)
            if (match) return match
          }
        }
        return null
      }
    })
    await frame.evaluate(() => window.safeLoginTest.connectPrimary())
    await frame.waitForFunction(() =>
      document.querySelector("#primary").textContent.includes("safe"),
    )
    await frame.click("#login")
    await frame.locator("button::-p-text(WalletConnect)").click()
    await frame.waitForFunction(() => window.findTestElement(".wcm-active"))
    const layers = await frame.evaluate(() => ({
      owner: Number(
        getComputedStyle(document.querySelector(".MuiDialog-root")).zIndex,
      ),
      walletConnect: Number(
        getComputedStyle(window.findTestElement(".wcm-overlay")).zIndex,
      ),
    }))
    assert(
      layers.walletConnect > layers.owner,
      `WalletConnect must be above the owner dialog: ${JSON.stringify(layers)}`,
    )
    await frame.evaluate(() => window.safeLoginTest.explorer())
    await frame.waitForFunction(() =>
      window.findTestElement('input[placeholder="Search wallets"]'),
    )
    const inputHandle = await frame.evaluateHandle(() =>
      window.findTestElement('input[placeholder="Search wallets"]'),
    )
    const input = inputHandle.asElement()
    await input.focus()
    await input.type("rabby", { delay: 50 })
    assert.equal(
      await input.evaluate((el) => el.value),
      "rabby",
      "WalletConnect search must retain keyboard focus",
    )
    assert.equal(await frame.evaluate(() => document.hasFocus()), true)

    await frame.evaluate(() => window.safeLoginTest.closeWalletConnect())
    await frame.waitForFunction(() =>
      document
        .querySelector('[role="alert"]')
        ?.textContent.includes("Connection request reset"),
    )
    await frame.evaluate(() => document.querySelector("#login").focus())
    assert.equal(
      await frame.evaluate(
        () => !!document.activeElement.closest(".MuiDialog-container"),
      ),
      true,
      "The chooser must restore keyboard containment after pairing closes",
    )

    await frame.locator("button::-p-text(WalletConnect)").click()
    await frame.waitForFunction(() => window.findTestElement(".wcm-active"))
    await frame.evaluate(() => window.safeLoginTest.setChain(1))
    await frame.waitForFunction(
      () =>
        !document.querySelector('[role="dialog"]') &&
        !window.findTestElement(".wcm-active"),
    )
    assert.equal(
      await frame.evaluate(() => window.safeLoginTest.state.errors.length),
      1,
    )

    assert.equal(
      await frame.evaluate(() => window.safeLoginTest.primary().toLowerCase()),
      "0xc15be5214978d1fc509ecdd4f9d5bc067c94d9ae",
    )
    assert.deepEqual(errors, [])
    console.log(
      "Safe login browser checks passed: modal stacking, wallet search, focus restoration, pairing cancellation and primary account isolation.",
    )
  } finally {
    if (browser) await browser.close()
    if (server) await new Promise((resolve) => server.close(resolve))
    await fs.rm(directory, { recursive: true, force: true })
  }
}
run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
