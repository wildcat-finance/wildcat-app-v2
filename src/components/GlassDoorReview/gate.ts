// Temporary: the metric review page (product#917) exists for preview deploys
// only. Production never serves it, even if this code reaches main.
export const reviewEnabled = (
  env: Record<string, string | undefined> = process.env,
) => env.VERCEL_ENV !== "production"

/** The page's path, with or without a locale prefix. */
export const isReviewPath = (pathname: string) =>
  /\/glassdoor-review\/?$/.test(pathname)

/** Where the page puts its metric list in the app's sidebar. */
export const REVIEW_NAV_ID = "glassdoor-review-nav"
