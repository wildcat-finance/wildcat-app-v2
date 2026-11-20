import chromium from "@sparticuz/chromium"
import puppeteer, { Browser, LaunchOptions } from "puppeteer"

export const launchPuppeteer = async (
  options?: LaunchOptions,
): Promise<Browser> => {
  if (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production"
  ) {
    const executablePath = await chromium.executablePath(
      "https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar",
    )
    return puppeteer.launch({
      executablePath,
      args: chromium.args,
      headless: chromium.headless,
      defaultViewport: chromium.defaultViewport,
      ...options,
    })
  }
  return puppeteer.launch({
    args: ["--no-sandbox"],
    headless: true,
    ...options,
  })
}

/// An A4 PDF of an agreement's HTML. The HTML holds text that borrowers and
/// token deployers chose, so the page runs no scripts.
export const renderAgreementPdf = async (html: string): Promise<Buffer> => {
  const browser = await launchPuppeteer()
  try {
    const page = await browser.newPage()
    await page.setJavaScriptEnabled(false)
    await page.goto(
      `data:text/html;charset=UTF-8,${encodeURIComponent(html)}`,
      { waitUntil: "networkidle0" },
    )
    return Buffer.from(
      await page.pdf({
        format: "A4",
        headerTemplate: "<p></p>",
        footerTemplate: "<p></p>",
        displayHeaderFooter: false,
        margin: { top: "40px", bottom: "40px" },
        printBackground: true,
      }),
    )
  } finally {
    await browser.close()
  }
}
