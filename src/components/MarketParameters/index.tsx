import React, { useEffect, useMemo } from "react"

import { Box, Divider, Typography, useTheme } from "@mui/material"
import { MarketVersion, HooksKind } from "@wildcatfi/wildcat-sdk"
import humanizeDuration from "humanize-duration"
import { useTranslation } from "react-i18next"
import { useCopyToClipboard } from "react-use"

import { getAdsMarketParameterComponent } from "@/components/AdsBanners/adsHelpers"
import { SeeMoreButton } from "@/components/Mobile/SeeMoreButton"
import { useBlockExplorer } from "@/hooks/useBlockExplorer"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { formatDate } from "@/lib/mla"
import { COLORS } from "@/theme/colors"
import {
  formatBps,
  formatRayAsPercentage,
  formatSecsToHours,
  formatTokenWithCommas,
  MARKET_PARAMS_DECIMALS,
  toTokenAmountProps,
  trimAddress,
} from "@/utils/formatters"

import { MarketParametersProps } from "./interface"
import {
  MarketParametersContainer,
  MarketParametersContainerColumn,
} from "./style"
import { ParametersItem } from "../ParametersItem"

export const MarketParameters = ({ market }: MarketParametersProps) => {
  const isLocalHost = window.location.hostname === "localhost"
  const { t } = useTranslation()
  const theme = useTheme()
  const isMobile = useMobileResolution()
  const { getAddressUrl, getTokenUrl } = useBlockExplorer({
    chainId: market.chainId,
  })
  const { timeDelinquent, delinquencyGracePeriod } = market

  const [gracePeriodLabel, gracePeriodTimer] =
    timeDelinquent > delinquencyGracePeriod
      ? [
          t("marketDetails.label.remainingTime"),
          humanizeDuration((timeDelinquent - delinquencyGracePeriod) * 1000, {
            round: true,
            largest: 1,
          }),
        ]
      : [
          t("marketDetails.label.availableGracePeriod"),
          formatSecsToHours(delinquencyGracePeriod - timeDelinquent),
        ]

  const gracePeriodTooltip = useMemo(() => {
    const breakdown = market.getTotalDebtBreakdown()
    const willBeDelinquent = breakdown.status === "delinquent"
    if (!market.isDelinquent) {
      if (willBeDelinquent) {
        // If the market is not currently delinquent but will be after the next update:
        return t("marketDetails.tooltip.willBeDelinquent")
      }
      if (timeDelinquent > delinquencyGracePeriod) {
        // If the market is not currently delinquent (on-chain) but is incurring penalties:
        return t("marketDetails.tooltip.delinquencyFeesApply")
      }
      return undefined
    }
    if (!willBeDelinquent) {
      // If the market will stop being delinquent after the next update:
      return t("marketDetails.tooltip.hasBecomeHealthy")
    }
    // If the market will continue to be delinquent after the next update:
    return t("marketDetails.tooltip.delinquencyContinues")
  }, [market])

  const totalInterestAccrued = market
    ? (
        market.totalDelinquencyFeesAccrued ??
        market.underlyingToken.getAmount(0)
      ).add(market.totalBaseInterestAccrued ?? 0)
    : undefined

  const { hooksConfig } = market
  const depositAccess =
    hooksConfig?.depositRequiresAccess === false ? "open" : "restricted"

  let withdrawalAccess: "open" | "restricted"
  if (hooksConfig) {
    if (
      hooksConfig.flags.useOnQueueWithdrawal &&
      (hooksConfig.kind === HooksKind.OpenTerm ||
        hooksConfig.queueWithdrawalRequiresAccess)
    ) {
      withdrawalAccess = "restricted"
    } else {
      withdrawalAccess = "open"
    }
  } else {
    withdrawalAccess = "restricted"
  }
  let transferAccess: "open" | "restricted" | "disabled"
  if (hooksConfig) {
    if (hooksConfig.transfersDisabled) {
      transferAccess = "disabled"
    } else if (hooksConfig.transferRequiresAccess) {
      transferAccess = "restricted"
    } else {
      transferAccess = "open"
    }
  } else {
    transferAccess = "open"
  }
  let earlyClosure: "yes" | "no" | "na" = "no"
  if (hooksConfig) {
    if (hooksConfig.kind === HooksKind.OpenTerm) {
      earlyClosure = "na"
    } else if (hooksConfig.allowClosureBeforeTerm) {
      earlyClosure = "yes"
    } else {
      earlyClosure = "no"
    }
  } else {
    earlyClosure = "no"
  }
  let earlyMaturity: "yes" | "no" | "na" = "no"
  if (hooksConfig) {
    if (hooksConfig.kind === HooksKind.OpenTerm) {
      earlyMaturity = "na"
    } else if (hooksConfig.allowTermReduction) {
      earlyMaturity = "yes"
    } else {
      earlyMaturity = "no"
    }
  } else {
    earlyMaturity = "no"
  }

  const adsMarketParameter = getAdsMarketParameterComponent(market.address)

  const [isMobileOpen, setIsMobileOpen] = React.useState(false)

  useEffect(() => {
    if (!isMobile) {
      setIsMobileOpen(true)
    } else {
      setIsMobileOpen(false)
    }
  }, [isMobile])

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: isMobile ? "20px" : "24px",
        width: "100%",
        backgroundColor: isMobile ? COLORS.white : "transparent",
        borderRadius: isMobile ? "14px" : 0,
        padding: isMobile ? "12px 16px 24px" : "0px",
      }}
    >
      <Typography
        variant={isMobile ? "mobH3" : "title3"}
        sx={{ marginTop: { xs: "12px", md: 0 } }}
      >
        {t("marketDetails.header.parameters")}
      </Typography>
      <Box sx={MarketParametersContainer(theme)}>
        <Box sx={MarketParametersContainerColumn(theme)}>
          <ParametersItem
            title={t("marketDetails.parameters.marketAddress")}
            value={trimAddress(market.address)}
            copy={market.address}
            link={getAddressUrl(market.address)}
          />
          <Divider sx={{ margin: "12px 0 12px" }} />
          <ParametersItem
            title={t("marketDetails.parameters.underlyingAsset")}
            value={`${market.underlyingToken.name} (${trimAddress(
              market.underlyingToken.address,
            )})`}
            tooltipText="The ERC-20 token used for all transactions in the market, such as Wrapped Ether (WETH) or USDC."
            copy={market.underlyingToken.address}
            link={getTokenUrl(market.underlyingToken.address)}
          />
          <Divider sx={{ margin: "12px 0 12px" }} />
          <ParametersItem
            title={t("marketDetails.parameters.marketTokenName")}
            value={market.marketToken.name}
            copy={getTokenUrl(market.marketToken.address)}
            link={getTokenUrl(market.marketToken.address)}
          />
          <Divider sx={{ margin: "12px 0 12px" }} />
          <ParametersItem
            title={t("marketDetails.parameters.marketTokenPrefix")}
            value={market.marketToken.symbol}
          />
          <Divider sx={{ margin: "12px 0 12px" }} />
          <ParametersItem
            title={t("marketDetails.parameters.maxBorrowingCapacity")}
            value={`${formatTokenWithCommas(market.maxTotalSupply, {
              fractionDigits: market.maxTotalSupply.token.decimals,
            })} ${market.underlyingToken.symbol}`}
            tooltipText="The maximum limit of funds that borrowers can access in the market."
          />
          <Divider sx={{ margin: "12px 0 12px" }} />
          <ParametersItem
            title={t("marketDetails.parameters.totalInterestAccrued")}
            value={toTokenAmountProps(totalInterestAccrued).value}
          />
          {isMobileOpen && (
            <>
              <Divider sx={{ margin: "12px 0 12px" }} />
              <ParametersItem
                title={t("marketDetails.parameters.minimumDeposit.label")}
                // value={t(
                // `borrowerMarketDetails.parameters.minimumDeposit.${market.hooksConfig?.minimumDeposit ? "none" : "none"}`,
                // )}
                {...(market.hooksConfig?.minimumDeposit?.gt(0)
                  ? toTokenAmountProps(market.hooksConfig.minimumDeposit)
                  : {
                      value: t("marketDetails.parameters.minimumDeposit.none"),
                    })}
              />
              {market.version === MarketVersion.V2 && (
                <>
                  <Divider sx={{ margin: "12px 0 12px" }} />
                  <ParametersItem
                    title={t("marketDetails.parameters.marketType.label")}
                    value={t(
                      `borrowerMarketDetails.parameters.marketType.${market.hooksKind}.text`,
                    )}
                    valueTooltipText={t(
                      `borrowerMarketDetails.parameters.marketType.${market.hooksKind}.tooltip`,
                    )}
                  />
                </>
              )}
              {market.hooksConfig?.kind === HooksKind.FixedTerm && (
                <>
                  <Divider sx={{ margin: "12px 0 12px" }} />
                  <ParametersItem
                    title={t("marketDetails.parameters.marketExpiry")}
                    value={`${formatDate(
                      market.hooksConfig.fixedTermEndTime,
                    )} 00:00 UTC`}
                  />
                </>
              )}
              <Divider sx={{ margin: "12px 0 12px" }} />
              <ParametersItem
                title={t("marketDetails.parameters.depositAccess.label")}
                value={t(
                  `borrowerMarketDetails.parameters.depositAccess.${depositAccess}.text`,
                )}
                valueTooltipText={t(
                  `borrowerMarketDetails.parameters.depositAccess.${depositAccess}.tooltip`,
                )}
              />
              <Divider sx={{ margin: "12px 0 12px" }} />
              <ParametersItem
                title={t("marketDetails.parameters.withdrawalAccess.label")}
                value={t(
                  `borrowerMarketDetails.parameters.withdrawalAccess.${withdrawalAccess}.text`,
                )}
                valueTooltipText={t(
                  `borrowerMarketDetails.parameters.withdrawalAccess.${withdrawalAccess}.tooltip`,
                )}
              />

              {hooksConfig && market.version === MarketVersion.V2 && (
                <>
                  <Divider sx={{ margin: "12px 0 12px" }} />
                  <ParametersItem
                    title={t("marketDetails.hooks.hooksAddress")}
                    value={trimAddress(hooksConfig.hooksAddress)}
                    copy={hooksConfig.hooksAddress}
                    link={getAddressUrl(hooksConfig.hooksAddress)}
                  />
                </>
              )}
              {isMobile && <Divider sx={{ margin: "12px 0 12px" }} />}
            </>
          )}
        </Box>
        {isMobileOpen && (
          <Box sx={MarketParametersContainerColumn(theme)}>
            <ParametersItem
              title={t("marketDetails.parameters.minimumReserveRatio")}
              value={`${formatBps(
                market.reserveRatioBips,
                MARKET_PARAMS_DECIMALS.reserveRatioBips,
              )}%`}
              tooltipText="A required percentage of market funds that must remain liquid and unavailable for borrowing."
            />
            <Divider sx={{ margin: "12px 0 12px" }} />
            <ParametersItem
              title={t("marketDetails.parameters.baseAPR")}
              value={`${formatBps(
                market.annualInterestBips,
                MARKET_PARAMS_DECIMALS.annualInterestBips,
              )}%`}
              tooltipText="The fixed annual percentage rate (excluding any protocol fees) that borrowers pay to lenders for assets within the market."
            />
            <Divider sx={{ margin: "12px 0 12px" }} />
            {adsMarketParameter && (
              <>
                {adsMarketParameter}
                <Divider sx={{ margin: "12px 0 12px" }} />
              </>
            )}
            <ParametersItem
              title={t("marketDetails.parameters.protocolAPR")}
              value={`${formatBps(
                (market.protocolFeeBips * market.annualInterestBips) / 10000,
                MARKET_PARAMS_DECIMALS.annualInterestBips,
              )}%`}
              tooltipText="An additional APR that accrues to the protocol by slowly increasing required reserves. Derived by the fee configuration of the protocol as a percentage of the current base APR."
            />
            <Divider sx={{ margin: "12px 0 12px" }} />
            <ParametersItem
              title={t("marketDetails.parameters.effectiveAPR")}
              value={`${formatRayAsPercentage(
                market.effectiveLenderAPR,
                MARKET_PARAMS_DECIMALS.annualInterestBips,
              )}%`}
              tooltipText="The current interest rate being paid to lenders: the base APR plus penalty APR if applicable."
            />
            <Divider sx={{ margin: "12px 0 12px" }} />
            <ParametersItem
              title={t("marketDetails.parameters.penaltyAPR")}
              value={`${formatBps(
                market.delinquencyFeeBips,
                MARKET_PARAMS_DECIMALS.delinquencyFeeBips,
              )}%`}
              tooltipText="An additional interest rate charged if the market remains delinquent—failing to maintain required reserves—after the grace period has elapsed."
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
            <ParametersItem
              title={t("marketDetails.parameters.maximumGracePeriod")}
              value={`${formatSecsToHours(market.delinquencyGracePeriod)}`}
              tooltipText="The duration borrowers have to resolve reserve deficiencies or correct delinquency in the market before penalties take effect."
            />
            <Divider sx={{ margin: "12px 0 12px" }} />
            <ParametersItem
              title={gracePeriodLabel}
              value={gracePeriodTimer}
              tooltipText="The portion of the grace period left for borrowers to fix non-compliance issues, such as restoring reserves."
              alarmState={timeDelinquent > delinquencyGracePeriod}
              valueTooltipText={gracePeriodTooltip}
            />
            <Divider sx={{ margin: "12px 0 12px" }} />
            <ParametersItem
              title={t("marketDetails.parameters.withdrawalCycleDuration")}
              value={`${formatSecsToHours(market.withdrawalBatchDuration)}`}
              tooltipText="A fixed period during which withdrawal requests are grouped and processed."
            />
            <Divider sx={{ margin: "12px 0 12px" }} />
            <ParametersItem
              title={t("marketDetails.parameters.transferAccess.label")}
              value={t(
                `borrowerMarketDetails.parameters.transferAccess.${transferAccess}.text`,
              )}
              valueTooltipText={t(
                `borrowerMarketDetails.parameters.transferAccess.${transferAccess}.tooltip`,
              )}
            />
            <Divider sx={{ margin: "12px 0 12px" }} />
            <ParametersItem
              title={t("marketDetails.parameters.marketEarlyClosure.label")}
              value={t(
                `borrowerMarketDetails.parameters.marketEarlyClosure.${earlyClosure}.text`,
              )}
              valueTooltipText={t(
                `borrowerMarketDetails.parameters.marketEarlyClosure.${earlyClosure}.tooltip`,
              )}
            />
            <Divider sx={{ margin: "12px 0 12px" }} />
            <ParametersItem
              title={t(
                "marketDetails.parameters.marketMaturityReduction.label",
              )}
              value={t(
                `borrowerMarketDetails.parameters.marketMaturityReduction.${earlyMaturity}.text`,
              )}
              valueTooltipText={t(
                `borrowerMarketDetails.parameters.marketMaturityReduction.${earlyMaturity}.tooltip`,
              )}
            />
          </Box>
        )}
      </Box>

      {hooksConfig && isLocalHost && isMobileOpen && (
        <>
          <Typography variant="title3">
            {t("marketDetails.hooks.title")}
          </Typography>
          <Box sx={MarketParametersContainer(theme)}>
            <Box sx={MarketParametersContainerColumn(theme)}>
              <ParametersItem
                title={t("marketDetails.hooks.hooksAddress")}
                value={trimAddress(hooksConfig.hooksAddress)}
                copy={hooksConfig.hooksAddress}
                link={getAddressUrl(hooksConfig.hooksAddress)}
              />
              {(
                [
                  "useOnDeposit",
                  "useOnQueueWithdrawal",
                  "useOnExecuteWithdrawal",
                  "useOnTransfer",
                  "useOnBorrow",
                ] as const
              ).map((x) => (
                <ParametersItem
                  key={x}
                  title={t(`borrowerMarketDetails.hooks.${x}`)}
                  value={hooksConfig.flags[x] ? "True" : "False"}
                />
              ))}
            </Box>
            <Box sx={MarketParametersContainerColumn(theme)}>
              {(
                [
                  "useOnRepay",
                  "useOnCloseMarket",
                  "useOnNukeFromOrbit",
                  "useOnSetMaxTotalSupply",
                  "useOnSetAnnualInterestAndReserveRatioBips",
                  "useOnSetProtocolFeeBips",
                ] as const
              ).map((x) => (
                <ParametersItem
                  key={x}
                  title={t(`borrowerMarketDetails.hooks.${x}`)}
                  value={hooksConfig.flags[x] ? "True" : "False"}
                />
              ))}
            </Box>
          </Box>
        </>
      )}

      {isMobile && (
        <SeeMoreButton
          variant="accordion"
          isOpen={isMobileOpen}
          setIsOpen={setIsMobileOpen}
        />
      )}
    </Box>
  )
}
