const bigIntPow10 = (exp: number): bigint => {
  let result = BigInt(1)
  for (let i = 0; i < exp; i += 1) {
    result *= BigInt(10)
  }
  return result
}

export const formatBigIntDecimal = (
  raw: string | bigint,
  decimals: number,
): string => {
  const value = typeof raw === "string" ? BigInt(raw) : raw
  const negative = value < BigInt(0)
  const absolute = negative ? -value : value

  if (decimals === 0) {
    return `${negative ? "-" : ""}${absolute.toString()}`
  }

  const divisor = bigIntPow10(decimals)
  const integerPart = absolute / divisor
  const fractionalPart = absolute % divisor
  const fractionalStr = fractionalPart.toString().padStart(decimals, "0")
  return `${negative ? "-" : ""}${integerPart.toString()}.${fractionalStr}`
}

const CSV_NEEDS_QUOTING = /[",\r\n]/

export const escapeCsvField = (value: string): string => {
  if (value === "") return ""
  if (!CSV_NEEDS_QUOTING.test(value)) return value
  return `"${value.replace(/"/g, '""')}"`
}
