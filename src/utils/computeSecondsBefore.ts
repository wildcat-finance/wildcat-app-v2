import {
  Market,
  TokenAmount,
  bipToRay,
  SECONDS_IN_365_DAYS,
} from "@wildcatfi/wildcat-sdk"

// fallback to compute seconds before delinquency in the case
// of zero-reserve-ration where sdk returns 0 seconds
// TODO: consult with the blade (Dillon) on whether this should be moved to sdk

export function computeSecondsBefore(
  market: Market,
  borrowAmountToken?: TokenAmount,
): number {
  // use SDK-provided value if non-zero (covers usual reserve-driven case)
  const sdkSeconds = borrowAmountToken
    ? market.getSecondsBeforeDelinquencyForBorrowedAmount(borrowAmountToken)
    : market.secondsBeforeDelinquency

  if (sdkSeconds > 0) return sdkSeconds

  // if sdk says 0 seconds then check if protocol fees are still play-on
  if (market.totalDebts.gt(0) && !market.isClosed) {
    // numerator = liquidReserves - minimumReserves (and subtract borrow amount if simulating a tx)
    // we use this as the buffer that protocol fees can erode over time
    // start with the base buffer: liquidReserves minus the policy minimum reserves
    let reserveBuffer = market.liquidReserves.sub(market.minimumReserves)
    // if we're simulating after a borrow, also subtract the borrow amount from the buffer
    if (borrowAmountToken) {
      reserveBuffer = reserveBuffer.sub(borrowAmountToken)
    }

    // means liquid reserves are at or below minimum after
    // accounting for the borrow there is no runway for protocol fees
    if (reserveBuffer.raw.lte(0)) return 0

    try {
      // calc erosion of reserves per second due to protocol fees
      // 1) take totalSupply, scale by annual APR (converted to ray)
      // 2) divide by seconds per year to get per-second interest on supply
      // 3) take the protocol's share of that interest (protocolFeeBips)
      const protocolInterestPerSecond = market.totalSupply
        .rayMul(bipToRay(market.annualInterestBips))
        .div(SECONDS_IN_365_DAYS)
        .bipMul(market.protocolFeeBips)

      // if that protocol-driven depletion is non-zero, compute seconds = numerator / rate
      if (!protocolInterestPerSecond.raw.eq(0)) {
        // divide the available buffer by the per-second drain to get seconds remaining
        const seconds = reserveBuffer
          .div(protocolInterestPerSecond, true)
          .raw.toNumber()
        if (seconds > 0) return seconds
      }
    } catch (e) {
      // if anything goes wrong with the math, ignore me and fall back to sdk value (preserve behaviour)
    }
  }

  return sdkSeconds
}
