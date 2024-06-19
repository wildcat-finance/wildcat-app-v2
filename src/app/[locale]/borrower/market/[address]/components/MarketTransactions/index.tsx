import * as React from "react"

import { Box, Button, Skeleton, Tooltip, Typography } from "@mui/material"
import SvgIcon from "@mui/material/SvgIcon"
import { useTranslation } from "react-i18next"

import { MarketTransactionsProps } from "@/app/[locale]/borrower/market/[address]/components/MarketTransactions/interface"
import {
  MarketTxBlockAmountContainer,
  MarketTxBlockContainer,
  MarketTxBlockTitleContainer,
  MarketTxContainer,
  MarketTxSkeleton,
} from "@/app/[locale]/borrower/market/[address]/components/MarketTransactions/style"
import Question from "@/assets/icons/circledQuestion_icon.svg"
import { TooltipIcon } from "@/components/InputLabel/style"
import { useGetMarketAccountForBorrowerLegacy } from "@/hooks/useGetMarketAccount"
import { COLORS } from "@/theme/colors"
import { formatTokenWithCommas } from "@/utils/formatters"

export const MarketTransactions = ({
  market,
  isLoading,
}: MarketTransactionsProps) => {
  const { t } = useTranslation()

  const { data: marketAccount } = useGetMarketAccountForBorrowerLegacy(market)

  if (!market || !marketAccount || isLoading)
    return (
      <Box sx={MarketTxContainer}>
        <Skeleton height="82px" width="395px" sx={MarketTxSkeleton} />

        <Skeleton height="82px" width="395px" sx={MarketTxSkeleton} />
      </Box>
    )

  return (
    <Box sx={MarketTxContainer}>
      <Box sx={MarketTxBlockContainer}>
        <Box>
          <Box sx={MarketTxBlockTitleContainer}>
            <Typography variant="text4" sx={{ color: COLORS.santasGrey }}>
              {t("borrowerMarketDetails.transactions.toRepay.title")}
            </Typography>
            <Tooltip
              title={t("borrowerMarketDetails.transactions.toRepay.tooltip")}
              placement="right"
            >
              <SvgIcon fontSize="small" sx={TooltipIcon}>
                <Question />
              </SvgIcon>
            </Tooltip>
          </Box>

          <Box sx={MarketTxBlockAmountContainer}>
            <Typography variant="title3">
              {formatTokenWithCommas(market.outstandingDebt)}
            </Typography>
            <Typography variant="text4">
              {market.underlyingToken.symbol}
            </Typography>
          </Box>
        </Box>

        <Button variant="contained" size="large" sx={{ width: "152px" }}>
          {t("borrowerMarketDetails.buttons.repay")}
        </Button>
      </Box>

      <Box sx={MarketTxBlockContainer}>
        <Box>
          <Box sx={MarketTxBlockTitleContainer}>
            <Typography variant="text4" sx={{ color: COLORS.santasGrey }}>
              {t("borrowerMarketDetails.transactions.toBorrow.title")}
            </Typography>
            <Tooltip
              title={t("borrowerMarketDetails.transactions.toBorrow.tooltip")}
              placement="right"
            >
              <SvgIcon fontSize="small" sx={TooltipIcon}>
                <Question />
              </SvgIcon>
            </Tooltip>
          </Box>

          <Box sx={MarketTxBlockAmountContainer}>
            <Typography variant="title3">
              {formatTokenWithCommas(marketAccount.market.borrowableAssets)}
            </Typography>
            <Typography variant="text4">
              {market.underlyingToken.symbol}
            </Typography>
          </Box>
        </Box>

        <Button variant="contained" size="large" sx={{ width: "152px" }}>
          {t("borrowerMarketDetails.buttons.borrow")}
        </Button>
      </Box>
    </Box>
  )
}
