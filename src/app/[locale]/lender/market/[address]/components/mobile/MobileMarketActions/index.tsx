import { Dispatch, SetStateAction } from "react"
import * as React from "react"

import { Box, Button, SvgIcon, Typography } from "@mui/material"
import { HooksKind, MarketAccount } from "@wildcatfi/wildcat-sdk"
import { useTranslation } from "react-i18next"

import { useGetSignedMla } from "@/app/[locale]/lender/hooks/useSignMla"
import Clock from "@/assets/icons/clock_icon.svg"
import { TooltipButton } from "@/components/TooltipButton"
import { useMarketMla } from "@/hooks/useMarketMla"
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
      <Typography
        variant="title3"
        sx={{ fontSize: "18px", lineHeight: "24px" }}
        color={COLORS.white}
      >
        {amount}
      </Typography>
      <Typography
        color={COLORS.white}
        variant="text4"
        sx={{
          marginTop: "1px",
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

  const { data: mla, isLoading: mlaLoading } = useMarketMla(market.address)
  const mlaResponse = mla && "noMLA" in mla ? null : mla
  const { data: signedMla, isLoading: signedMlaLoading } =
    useGetSignedMla(mlaResponse)
  const mlaRequiredAndUnsigned =
    signedMla === null && !!mla && !("noMLA" in mla)

  return (
    <>
      <Box
        sx={{
          width: "100%",
          height: mlaRequiredAndUnsigned ? "148px" : "126px",
        }}
      />

      <Box
        sx={{
          display: "flex",
          flexDirection: mlaRequiredAndUnsigned ? "column" : "row",
          gap: mlaRequiredAndUnsigned ? 0 : "8px",
          padding: "12px",
          backgroundColor: COLORS.bunker,
          borderRadius: "14px",

          position: "fixed",
          bottom: "4px",
          width: "calc(100vw - 8px)",
        }}
      >
        {mlaRequiredAndUnsigned && (
          <>
            <Typography
              variant="title3"
              fontSize="20px"
              lineHeight="24px"
              color={COLORS.white}
              textAlign="center"
              marginTop="12px"
            >
              Master Loan Agreement
            </Typography>

            <Box
              sx={{
                width: "100%",
                display: "flex",
                gap: "4px",
                justifyContent: "center",
                alignItems: "center",
                marginTop: "8px",
              }}
            >
              <SvgIcon
                sx={{ fontSize: "12px", "& path": { fill: COLORS.white06 } }}
              >
                <Clock />
              </SvgIcon>
              <Typography variant="text3" color={COLORS.white06}>
                Waiting for sign, issued to sign
              </Typography>
            </Box>

            <Button
              variant="contained"
              color="secondary"
              size="large"
              sx={{
                marginTop: "24px",
                padding: "8px 12px",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: 600,
                lineHeight: "20px",
              }}
            >
              {t("lenderMarketDetails.buttons.viewMla")}
            </Button>
          </>
        )}

        {!mlaRequiredAndUnsigned && (
          <>
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
                title="Available To Withdraw"
                tooltip={t("lenderMarketDetails.transactions.withdraw.tooltip")}
                amount={formatTokenWithCommas(marketAccount.marketBalance)}
                asset={market.underlyingToken.symbol}
              />

              <Button
                variant="contained"
                color="secondary"
                size="large"
                fullWidth
                onClick={() =>
                  setIsMobileWithdrawalOpen(!isMobileWithdrawalOpen)
                }
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
          </>
        )}
      </Box>
    </>
  )
}
