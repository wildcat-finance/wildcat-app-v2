import * as React from "react"

import { Box, Button, FormControlLabel, Typography } from "@mui/material"
import { MarketAccount, TokenWrapper } from "@wildcatfi/wildcat-sdk"
import { useTranslation } from "react-i18next"

import { useWithdrawRouting } from "@/app/[locale]/lender/market/[address]/hooks/useWithdrawRouting"
import ExtendedCheckbox from "@/components/@extended/ExtendedСheckbox"
import { NumberTextField } from "@/components/NumberTextfield"
import { TextfieldChip } from "@/components/TextfieldAdornments/TextfieldChip"
import { COLORS } from "@/theme/colors"
import { formatTokenWithCommas } from "@/utils/formatters"

import { RoutingPanel } from "./RoutingPanel"

const T = "lenderMarketDetails.transactions.withdraw"

export type WithdrawFormProps = {
  routing: ReturnType<typeof useWithdrawRouting>
  marketAccount: MarketAccount
  wrapper?: TokenWrapper
  /** Number of transactions the current route will cost. */
  legCount: number
  isBatched: boolean
  isMultisig: boolean
  safeThreshold: number
  /** Blocking reason from the market state, if any. */
  blockingError?: string
}

/**
 * Shared form body for the withdraw modal — used by both the desktop dialog and
 * the mobile full-screen flow so the routing UI is authored once.
 */
export const WithdrawForm = ({
  routing,
  marketAccount,
  wrapper,
  legCount,
  isBatched,
  isMultisig,
  safeThreshold,
  blockingError,
}: WithdrawFormProps) => {
  const { t } = useTranslation()
  const { market } = marketAccount
  const { symbol } = market.underlyingToken

  const {
    amountInput,
    handleAmountChange,
    isWrappedOnly,
    toggleWrappedOnly,
    fillDirect,
    fillMax,
    direct,
    wrappedAvailable,
    maxForMode,
    hasWrappedPosition,
    route,
    sharesToUnwrap,
    overMax,
    isDirectFilled,
    isMaxFilled,
    isBelowDustInWrappedOnly,
    dustFloor,
  } = routing

  const amountError = (() => {
    if (overMax) {
      return t(`${T}.errors.exceeds`, {
        amount: formatTokenWithCommas(maxForMode),
        symbol,
      })
    }
    if (isBelowDustInWrappedOnly) {
      return t(`${T}.errors.tooSmall`, {
        amount: formatTokenWithCommas(dustFloor),
        symbol,
      })
    }
    return blockingError
  })()

  const txSummary = (() => {
    if (!routing.isValid) return "—"
    if (isMultisig) {
      return t(`${T}.routing.txMultisig`, { count: safeThreshold })
    }
    if (isBatched && route.usesWrapped) {
      return t(`${T}.routing.txBatched`)
    }
    return t(`${T}.routing.tx`, { count: legCount })
  })()

  const hint = (() => {
    if (route.usesWrapped) {
      return t(`${T}.routing.unwrapping`, {
        shares: sharesToUnwrap ? formatTokenWithCommas(sharesToUnwrap) : "…",
        symbol: wrapper?.shareToken.symbol ?? "",
      })
    }
    if (isWrappedOnly) return t(`${T}.routing.wrappedOnly`)
    return t(`${T}.routing.directOnlyUpTo`, {
      amount: formatTokenWithCommas(direct),
    })
  })()

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <NumberTextField
        size="medium"
        style={{ width: "100%" }}
        placeholder="0.00"
        value={amountInput}
        onChange={(evt: React.ChangeEvent<HTMLInputElement>) =>
          handleAmountChange(evt.target.value)
        }
        endAdornment={<TextfieldChip text={symbol} size="small" />}
        error={!!amountError}
        helperText={amountError}
        FormHelperTextProps={{
          sx: { minHeight: "16px", whiteSpace: "normal" },
        }}
      />

      <Box sx={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {hasWrappedPosition && !isWrappedOnly && !direct.raw.isZero() && (
          <Button
            variant="contained"
            color={isDirectFilled ? "primary" : "secondary"}
            size="small"
            onClick={fillDirect}
          >
            {t(`${T}.chips.directOnly`, {
              amount: formatTokenWithCommas(direct),
            })}
          </Button>
        )}

        {!maxForMode.raw.isZero() && (
          <Button
            variant="contained"
            color={isMaxFilled ? "primary" : "secondary"}
            size="small"
            onClick={fillMax}
          >
            {hasWrappedPosition
              ? t(`${T}.chips.all`, {
                  amount: formatTokenWithCommas(maxForMode),
                })
              : t(`${T}.chips.max`, {
                  amount: formatTokenWithCommas(maxForMode),
                })}
          </Button>
        )}
      </Box>

      {hasWrappedPosition && (
        <RoutingPanel
          symbol={symbol}
          directUsed={formatTokenWithCommas(route.fromDirect)}
          directAvailable={formatTokenWithCommas(direct)}
          wrappedUsed={formatTokenWithCommas(route.fromWrapped)}
          wrappedAvailable={
            wrappedAvailable ? formatTokenWithCommas(wrappedAvailable) : "0"
          }
          hint={hint}
          hintWarn={route.usesWrapped}
          txSummary={txSummary}
        />
      )}

      {hasWrappedPosition && (
        <FormControlLabel
          control={
            <ExtendedCheckbox
              sx={{
                "& ::before": {
                  transform: "translate(-3px, -3px) scale(0.75)",
                },
              }}
              checked={isWrappedOnly}
              onChange={toggleWrappedOnly}
            />
          }
          label={
            <Typography variant="text3" color={COLORS.blackRock}>
              {t(`${T}.wrappedOnly`)}
            </Typography>
          }
          sx={{
            marginLeft: 0,
            gap: "8px",
            alignItems: "center",
            "& .MuiCheckbox-root": { padding: 0 },
          }}
        />
      )}
    </Box>
  )
}
