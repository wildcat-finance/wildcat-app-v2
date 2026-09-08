import * as React from "react"

import { Box, Button, FormControlLabel, Typography } from "@mui/material"
import { MarketAccount, TokenWrapper } from "@wildcatfi/wildcat-sdk"
import { useTranslation } from "react-i18next"

import type { WithdrawalBatchJoinWarningResult } from "@/app/[locale]/lender/market/[address]/hooks/useWithdrawalBatchJoinWarning"
import { useWithdrawRouting } from "@/app/[locale]/lender/market/[address]/hooks/useWithdrawRouting"
import ExtendedCheckbox from "@/components/@extended/ExtendedСheckbox"
import { NumberTextField } from "@/components/NumberTextfield"
import { TextfieldChip } from "@/components/TextfieldAdornments/TextfieldChip"
import { COLORS } from "@/theme/colors"
import { formatTokenWithCommas } from "@/utils/formatters"

import { RoutingPanel } from "./RoutingPanel"
import { WithdrawalBatchJoinWarning } from "./WithdrawalBatchJoinWarning"

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
  batchJoinWarning: WithdrawalBatchJoinWarningResult
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
  batchJoinWarning,
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
      return t("marketDetails.lender.transactions.withdraw.errors.exceeds", {
        amount: formatTokenWithCommas(maxForMode),
        symbol,
      })
    }
    if (isBelowDustInWrappedOnly) {
      return t("marketDetails.lender.transactions.withdraw.errors.tooSmall", {
        amount: formatTokenWithCommas(dustFloor),
        symbol,
      })
    }
    return blockingError
  })()

  const txSummary = (() => {
    if (!routing.isValid) return "—"
    if (isMultisig) {
      return t(
        "marketDetails.lender.transactions.withdraw.routing.txMultisig",
        {
          count: safeThreshold,
        },
      )
    }
    if (isBatched && route.usesWrapped) {
      return t("marketDetails.lender.transactions.withdraw.routing.txBatched")
    }
    return t("marketDetails.lender.transactions.withdraw.routing.tx", {
      count: legCount,
    })
  })()

  const hint = (() => {
    if (route.usesWrapped) {
      return t(
        "marketDetails.lender.transactions.withdraw.routing.unwrapping",
        {
          shares: sharesToUnwrap ? formatTokenWithCommas(sharesToUnwrap) : "…",
          symbol: wrapper?.shareToken.symbol ?? "",
        },
      )
    }
    if (isWrappedOnly)
      return t("marketDetails.lender.transactions.withdraw.routing.wrappedOnly")
    return t(
      "marketDetails.lender.transactions.withdraw.routing.directOnlyUpTo",
      {
        amount: formatTokenWithCommas(direct),
      },
    )
  })()

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <Box sx={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {hasWrappedPosition && !isWrappedOnly && !direct.raw.isZero() && (
          <Button
            variant="contained"
            color={isDirectFilled ? "primary" : "secondary"}
            size="small"
            onClick={fillDirect}
          >
            {t("marketDetails.lender.transactions.withdraw.chips.directOnly", {
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
              ? t("marketDetails.lender.transactions.withdraw.chips.all", {
                  amount: formatTokenWithCommas(maxForMode),
                })
              : t("marketDetails.lender.transactions.withdraw.chips.max", {
                  amount: formatTokenWithCommas(maxForMode),
                })}
          </Button>
        )}
      </Box>

      <NumberTextField
        size="medium"
        style={{ width: "100%" }}
        sx={{ height: "auto" }}
        placeholder="0.00"
        value={amountInput}
        onChange={(evt: React.ChangeEvent<HTMLInputElement>) =>
          handleAmountChange(evt.target.value)
        }
        endAdornment={<TextfieldChip text={symbol} size="small" />}
        error={!!amountError}
        helperText={amountError ?? "\u00A0"}
        FormHelperTextProps={{
          sx: { minHeight: "16px", whiteSpace: "normal" },
        }}
      />

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

      <WithdrawalBatchJoinWarning warning={batchJoinWarning} />

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
              {t("marketDetails.lender.transactions.withdraw.wrappedOnly")}
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
