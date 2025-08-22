import { Box, Typography } from "@mui/material"
import { TokenAmount } from "@wildcatfi/wildcat-sdk"
import { BigNumber } from "ethers"
import humanizeDuration from "humanize-duration"
import { useTranslation } from "react-i18next"

import { useGetWithdrawals } from "@/app/[locale]/borrower/market/[address]/hooks/useGetWithdrawals"
import { BarItem } from "@/components/BarChart/BarItem"
import { MarketBarChartItem } from "@/components/BarChart/BarItem/interface"
import { LegendItem } from "@/components/BarChart/LegendItem"
import { COLORS } from "@/theme/colors"
import { formatTokenWithCommas } from "@/utils/formatters"

import { CollateralObligationsData } from "./CollateralObligations/CollateralObligationsData"
import { DelinquentCollateralObligations } from "./CollateralObligations/DelinquentCollateralObligations"
import { MARKET_BAR_DATA, MARKET_BAR_ORDER } from "./constants"
import { useGenerateBarData } from "./hooks/useGenerateBarData"
import "./styles.css"
import { MarketStatusChartProps } from "./interface"

export const MarketStatusChart = ({ market }: MarketStatusChartProps) => {
  const { t } = useTranslation()
  const { data: withdrawals } = useGetWithdrawals(market)
  const { barData: barRawData, breakdown } = useGenerateBarData(market)
  const isDelinquent = breakdown.status === "delinquent"

  const barOrders = isDelinquent
    ? MARKET_BAR_ORDER.delinquentBarsOrder
    : MARKET_BAR_ORDER.healthyBarchartOrder
  const legendItemsOrder = isDelinquent
    ? MARKET_BAR_ORDER.delinquentLegendOrder
    : MARKET_BAR_ORDER.healthyLegendOrder

  const bars = barOrders
    .filter((barId) => barRawData[barId] !== undefined)
    .map((barId) => barRawData[barId])
    .filter((chartItem) => !chartItem.hide && !chartItem.value.raw.isZero())

  const legendItems = legendItemsOrder
    .filter((barId) => barRawData[barId] !== undefined)
    .map((barId) => barRawData[barId])

  const getLegendItemType = (
    chartItem: MarketBarChartItem & { hide?: boolean | undefined },
  ) => {
    if (
      chartItem.id === MARKET_BAR_DATA.collateralObligations.id &&
      !isDelinquent
    )
      return "expandable"
    if (
      chartItem.id === MARKET_BAR_DATA.collateralObligations.id &&
      isDelinquent
    )
      return "extended"
    return "default"
  }

  const SECONDS_IN_365_DAYS = 31_536_000
  const BIP_RAY_RATIO = BigNumber.from(10).pow(23)

  const bipToRay = (bip: number) => BIP_RAY_RATIO.mul(bip)

  // fallback to compute seconds before delinquency in the case
  // of zero-reserve-ration where sdk returns 0 seconds

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const computeSecondsBefore = (borrowAmountToken?: TokenAmount): number => {
    // Use SDK-provided value if non-zero (covers usual reserve-driven case)
    const sdkSeconds = borrowAmountToken
      ? market.getSecondsBeforeDelinquencyForBorrowedAmount(borrowAmountToken)
      : market.secondsBeforeDelinquency

    if (sdkSeconds > 0) return sdkSeconds

    // if sdk says 0 seconds then check if protocol fees are still play-on
    if (market.totalDebts.gt(0) && !market.isClosed) {
      // numerator = liquidReserves - minimumReserves (and subtract borrow amount if simulating a tx)
      // we use this as the buffer that protocol fees can erode over time
      // start with the base buffer: liquidReserves minus the policy minimum reserves
      let reserveBuffer = market.liquidReserves.sub(market.minimumReserves)
      // if we're simulating after a borrow, also subtract the borrow amount from the buffer
      if (borrowAmountToken) {
        reserveBuffer = reserveBuffer.sub(borrowAmountToken)
      }

      // means liquid reserves are at or below minimum after
      // accounting for the borrow there is no runway for protocol fees
      if (reserveBuffer.raw.lte(0)) return 0

      try {
        // calc erosion of reserves per second due to protocol fees
        // 1) take totalSupply, scale by annual APR (converted to ray)
        // 2) divide by seconds per year to get per-second interest on supply
        // 3) take the protocol's share of that interest (protocolFeeBips)
        const protocolInterestPerSecond = market.totalSupply
          .rayMul(bipToRay(market.annualInterestBips))
          .div(SECONDS_IN_365_DAYS)
          .bipMul(market.protocolFeeBips)

        // if that protocol-driven depletion is non-zero, compute seconds = numerator / rate
        if (!protocolInterestPerSecond.raw.eq(0)) {
          // divide the available buffer by the per-second drain to get seconds remaining
          const seconds = reserveBuffer
            .div(protocolInterestPerSecond, true)
            .raw.toNumber()
          if (seconds > 0) return seconds
        }
      } catch (e) {
        // if anything goes wrong with the math, ignore me and fall back to sdk value (preserve behaviour)
      }
    }

    return sdkSeconds
  }

  const remainingInterest =
    market.totalDebts.gt(0) && !market.isClosed
      ? humanizeDuration(computeSecondsBefore() * 1000, {
          round: true,
          largest: 1,
        })
      : ""

  return (
    <Box marginTop="12px">
      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
        <Typography variant="title3">
          {t("borrowerMarketDetails.statusChart.totalDebt")}
        </Typography>

        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            gap: "4px",
          }}
        >
          <Typography variant="title3">
            {market.totalBorrowed &&
              `${formatTokenWithCommas(market.totalSupply)}`}
          </Typography>
          <Typography variant="text4" sx={{ marginTop: "4px" }}>
            {market.underlyingToken.symbol}
          </Typography>
        </Box>
      </Box>

      {!isDelinquent &&
        !market.isClosed &&
        !market.isIncurringPenalties &&
        market.outstandingTotalSupply.gt(0) && (
          <Box sx={{ display: "flex", columnGap: "3px", marginBottom: "24px" }}>
            <Typography variant="text3" sx={{ color: COLORS.santasGrey }}>
              {t("borrowerMarketDetails.statusChart.sufficientReserves")}
            </Typography>
            <Typography variant="text3" sx={{ color: COLORS.ultramarineBlue }}>
              {remainingInterest}
            </Typography>
          </Box>
        )}

      {market.totalDebts.gt(0) && !market.isClosed && (
        <Box className="barchart__container">
          {bars.map((chartItem) => (
            <BarItem
              key={chartItem.id}
              chartItem={chartItem}
              isOnlyBarItem={bars.length === 1}
            />
          ))}
        </Box>
      )}

      <Box className="barchart__legend">
        {legendItems.map((chartItem) => (
          <LegendItem
            key={chartItem.label}
            chartItem={chartItem}
            type={getLegendItemType(chartItem)}
          >
            {chartItem.id === MARKET_BAR_DATA.collateralObligations.id && (
              <>
                {!isDelinquent && (
                  <Box className="barchart__legend-obligations-values-container">
                    <CollateralObligationsData
                      market={market}
                      withdrawals={withdrawals}
                    />
                  </Box>
                )}

                {isDelinquent && (
                  <Box className="barchart__legend-obligations-values-container">
                    <DelinquentCollateralObligations
                      market={market}
                      legendItem={chartItem}
                      withdrawals={withdrawals}
                    />
                  </Box>
                )}
              </>
            )}
          </LegendItem>
        ))}
      </Box>
    </Box>
  )
}
