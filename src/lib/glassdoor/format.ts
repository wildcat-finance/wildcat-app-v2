// Display rounding for Glass Door values. Values are computed exactly to the
// second and rounded only here, at display (product#908 ruling, 2026-10-20).
// The unit beside the number is copy and comes from glassDoor.json.

/**
 * A duration in hours with at most `decimals` places, rounded up, without
 * trailing zeros and with a thousands separator: 9.5, 54.6, 2,588.
 * Collapsed cards use one decimal and the expanded formula two; the API and
 * exports keep exact seconds.
 */
export function roundedHours(seconds: number, decimals = 1) {
  const scale = 10 ** decimals
  // From whole seconds, so exactly 9.5 h can't drift up to 9.6 h.
  const rounded = Math.ceil((Math.round(seconds) * scale) / 3_600) / scale
  return rounded.toLocaleString("en-US", { maximumFractionDigits: decimals })
}
