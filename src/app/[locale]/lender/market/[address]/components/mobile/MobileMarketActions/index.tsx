import { Dispatch, ReactNode, SetStateAction } from "react"
import * as React from "react"

import { Box, Button, Typography } from "@mui/material"
import { HooksKind, MarketAccount } from "@wildcatfi/wildcat-sdk"
import { useTranslation } from "react-i18next"

import { TooltipButton } from "@/components/TooltipButton"
import { COLORS } from "@/theme/colors"
import { formatTokenWithCommas } from "@/utils/formatters"

export type MobileMarketActionsProps = {
  marketAccount: MarketAccount
  isMobileDepositOpen: boolean
  isMobileWithdrawalOpen: boolean
  setIsMobileDepositOpen: Dispatch<SetStateAction<boolean>>
  setIsMobileWithdrawalOpen: Dispatch<SetStateAction<boolean>>
}

export type MobileMarketTransactionItemProps = {
  title: string
  tooltip?: string
  amount: string | undefined
  asset: string
}

const MobileMarketTransactionItem = ({
  title,
  tooltip,
  amount,
  asset,
}: MobileMarketTransactionItemProps) => (
  <>
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        marginBottom: "2px",
      }}
    >
      <Typography variant="text3" sx={{ color: COLORS.santasGrey }}>
        {title}
      </Typography>
      <TooltipButton value={tooltip} />
    </Box>

    <Box
      sx={{
        display: "flex",
        alignItems: "flex-start",
        gap: "4px",
      }}
    >
      <Typography variant="title3" color={COLORS.white}>
        {amount}
      </Typography>
      <Typography
        color={COLORS.white}
        variant="text4"
        sx={{
          marginTop: "4px",
        }}
      >
        {asset}
      </Typography>
    </Box>
  </>
)

export const MobileMarketActions = ({
  marketAccount,
  isMobileWithdrawalOpen,
  isMobileDepositOpen,
  setIsMobileWithdrawalOpen,
  setIsMobileDepositOpen,
}: MobileMarketActionsProps) => {
  const { t } = useTranslation()
  const { market } = marketAccount

  const notMature =
    market &&
    market.hooksConfig?.kind === HooksKind.FixedTerm &&
    market.hooksConfig?.fixedTermEndTime !== undefined &&
    market.hooksConfig.fixedTermEndTime * 1000 >= Date.now()

  return (
    <Box
      sx={{
        display: "flex",
        gap: "8px",
        padding: "12px",
        backgroundColor: COLORS.bunker,
        borderRadius: "14px",
      }}
    >
      <Box
        sx={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
        }}
      >
        <MobileMarketTransactionItem
          // title={t("lenderMarketDetails.transactions.withdraw.title")}
          title="Available To withdraw"
          tooltip={t("lenderMarketDetails.transactions.withdraw.tooltip")}
          amount={formatTokenWithCommas(marketAccount.marketBalance)}
          asset={market.underlyingToken.symbol}
        />

        <Button
          variant="contained"
          color="secondary"
          size="large"
          fullWidth
          onClick={() => setIsMobileWithdrawalOpen(!isMobileWithdrawalOpen)}
          disabled={notMature}
          sx={{ padding: "10px 20px", marginTop: "16px" }}
        >
          ↑{" "}
          {notMature
            ? t("lenderMarketDetails.transactions.withdraw.buttonLocked")
            : t("lenderMarketDetails.transactions.withdraw.button")}
        </Button>
      </Box>

      <Box
        sx={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
        }}
      >
        <MobileMarketTransactionItem
          title={t("lenderMarketDetails.transactions.deposit.title")}
          tooltip={t("lenderMarketDetails.transactions.deposit.tooltip")}
          amount={formatTokenWithCommas(marketAccount.maximumDeposit)}
          asset={market.underlyingToken.symbol}
        />

        <Button
          onClick={() => setIsMobileDepositOpen(!isMobileDepositOpen)}
          variant="contained"
          color="secondary"
          size="large"
          fullWidth
          disabled={marketAccount.maximumDeposit.raw.isZero()}
          sx={{ padding: "10px 20px", marginTop: "16px" }}
        >
          ↓ {t("lenderMarketDetails.transactions.deposit.button")}
        </Button>
      </Box>
    </Box>
  )
}
