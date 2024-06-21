import { Box, Divider, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"
import { useCopyToClipboard } from "react-use"

import {
  formatBps,
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

  const availableGracePeriod = () => {
    if (market)
      if (market.timeDelinquent > market.delinquencyGracePeriod) return 0
      else return market.delinquencyGracePeriod - market.timeDelinquent
    return 0
  }

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
            address={market.address}
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
            address={market.underlyingToken.address}
          />
          <Divider sx={{ margin: "12px 0 12px" }} />
          <MarketParametersItem
            title={t("borrowerMarketDetails.parameters.marketTokenName")}
            value={market.marketToken.name}
            handleCopy={() => {
              handleCopy(market.marketToken.name)
            }}
            address={market.marketToken.name}
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
          />
          <Divider sx={{ margin: "12px 0 12px" }} />
          <MarketParametersItem
            title={t("borrowerMarketDetails.parameters.maximumGracePeriod")}
            value={`${formatSecsToHours(market.delinquencyGracePeriod)}`}
            tooltipText="TBD"
          />
          <Divider sx={{ margin: "12px 0 12px" }} />
          <MarketParametersItem
            title={t("borrowerMarketDetails.parameters.availableGracePeriod")}
            value={`${availableGracePeriod()} sec`}
            tooltipText="TBD"
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
