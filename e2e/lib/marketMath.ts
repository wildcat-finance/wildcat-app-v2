/**
 * Independent re-implementation of the v2.5 market interest arithmetic, used as the ORACLE for
 * accrual assertions. Deliberately NOT derived from the app or the SDK (COVERAGE-SUGGESTIONS
 * §"Execution and reporting guidance": "Do not mirror the app's helper calculation as the sole
 * expected-value oracle") — every function below mirrors a named line of the deployed protocol
 * source so a divergence between chain and app fails loudly instead of agreeing with itself.
 *
 * Sources (v2.5-protocol, generation v2.5.3 as deployed on this fork):
 *   libraries/MathUtils.sol:30    calculateLinearInterestFromBips
 *   libraries/MathUtils.sol:96    bipMul   (round half up)
 *   libraries/MathUtils.sol:132   bipToRay (a * 1e23)
 *   libraries/MathUtils.sol:149   rayMul   (round half up)
 *   libraries/MathUtils.sol:184   mulDiv   (floor)
 *   libraries/MarketState.sol:57  totalSupply  = normalizeAmount(scaledTotalSupply)
 *   libraries/MarketState.sol:76  normalizeAmount = rayMul(amount, scaleFactor)
 *   libraries/FeeMath.sol:40      applyProtocolFee (charged IN ADDITION to lender interest)
 *   market/WildcatMarketRevolving.sol:126  _calculateRevolvingBaseInterest
 *   market/WildcatMarketRevolving.sol:160  _updateScaleFactorAndFees
 */

export const RAY = 10n ** 27n
export const HALF_RAY = RAY / 2n
export const BIP = 10_000n
export const HALF_BIP = BIP / 2n
/** MathUtils.sol: BIP_RAY_RATIO = RAY / BIP. */
export const BIP_RAY_RATIO = RAY / BIP
/** MathUtils.sol:14 — SECONDS_IN_365_DAYS. */
export const SECONDS_IN_365_DAYS = 365n * 86_400n

/** MathUtils.sol:149 — `c := div(add(mul(a, b), HALF_RAY), RAY)`. */
export const rayMul = (a: bigint, b: bigint) => (a * b + HALF_RAY) / RAY

/** MathUtils.sol:96 — `c := div(add(mul(a, b), HALF_BIP), BIP)`. */
export const bipMul = (a: bigint, b: bigint) => (a * b + HALF_BIP) / BIP

/** MathUtils.sol:184 — plain floor division. */
export const mulDiv = (x: bigint, y: bigint, d: bigint) => (x * y) / d

/** MathUtils.sol:30 — `bipToRay(rateBip) * timeDelta / SECONDS_IN_365_DAYS` (floor). */
export const linearInterestRay = (rateBips: bigint, timeDelta: bigint) =>
  (rateBips * BIP_RAY_RATIO * timeDelta) / SECONDS_IN_365_DAYS

/** MarketState.sol:76 — normalizeAmount. */
export const normalizeAmount = (scaledAmount: bigint, scaleFactor: bigint) =>
  rayMul(scaledAmount, scaleFactor)

export type RevolvingAccrualInput = {
  /** Immutable per market — WildcatMarketRevolving.sol:17 (`internal immutable`). */
  commitmentFeeBips: bigint
  /** state.annualInterestBips — the borrower-configurable UTILIZATION APR on a revolving market. */
  annualInterestBips: bigint
  /** `_drawnAmount` at the start of the window (WildcatMarketRevolving.sol:139). */
  drawnAmount: bigint
  scaledTotalSupply: bigint
  scaleFactor: bigint
  protocolFeeBips: bigint
  timeDelta: bigint
  isClosed?: boolean
}

export type RevolvingAccrualPrediction = {
  baseInterestRay: bigint
  /** normalizeAmount(scaledTotalSupply) with the PRE-update scale factor. */
  totalSupplyBefore: bigint
  /** min(drawnAmount, totalSupply) — the cap in WildcatMarketRevolving.sol:154. */
  drawnClamped: bigint
  /** drawnClamped / totalSupply in bips (floor) — the MEASURED utilization. */
  utilizationBips: bigint
  /** Lender-side blended APR for the window, in bips: commitment + utilization-weighted. */
  blendedLenderAprBips: bigint
  scaleFactorAfter: bigint
  /** Interest credited to lenders over the window (normalized underlying units). */
  lenderInterest: bigint
  /** Protocol fee accrued over the window — charged to the borrower ON TOP of lender interest. */
  protocolFee: bigint
  /** Total increase in what the borrower owes: lender interest + protocol fee. */
  borrowerCost: bigint
}

/**
 * Project one accrual window on a REVOLVING market.
 *
 * WildcatMarketRevolving.sol:126-158
 *   baseInterestRay = linear(commitmentFeeBips, dt)
 *                   + mulDiv(linear(annualInterestBips, dt), min(drawn, totalSupply), totalSupply)
 * with no accrual at all while the market is closed or has zero scaled supply (:135).
 *
 * Note there is NO per-draw fee term: that feature was expressly excluded
 * (mono/kb/workstreams/v2.5/RCF_DRAW_FEE_DECISION_2026-08-12.md). Nothing here may grow a
 * draw-count- or draw-event-dependent component.
 *
 * Delinquency is deliberately absent: callers must assert the market never enters penalty over
 * the measured window (FeeMath.sol:51 updateDelinquency would otherwise add a second term).
 */
export const predictRevolvingAccrual = (
  input: RevolvingAccrualInput,
): RevolvingAccrualPrediction => {
  const {
    commitmentFeeBips,
    annualInterestBips,
    drawnAmount,
    scaledTotalSupply,
    scaleFactor,
    protocolFeeBips,
    timeDelta,
  } = input

  const totalSupplyBefore = normalizeAmount(scaledTotalSupply, scaleFactor)
  const drawnClamped =
    drawnAmount < totalSupplyBefore ? drawnAmount : totalSupplyBefore
  const utilizationBips =
    totalSupplyBefore > 0n ? mulDiv(drawnClamped, BIP, totalSupplyBefore) : 0n

  let baseInterestRay = 0n
  if (
    !input.isClosed &&
    timeDelta * scaledTotalSupply !== 0n // WildcatMarketRevolving.sol:135
  ) {
    baseInterestRay = linearInterestRay(commitmentFeeBips, timeDelta)
    if (annualInterestBips * drawnAmount !== 0n) {
      const annualInterestRay = linearInterestRay(annualInterestBips, timeDelta)
      baseInterestRay += mulDiv(
        annualInterestRay,
        drawnClamped,
        totalSupplyBefore,
      )
    }
  }

  // FeeMath.sol:40 — protocolFee is computed against the PRE-update scale factor.
  const protocolFee = rayMul(
    scaledTotalSupply,
    rayMul(scaleFactor, bipMul(protocolFeeBips, baseInterestRay)),
  )

  // WildcatMarketRevolving.sol:180 — scaleFactor += rayMul(scaleFactor, baseInterestRay).
  const scaleFactorAfter = scaleFactor + rayMul(scaleFactor, baseInterestRay)
  const lenderInterest =
    normalizeAmount(scaledTotalSupply, scaleFactorAfter) - totalSupplyBefore

  return {
    baseInterestRay,
    totalSupplyBefore,
    drawnClamped,
    utilizationBips,
    blendedLenderAprBips:
      commitmentFeeBips +
      (totalSupplyBefore > 0n
        ? mulDiv(drawnClamped, annualInterestBips, totalSupplyBefore)
        : 0n),
    scaleFactorAfter,
    lenderInterest,
    protocolFee,
    borrowerCost: lenderInterest + protocolFee,
  }
}

/**
 * The annualized rate a measured accrual implies, in bips.
 * Inverse of the linear formula: growth / principal * SECONDS_IN_365_DAYS / dt * BIP.
 * Returned scaled by 100 (i.e. hundredths of a bip) so sub-bip differences stay visible.
 */
export const impliedAprCentiBips = (
  growth: bigint,
  principal: bigint,
  timeDelta: bigint,
) => {
  if (principal === 0n || timeDelta === 0n) return 0n
  return (growth * BIP * 100n * SECONDS_IN_365_DAYS) / (principal * timeDelta)
}

export const absDiffBig = (a: bigint, b: bigint) => (a > b ? a - b : b - a)
