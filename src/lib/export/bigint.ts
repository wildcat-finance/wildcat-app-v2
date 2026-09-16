export const RAY = 10n ** 27n
export const BIPS = 10_000n
export const SECONDS_PER_YEAR = 365n * 24n * 60n * 60n

export const rayMul = (left: bigint, right: bigint) =>
  (left * right + RAY / 2n) / RAY

export const rayDiv = (left: bigint, right: bigint) => {
  if (right === 0n) throw new Error("Cannot divide a ray by zero")
  return (left * RAY + right / 2n) / right
}

export const formatUnits = (value: bigint, decimals: number): string => {
  const negative = value < 0n
  const absolute = negative ? -value : value
  if (decimals === 0) return `${negative ? "-" : ""}${absolute}`
  const scale = 10n ** BigInt(decimals)
  const whole = absolute / scale
  const fraction = (absolute % scale)
    .toString()
    .padStart(decimals, "0")
    .replace(/0+$/, "")
  return `${negative ? "-" : ""}${whole}${fraction ? `.${fraction}` : ""}`
}

export const percentFromBips = (value: bigint | number) =>
  (Number(value) / 100).toFixed(2)

export const percentFromRay = (ray: bigint, seconds: number) => {
  if (seconds <= 0) return "0.000000"
  const numerator = ray * SECONDS_PER_YEAR * 100_000_000n
  const denominator = RAY * BigInt(seconds)
  const annualPercentMillionths = (numerator + denominator / 2n) / denominator
  return `${annualPercentMillionths / 1_000_000n}.${(
    annualPercentMillionths % 1_000_000n
  )
    .toString()
    .padStart(6, "0")}`
}

export const formatFixed = (value: bigint, decimals: number) => {
  const negative = value < 0n
  const absolute = negative ? -value : value
  const scale = 10n ** BigInt(decimals)
  return `${negative ? "-" : ""}${absolute / scale}.${(absolute % scale)
    .toString()
    .padStart(decimals, "0")}`
}

/** Annualised percentage, expressed with six decimal places, without floats. */
export const annualPercent = (
  changeNumerator: bigint,
  changeDenominator: bigint,
  seconds: number,
) => {
  if (seconds <= 0 || changeDenominator === 0n) return "0.000000"
  const denominator = changeDenominator * BigInt(seconds)
  const millionths =
    (changeNumerator * SECONDS_PER_YEAR * 100_000_000n + denominator / 2n) /
    denominator
  return formatFixed(millionths, 6)
}

export const percentFromScaleFactors = (
  before: bigint,
  after: bigint,
  seconds: number,
) => annualPercent(after - before, before, seconds)

export const multiplyPercentByBips = (
  percent: string,
  bips: bigint | number,
) => {
  const [whole, fraction = ""] = percent.split(".")
  const millionths =
    BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, "0").slice(0, 6))
  return formatFixed((millionths * BigInt(bips) + BIPS / 2n) / BIPS, 6)
}

export const addPercentages = (...percentages: string[]) => {
  const millionths = percentages.reduce((sum, percent) => {
    const [whole, fraction = ""] = percent.split(".")
    return (
      sum +
      BigInt(whole) * 1_000_000n +
      BigInt(fraction.padEnd(6, "0").slice(0, 6))
    )
  }, 0n)
  return formatFixed(millionths, 6)
}
