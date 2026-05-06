const puppeteer = require("puppeteer")

const BASE_URL = process.env.SCROLL_TEST_BASE_URL || "http://localhost:3000"
const EXECUTABLE_PATH =
  process.env.PUPPETEER_EXECUTABLE_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

const ROUTES = ["/lender", "/borrower"]
const VIEWPORTS = [
  { label: "100%", width: 1920, height: 1080 },
  { label: "125%", width: 1536, height: 864 },
  { label: "150%", width: 1280, height: 720 },
  { label: "175%", width: 1097, height: 617 },
  { label: "200%", width: 960, height: 540 },
]

const getNestedVerticalScrollContainers = () => {
  const isScrollable = (element) => {
    const style = window.getComputedStyle(element)
    const overflowY = style.overflowY
    return (
      ["auto", "scroll", "overlay"].includes(overflowY) &&
      element.scrollHeight > element.clientHeight + 1
    )
  }

  const describe = (element) => {
    const classes =
      typeof element.className === "string"
        ? element.className.trim().split(/\s+/).slice(0, 3).join(".")
        : ""
    const selector = [
      element.tagName.toLowerCase(),
      element.id ? `#${element.id}` : "",
      classes ? `.${classes}` : "",
    ].join("")

    return {
      selector,
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
      text: (element.textContent || "")
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 80),
    }
  }

  return Array.from(document.body.querySelectorAll("*"))
    .filter(isScrollable)
    .map(describe)
}

const main = async () => {
  const browser = await puppeteer.launch({
    executablePath: EXECUTABLE_PATH,
    headless: true,
    args: ["--no-sandbox"],
  })

  try {
    for (const route of ROUTES) {
      for (const viewport of VIEWPORTS) {
        const page = await browser.newPage()
        await page.setViewport({
          width: viewport.width,
          height: viewport.height,
          deviceScaleFactor: 1,
        })

        await page.goto(`${BASE_URL}${route}`, {
          waitUntil: "networkidle2",
          timeout: 60000,
        })
        await new Promise((resolve) => {
          setTimeout(resolve, 3000)
        })

        const nestedScrollContainers = await page.evaluate(
          getNestedVerticalScrollContainers,
        )

        if (nestedScrollContainers.length > 0) {
          throw new Error(
            `${route} has nested vertical scroll containers at ${
              viewport.label
            } zoom:\n${JSON.stringify(nestedScrollContainers, null, 2)}`,
          )
        }

        await page.close()
      }
    }
  } finally {
    await browser.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
