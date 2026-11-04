// Temporary: the metric review page (product#917) exists for preview deploys
// only. Production never serves it, even if this code reaches main.
export const reviewEnabled = (
  env: Record<string, string | undefined> = process.env,
) => env.VERCEL_ENV !== "production"
