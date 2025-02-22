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
