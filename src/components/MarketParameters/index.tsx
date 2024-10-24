import { useMemo } from "react"

import { Box, Divider, Typography } from "@mui/material"
import humanizeDuration from "humanize-duration"
import { useTranslation } from "react-i18next"
import { useCopyToClipboard } from "react-use"

import { EtherscanBaseUrl } from "@/config/network"
import {
  formatBps,
  formatRayAsPercentage,
  formatSecsToHours,
  MARKET_PARAMS_DECIMALS,
  toTokenAmountProps,
  trimAddress,
} from "@/utils/formatters"

import { MarketParametersItem } from "./components/MarketParametersItem"
import { MarketParametersProps } from "./interface"
import {
  MarketParametersContainer,
  MarketParametersContainerColumn,
} from "./style"

export const MarketParameters = ({ market }: MarketParametersProps) => {
  const { t } = useTranslation()
  const [state, copyToClipboard] = useCopyToClipboard()
  const { timeDelinquent, delinquencyGracePeriod } = market

  const [gracePeriodLabel, gracePeriodTimer] =
    timeDelinquent > delinquencyGracePeriod
      ? [
          t("borrowerMarketDetails.labal.remainingTime"),
          humanizeDuration((timeDelinquent - delinquencyGracePeriod) * 1000, {
            round: true,
            largest: 1,
          }),
        ]
      : [
          t("borrowerMarketDetails.labal.availableGracePeriod"),
          formatSecsToHours(delinquencyGracePeriod - timeDelinquent),
        ]

  const gracePeriodTooltip = useMemo(() => {
    const breakdown = market.getTotalDebtBreakdown()
    const willBeDelinquent = breakdown.status === "delinquent"
    if (!market.isDelinquent) {
      if (willBeDelinquent) {
        // If the market is not currently delinquent but will be after the next update:
        return t("borrowerMarketDetails.tooltip.willBeDelinquent")
      }
      if (timeDelinquent > delinquencyGracePeriod) {
        // If the market is not currently delinquent (on-chain) but is incurring penalties:
        return t("borrowerMarketDetails.tooltip.delinquencyFeesApply")
      }
      return undefined
    }
    if (!willBeDelinquent) {
      // If the market will stop being delinquent after the next update:
      return t("borrowerMarketDetails.tooltip.hasBecomeHealthy")
    }
    // If the market will continue to be delinquent after the next update:
    return t("borrowerMarketDetails.tooltip.delinquencyContinues")
  }, [market])

  const totalInterestAccrued = market
    ? (
        market.totalDelinquencyFeesAccrued ??
        market.underlyingToken.getAmount(0)
      ).add(market.totalBaseInterestAccrued ?? 0)
    : undefined

  const handleCopy = (text: string) => {
    copyToClipboard(text)
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        width: "100%",
      }}
    >
      <Typography variant="title3">
        {t("borrowerMarketDetails.header.parameters")}
      </Typography>
      <Box sx={MarketParametersContainer}>
        <Box sx={MarketParametersContainerColumn}>
          <MarketParametersItem
            title={t("borrowerMarketDetails.parameters.marketAddress")}
            value={trimAddress(market.address)}
            handleCopy={() => {
              handleCopy(market.address)
            }}
            link={`${EtherscanBaseUrl}/address/${market.address}`}
          />
          <Divider sx={{ margin: "12px 0 12px" }} />
          <MarketParametersItem
            title={t("borrowerMarketDetails.parameters.underlyingAsset")}
            value={`${market.underlyingToken.name} (${trimAddress(
              market.underlyingToken.address,
            )})`}
            tooltipText="TBD"
            handleCopy={() => {
              handleCopy(market.underlyingToken.address)
            }}
            link={`${EtherscanBaseUrl}/token/${market.underlyingToken.address}`}
          />
          <Divider sx={{ margin: "12px 0 12px" }} />
          <MarketParametersItem
            title={t("borrowerMarketDetails.parameters.marketTokenName")}
            value={market.marketToken.name}
            handleCopy={() => {
              handleCopy(market.marketToken.name)
            }}
            link={`${EtherscanBaseUrl}/token/${market.marketToken.address}`}
          />
          <Divider sx={{ margin: "12px 0 12px" }} />
          <MarketParametersItem
            title={t("borrowerMarketDetails.parameters.marketTokenPrefix")}
            value={market.marketToken.symbol}
          />
          <Divider sx={{ margin: "12px 0 12px" }} />
          <MarketParametersItem
            title={t("borrowerMarketDetails.parameters.maxBorrowingCapacity")}
            value={`${market.maxTotalSupply.format(
              market.maxTotalSupply.token.decimals,
            )} ${market.underlyingToken.symbol}`}
            tooltipText="TBD"
          />
          <Divider sx={{ margin: "12px 0 12px" }} />
          <MarketParametersItem
            title={t("borrowerMarketDetails.parameters.totalInterestAccured")}
            value={toTokenAmountProps(totalInterestAccrued).value}
          />
        </Box>
        <Box sx={MarketParametersContainerColumn}>
          <MarketParametersItem
            title={t("borrowerMarketDetails.parameters.minimumReserveRatio")}
            value={`${formatBps(
              market.reserveRatioBips,
              MARKET_PARAMS_DECIMALS.reserveRatioBips,
            )}%`}
            tooltipText="TBD"
          />
          <Divider sx={{ margin: "12px 0 12px" }} />
          <MarketParametersItem
            title={t("borrowerMarketDetails.parameters.baseAPR")}
            value={`${formatBps(
              market.annualInterestBips,
              MARKET_PARAMS_DECIMALS.annualInterestBips,
            )}%`}
            tooltipText="TBD"
          />
          <Divider sx={{ margin: "12px 0 12px" }} />
          <MarketParametersItem
            title={t("borrowerMarketDetails.parameters.penaltyAPR")}
            value={`${formatBps(
              market.delinquencyFeeBips,
              MARKET_PARAMS_DECIMALS.delinquencyFeeBips,
            )}%`}
            tooltipText="TBD"
            alarmState={market.isIncurringPenalties}
            valueTooltipText={
              market.isIncurringPenalties
                ? `This market is incurring delinquency fees, leading to a total APR of ${formatRayAsPercentage(
                    market.effectiveLenderAPR,
                    MARKET_PARAMS_DECIMALS.annualInterestBips,
                  )}%. Penalties will continue to apply until the delinquency timer is below the grace period.`
                : undefined
            }
          />
          <Divider sx={{ margin: "12px 0 12px" }} />
          <MarketParametersItem
            title={t("borrowerMarketDetails.parameters.maximumGracePeriod")}
            value={`${formatSecsToHours(market.delinquencyGracePeriod)}`}
            tooltipText="TBD"
          />
          <Divider sx={{ margin: "12px 0 12px" }} />
          <MarketParametersItem
            title={gracePeriodLabel}
            value={gracePeriodTimer}
            tooltipText="TBD"
            alarmState={timeDelinquent > delinquencyGracePeriod}
            valueTooltipText={gracePeriodTooltip}
          />
          <Divider sx={{ margin: "12px 0 12px" }} />
          <MarketParametersItem
            title={t(
              "borrowerMarketDetails.parameters.withdrawalCycleDuration",
            )}
            value={`${formatSecsToHours(market.withdrawalBatchDuration)}`}
            tooltipText="TBD"
          />
        </Box>
      </Box>
    </Box>
  )
}
