import { useEffect, useMemo, useState } from "react"

import { useQuery } from "@tanstack/react-query"
import {
  MarketAccount,
  TokenAmount,
  TokenWrapper,
} from "@wildcatfi/wildcat-sdk"
import { useAccount } from "wagmi"

import { QueryKeys } from "@/config/query-keys"
import { useEthersProvider } from "@/hooks/useEthersSigner"
import { useWrapperAccountState } from "@/hooks/wrapper/useWrapperAccountState"

/** Decimal places shown in the amount field (matches NumberTextField). */
export const AMOUNT_DISPLAY_DECIMALS = 5

enum AmountFill {
  None = "none",
  Direct = "direct",
  Max = "max",
}

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
  /**
   * The whole market-token balance is being queued, so the queue leg can use
   * the balance-independent `queueFullWithdrawal` primitive.
   */
  isFullMax: boolean
  /**
   * The lender asked for the maximum of the active mode rather than a typed
   * figure. Market tokens accrue interest between this snapshot and the
   * signature, so a max route has to follow the live balance up instead of
   * queueing the number that was on screen.
   */
  isMaxRequested: boolean
  /**
   * Wrapped-only with a non-empty direct balance: the direct market tokens are
   * deliberately left alone, so the queue leg may not sweep the whole balance.
   */
  keepsDirect: boolean
  /**
   * The unwrap leg drains the entire wrapped position. It is then executed as
   * an exact-in `redeem` of every share, which cannot leave shares behind, and
   * not as an exact-out `withdraw` of a stale asset figure.
   */
  isFullWrapped: boolean
  /** Share balance to redeem when `isFullWrapped` (used by the Safe batch). */
  sharesToRedeem?: TokenAmount
  usesWrapped: boolean
}

/**
 * Routing core for the withdraw flow.
 *
 * The lender types ONE amount in the market's underlying token; this hook
 * decides how much comes from the directly-held market tokens and how much has
 * to be unwrapped from the ERC-4626 wrapper first.
 *
 * All arithmetic is done on TokenAmount/bigint. Nothing is ever derived from
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
  const { publicClient } = useEthersProvider({ chainId: market.chainId })

  const [amountInput, setAmountInput] = useState("")
  const [mode, setMode] = useState<WithdrawRouteMode>(WithdrawRouteMode.Auto)
  // Exact amount captured when a quick-fill chip is used, so the transaction is
  // built from the real balance rather than the rounded display string.
  const [exactAmount, setExactAmount] = useState<TokenAmount>()
  // Which chip is applied. Deliberately NOT derived by comparing the field
  // against the current maximum: balances are polled every POLLING_INTERVAL and
  // grow with accrued interest, so that equality goes false on its own a few
  // seconds after the chip is pressed — dropping both the highlight and, before
  // this was sticky, the full-withdrawal path itself.
  const [fill, setFill] = useState(AmountFill.None)

  const isMaxIntent = fill !== AmountFill.None

  const { data: accountState } = useWrapperAccountState(
    market.chainId,
    wrapper,
    address,
    publicClient,
  )

  const shareBalance = accountState?.balances?.shareBalance

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
  const wrappedCap =
    hasWrapper && wrapper ? accountState?.limits?.maxWithdraw : undefined

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
    (fill === AmountFill.Direct ||
      (!!typedAmount && !typedAmount.raw.isZero() && typedAmount.eq(direct)))

  /** The field currently holds the full max for the active mode. */
  const isMaxFilled =
    fill === AmountFill.Max ||
    (!!typedAmount && !typedAmount.raw.isZero() && typedAmount.eq(maxForMode))

  const keepsDirect = isWrappedOnly && !direct.raw.isZero()

  const route: WithdrawRoute = useMemo(() => {
    const intent = typedAmount ?? zero
    const clamped = intent.gt(maxForMode) ? maxForMode : intent
    const isMax = isMaxIntent && !clamped.raw.isZero()

    if (isWrappedOnly) {
      return {
        amount: clamped,
        fromDirect: zero,
        fromWrapped: clamped,
        isFullMax: isMax && !keepsDirect,
        isMaxRequested: isMax,
        keepsDirect,
        isFullWrapped: isMax,
        sharesToRedeem: isMax ? shareBalance : undefined,
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
        isFullMax: isMax,
        isMaxRequested: isMax,
        keepsDirect: false,
        isFullWrapped: false,
        usesWrapped: false,
      }
    }

    const usesWrapped = !fromWrapped.raw.isZero()

    return {
      amount: clamped,
      fromDirect,
      fromWrapped,
      isFullMax: isMax,
      isMaxRequested: isMax,
      keepsDirect: false,
      isFullWrapped: isMax && usesWrapped,
      sharesToRedeem: isMax && usesWrapped ? shareBalance : undefined,
      usesWrapped,
    }
  }, [
    typedAmount,
    maxForMode,
    isWrappedOnly,
    keepsDirect,
    isMaxIntent,
    shareBalance,
    direct,
    dustFloor,
    zero,
  ])

  /**
   * Shares that will actually be burned for the unwrap leg. `previewWithdraw`
   * is the ceil-direction preview matching what `withdraw(assets)` burns — a
   * linear rate computed client-side sits systematically below it.
   */
  const { data: previewedShares } = useQuery({
    queryKey: QueryKeys.Wrapper.PREVIEW(
      wrapper?.address,
      "unwrap-withdraw",
      "assets",
      route.fromWrapped.raw.toString(),
    ),
    enabled: !!wrapper && route.usesWrapped && !route.isFullWrapped,
    queryFn: async () => {
      if (!wrapper) throw new Error("No wrapper")
      return wrapper.previewWithdraw(route.fromWrapped)
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  })

  const sharesToUnwrap = route.isFullWrapped ? shareBalance : previewedShares

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
    setFill(AmountFill.None)
  }

  /**
   * Fills the field with an exact TokenAmount. The DISPLAY is truncated to the
   * field's precision, but `exactAmount` keeps the full-precision value so the
   * transaction is built from the real balance, never from the rounded string.
   *
   * `source` records which chip this came from: it keeps the chip highlighted
   * as the balance moves, and lets the flow follow that balance up to the block
   * that mines the queue leg.
   */
  const fillExact = (amount: TokenAmount, source = AmountFill.None) => {
    setExactAmount(amount)
    setAmountInput(amount.format(AMOUNT_DISPLAY_DECIMALS))
    setFill(source)
  }

  const fillDirect = () => {
    setMode(WithdrawRouteMode.Auto)
    fillExact(direct, AmountFill.Direct)
  }

  const fillMax = () => fillExact(maxForMode, AmountFill.Max)
  useEffect(() => {
    if (fill === AmountFill.None) return
    const target = fill === AmountFill.Direct ? direct : maxForMode
    if (exactAmount?.eq(target)) return
    setExactAmount(target)
    setAmountInput(target.format(AMOUNT_DISPLAY_DECIMALS))
  }, [fill, direct, maxForMode, exactAmount])

  const toggleWrappedOnly = () => {
    setFill(AmountFill.None)
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
      fillExact(maxForMode, AmountFill.Max)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  const reset = () => {
    setAmountInput("")
    setExactAmount(undefined)
    setFill(AmountFill.None)
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
