// Email validation
export function isValidEmail(email?: string): boolean {
  if (!email) return true
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailPattern.test(email)
}

// URL validation
export function isValidUrl(url?: string): boolean {
  if (!url) return true
  const urlPattern =
    /^(https?:\/\/)?([a-zA-Z0-9.-]+)\.[a-zA-Z]{2,6}(\/[^\s]*)?$/
  return urlPattern.test(url)
}

// Twitter handle validation
export function isValidTwitterHandle(handle?: string): boolean {
  if (!handle) return true
  handle = handle.replace(/^@/, "")
  const twitterPattern = /^[A-Za-z0-9_]{1,15}$/
  return twitterPattern.test(handle)
}

// Telegram handle validation
export function isValidTelegramHandle(handle?: string): boolean {
  if (!handle) return true
  handle = handle.replace(/^@/, "")
  const telegramPattern = /^[A-Za-z0-9_]{5,32}$/
  return telegramPattern.test(handle)
}
