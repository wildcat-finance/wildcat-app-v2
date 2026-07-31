import { useEffect, useMemo, useState } from "react"

import { useQuery } from "@tanstack/react-query"
import {
  MarketAccount,
  TokenAmount,
  TokenWrapper,
} from "@wildcatfi/wildcat-sdk"
import { useAccount } from "wagmi"

import { QueryKeys } from "@/config/query-keys"
import { useWrapperBalances } from "@/hooks/wrapper/useWrapperBalances"
import { useWrapperLimits } from "@/hooks/wrapper/useWrapperLimits"

/** Decimal places shown in the amount field (matches NumberTextField). */
export const AMOUNT_DISPLAY_DECIMALS = 5

export enum WithdrawRouteMode {
  /** Direct balance is drained first, the remainder is unwrapped. */
  Auto = "auto",
  /** Only the wrapped position is unwound; the direct balance is untouched. */
  WrappedOnly = "wrapped",
}

export type WithdrawRoute = {
  /** Clamped intent, denominated in the market's underlying token. */
  amount: TokenAmount
  /** Portion served from the directly-held market tokens. */
  fromDirect: TokenAmount
  /** Portion that has to be unwrapped first (in market-token terms). */
  fromWrapped: TokenAmount
  /** True when the route sweeps the whole position (both sources at max). */
  isFullMax: boolean
  usesWrapped: boolean
}

/**
 * Routing core for the withdraw flow.
 *
 * The lender types ONE amount in the market's underlying token; this hook
 * decides how much comes from the directly-held market tokens and how much has
 * to be unwrapped from the ERC-4626 wrapper first.
 *
 * All arithmetic is done on TokenAmount/BigNumber. Nothing is ever derived from
 * a formatted string: a chip fill carries the exact TokenAmount alongside the
 * text it puts in the field, because `toFixed`-style rounding can round UP over
 * the real balance and would either block the max chip or revert on-chain.
 */
export const useWithdrawRouting = ({
  marketAccount,
  wrapper,
  hasWrapper,
}: {
  marketAccount: MarketAccount
  wrapper?: TokenWrapper
  hasWrapper?: boolean
}) => {
  const { market } = marketAccount
  const { address } = useAccount()

  const [amountInput, setAmountInput] = useState("")
  const [mode, setMode] = useState<WithdrawRouteMode>(WithdrawRouteMode.Auto)
  // Exact amount captured when a quick-fill chip is used, so the transaction is
  // built from the real balance rather than the rounded display string.
  const [exactAmount, setExactAmount] = useState<TokenAmount>()

  const { data: balances } = useWrapperBalances(
    market.chainId,
    wrapper,
    address,
  )
  const { data: limits } = useWrapperLimits(market.chainId, wrapper, address)

  const shareBalance = balances?.shareBalance

  const direct = marketAccount.marketBalance

  const zero = useMemo(() => market.underlyingToken.getAmount(0), [market])

  /** The app-wide dust floor; a wrapped draw below this is not worth a tx. */
  const dustFloor = useMemo(
    () => market.underlyingToken.parseAmount("0.00001"),
    [market],
  )

  /**
   * The authoritative wrapped ceiling is the wrapper's own `maxWithdraw` — the
   * EIP-4626 quantity guaranteed not to revert. A client-side
   * `previewRedeem(shareBalance)` can sit above it and trip
   * `WithdrawMoreThanMax()`.
   */
  const wrappedCap = hasWrapper && wrapper ? limits?.maxWithdraw : undefined

  /**
   * Treat the wrapped position as present only when it is actually withdrawable.
   * Dust shares round to "0" on screen, so gating on `shareBalance > 0` showed
   * an "≈ 0 wrapped" breakdown and a Wrapped option that could do nothing.
   */
  const hasWrappedPosition = !!wrappedCap && wrappedCap.gte(dustFloor)

  const wrappedAvailable = hasWrappedPosition ? wrappedCap : undefined

  const combinedMax = useMemo(
    () => (wrappedAvailable ? direct.add(wrappedAvailable) : direct),
    [direct, wrappedAvailable],
  )

  const isWrappedOnly = mode === WithdrawRouteMode.WrappedOnly

  const maxForMode = useMemo(() => {
    if (isWrappedOnly) return wrappedAvailable ?? zero
    return combinedMax
  }, [isWrappedOnly, wrappedAvailable, combinedMax, zero])

  /** Raw typed intent (unclamped) — used to detect an over-max entry. */
  const typedAmount = useMemo(() => {
    if (exactAmount) return exactAmount
    const sanitized = amountInput.replace(/,/g, "")
    if (!sanitized) return zero
    try {
      return market.underlyingToken.parseAmount(sanitized)
    } catch {
      return undefined
    }
  }, [exactAmount, amountInput, market, zero])

  const overMax = !!typedAmount && typedAmount.gt(maxForMode)

  /** The field currently holds exactly the direct balance (chip is applied). */
  const isDirectFilled =
    !isWrappedOnly &&
    !!typedAmount &&
    !typedAmount.raw.isZero() &&
    typedAmount.eq(direct)

  /** The field currently holds the full max for the active mode. */
  const isMaxFilled =
    !!typedAmount && !typedAmount.raw.isZero() && typedAmount.eq(maxForMode)

  const route: WithdrawRoute = useMemo(() => {
    const intent = typedAmount ?? zero
    const clamped = intent.gt(maxForMode) ? maxForMode : intent

    if (isWrappedOnly) {
      return {
        amount: clamped,
        fromDirect: zero,
        fromWrapped: clamped,
        isFullMax: false,
        usesWrapped: !clamped.raw.isZero(),
      }
    }

    const fromDirect = clamped.gt(direct) ? direct : clamped
    let fromWrapped = clamped.sub(fromDirect)

    // A sub-dust spill would cost a whole extra transaction and can revert the
    // unwrap outright (the share cost rounds to zero -> ZeroShares()). Snap
    // back to a direct-only route instead.
    if (!fromWrapped.raw.isZero() && fromWrapped.lt(dustFloor)) {
      fromWrapped = zero
      return {
        amount: fromDirect,
        fromDirect,
        fromWrapped: zero,
        isFullMax: false,
        usesWrapped: false,
      }
    }

    return {
      amount: clamped,
      fromDirect,
      fromWrapped,
      isFullMax: !clamped.raw.isZero() && clamped.eq(combinedMax),
      usesWrapped: !fromWrapped.raw.isZero(),
    }
  }, [
    typedAmount,
    maxForMode,
    isWrappedOnly,
    direct,
    dustFloor,
    combinedMax,
    zero,
  ])

  /**
   * Shares that will actually be burned for the unwrap leg. `previewWithdraw`
   * is the ceil-direction preview matching what `withdraw(assets)` burns — a
   * linear rate computed client-side sits systematically below it.
   */
  const { data: sharesToUnwrap } = useQuery({
    queryKey: QueryKeys.Wrapper.PREVIEW(
      wrapper?.address,
      "unwrap-withdraw",
      "assets",
      route.fromWrapped.raw.toString(),
    ),
    enabled: !!wrapper && route.usesWrapped,
    queryFn: async () => {
      if (!wrapper) throw new Error("No wrapper")
      return wrapper.previewWithdraw(route.fromWrapped)
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  })

  const isBelowDustInWrappedOnly =
    isWrappedOnly && !route.amount.raw.isZero() && route.amount.lt(dustFloor)

  const isValid =
    !!typedAmount &&
    !route.amount.raw.isZero() &&
    !overMax &&
    !isBelowDustInWrappedOnly

  const handleAmountChange = (value: string) => {
    setAmountInput(value)
    setExactAmount(undefined)
  }

  /**
   * Fills the field with an exact TokenAmount. The DISPLAY is truncated to the
   * field's precision, but `exactAmount` keeps the full-precision value so the
   * transaction is built from the real balance, never from the rounded string.
   */
  const fillExact = (amount: TokenAmount) => {
    setExactAmount(amount)
    setAmountInput(amount.format(AMOUNT_DISPLAY_DECIMALS))
  }

  const fillDirect = () => {
    setMode(WithdrawRouteMode.Auto)
    fillExact(direct)
  }

  const fillMax = () => fillExact(maxForMode)

  const toggleWrappedOnly = () => {
    setMode((prev) =>
      prev === WithdrawRouteMode.WrappedOnly
        ? WithdrawRouteMode.Auto
        : WithdrawRouteMode.WrappedOnly,
    )
  }

  // Toggling the mode changes the ceiling. Clamp a now-too-large entry instead
  // of leaving an unexplained "exceeds available" error standing.
  useEffect(() => {
    if (!typedAmount) return
    if (typedAmount.gt(maxForMode)) {
      fillExact(maxForMode)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  const reset = () => {
    setAmountInput("")
    setExactAmount(undefined)
    setMode(WithdrawRouteMode.Auto)
  }

  return {
    // inputs
    amountInput,
    handleAmountChange,
    mode,
    isWrappedOnly,
    toggleWrappedOnly,
    fillDirect,
    fillMax,
    reset,

    // position
    direct,
    wrappedAvailable,
    shareBalance,
    combinedMax,
    maxForMode,
    hasWrappedPosition,

    // route
    route,
    sharesToUnwrap,

    // validity
    isValid,
    overMax,
    isDirectFilled,
    isMaxFilled,
    isBelowDustInWrappedOnly,
    dustFloor,
  }
}
