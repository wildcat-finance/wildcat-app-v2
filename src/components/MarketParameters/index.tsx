import React, { useEffect, useMemo } from "react"

import { Box, Divider, Typography, useTheme } from "@mui/material"
import { MarketVersion, HooksKind } from "@wildcatfi/wildcat-sdk"
import humanizeDuration from "humanize-duration"
import Link from "next/link"
import { useTranslation } from "react-i18next"

import { getAdsMarketParameterComponent } from "@/components/AdsBanners/adsHelpers"
import { getMarketImplementationVariant } from "@/components/market-implementation-variants"
import { SeeMoreButton } from "@/components/Mobile/SeeMoreButton"
import { EXTERNAL_LINKS } from "@/constants/external-links"
import {
  DEPOSIT_ACCESS_TEXT_KEY,
  DEPOSIT_ACCESS_TOOLTIP_KEY,
  EARLY_CLOSURE_TEXT_KEY,
  EARLY_CLOSURE_TOOLTIP_KEY,
  HOOK_FLAG_KEYS_PRIMARY,
  HOOK_FLAG_KEYS_SECONDARY,
  LENDER_ONBOARDING_TEXT_KEY,
  LENDER_ONBOARDING_TOOLTIP_KEY,
  MARKET_TERM_TEXT_KEY,
  MARKET_TERM_TOOLTIP_KEY,
  MATURITY_REDUCTION_TEXT_KEY,
  MATURITY_REDUCTION_TOOLTIP_KEY,
  PERIODIC_WINDOW_START_KEY,
  PERIODIC_WINDOW_STATUS_TEXT_KEY,
  PERIODIC_WINDOW_STATUS_TOOLTIP_KEY,
  TEMP_RATIO_ACTIVE_TOOLTIP_KEY,
  TEMP_RATIO_BANNER_BODY_KEY,
  TEMP_RATIO_EXPIRED_TOOLTIP_KEY,
  TRANSFER_ACCESS_TEXT_KEY,
  TRANSFER_ACCESS_TOOLTIP_KEY,
  WITHDRAWAL_ACCESS_TEXT_KEY,
  WITHDRAWAL_ACCESS_TOOLTIP_KEY,
} from "@/constants/i18nKeys"
import { useBlockExplorer } from "@/hooks/useBlockExplorer"
import { useEthersProvider } from "@/hooks/useEthersSigner"
import { useLivePeriodicNowSeconds } from "@/hooks/useLiveNowSeconds"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { useAdoptionData } from "@/hooks/wrapper/useAdoptionData"
import { formatDate } from "@/lib/mlaFormatters"
import { COLORS } from "@/theme/colors"
import { dayjs } from "@/utils/dayjs"
import {
  formatBps,
  formatSecsToHours,
  formatTokenWithCommas,
  MARKET_PARAMS_DECIMALS,
  toTokenAmountProps,
  trimAddress,
} from "@/utils/formatters"
import { getMarketAprDisplayBips } from "@/utils/marketApr"
import { getEffectiveMarketAccess } from "@/utils/marketCapabilities"
import {
  getMarketImplementationConfig,
  getMarketImplementationType,
} from "@/utils/marketImplementation"
import { getLenderOnboardingType } from "@/utils/marketOnboarding"
import { getPendingPeriodicAprChange } from "@/utils/periodicApr"
import {
  formatCompactDuration,
  getPeriodicWindowTiming,
} from "@/utils/periodicWithdrawalWindow"

import { MarketParametersProps } from "./interface"
import {
  MarketParametersContainer,
  MarketParametersContainerColumn,
} from "./style"
import { ParametersItem } from "../ParametersItem"
import { TooltipButton } from "../TooltipButton"

const formatPeriodicDateTime = (timestamp: number) =>
  dayjs.unix(timestamp).utc().format("D MMM YYYY, HH:mm [UTC]")

const formatPeriodicDuration = (seconds: number) =>
  humanizeDuration(seconds * 1000, { round: true, largest: 2 })

const WrapperChip = ({ hasWrapper }: { hasWrapper?: boolean }) => (
  <Box
    sx={{
      width: "fit-content",
      display: "flex",
      alignItems: "center",
      gap: "3px",
      padding: "0 8px 0 5px",
      borderRadius: "12px",
      backgroundColor: hasWrapper ? "#D1FAE6" : COLORS.remy,
    }}
  >
    <Box
      sx={{
        width: "4px",
        height: "4px",
        borderRadius: "50%",
        backgroundColor: hasWrapper ? "#28CA7C" : COLORS.wildWatermelon,
      }}
    />

    <Typography variant="text4" color={hasWrapper ? "#19965A" : COLORS.dullRed}>
      {hasWrapper ? "Active" : "Inactive"}
    </Typography>
  </Box>
)

const AdoptionStatsRow = ({
  label,
  amount,
  asset,
  pct,
}: {
  label: string
  amount: string
  asset: string
  pct: string
}) => (
  <Box sx={{ display: "flex", flexDirection: "column", width: "100%" }}>
    <Typography variant="text3" sx={{ color: COLORS.santasGrey }}>
      {label}
    </Typography>
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: "4px",
        width: "100%",
      }}
    >
      <Typography variant="text3" sx={{ color: COLORS.blackRock }}>
        {amount}
      </Typography>
      <Typography
        variant="text3"
        sx={{ color: COLORS.greySuit, flex: "1 0 0" }}
      >
        {pct}%
      </Typography>
      <Typography variant="text4" sx={{ color: COLORS.blackRock }}>
        {asset}
      </Typography>
    </Box>
  </Box>
)

const AdoptionStats = ({
  marketAmount,
  marketAsset,
  sharesAmount,
  sharesAsset,
  marketPct,
  sharesPct,
}: {
  marketAmount: string
  marketAsset: string
  sharesAmount: string
  sharesAsset: string
  marketPct: string
  sharesPct: string
}) => {
  const { t } = useTranslation()

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        width: "100%",
      }}
    >
      <AdoptionStatsRow
        label={t("marketParameters.originalToken")}
        amount={marketAmount}
        asset={marketAsset}
        pct={marketPct}
      />
      <AdoptionStatsRow
        label={t("marketParameters.wrappedToken")}
        amount={sharesAmount}
        asset={sharesAsset}
        pct={sharesPct}
      />
    </Box>
  )
}

export const MarketParameters = ({
  market,
  viewerType,
  wrapper,
  hasWrapper,
  additionalItems,
}: MarketParametersProps) => {
  const isLocalHost = window.location.hostname === "localhost"
  const { t } = useTranslation()
  const theme = useTheme()
  const isMobile = useMobileResolution()
  const { getAddressUrl, getTokenUrl } = useBlockExplorer({
    chainId: market.chainId,
  })
  const { timeDelinquent, delinquencyGracePeriod } = market

  const { address } = useEthersProvider({
    chainId: market?.chainId,
  })

  const { data: adoptionData } = useAdoptionData(
    market?.chainId,
    wrapper,
    viewerType,
    address,
  )

  const marketValue = adoptionData
    ? formatTokenWithCommas(adoptionData.originalAmount)
    : "0"
  const shareValue = adoptionData
    ? formatTokenWithCommas(adoptionData.wrappedAmount)
    : "0"

  const adoptionTotal = adoptionData
    ? adoptionData.originalAssetValue + adoptionData.wrappedAssetValue
    : 0
  const marketPctNum =
    adoptionTotal > 0
      ? Math.round((adoptionData!.originalAssetValue / adoptionTotal) * 100)
      : 0
  const marketPct = String(marketPctNum)
  const sharesPct = String(adoptionTotal > 0 ? 100 - marketPctNum : 0)

  const adoptionStatsTooltip =
    viewerType === "lender"
      ? "Your Market (debt) tokens vs the amount of wrapped Market debt (tokens)"
      : "The total amount of Market (debt) tokens vs the total amount of wrapped Market (debt) tokens"

  const [gracePeriodLabel, gracePeriodTimer] =
    timeDelinquent > delinquencyGracePeriod
      ? [
          t("marketDetails.borrower.label.remainingTime"),
          humanizeDuration((timeDelinquent - delinquencyGracePeriod) * 1000, {
            round: true,
            largest: 1,
          }),
        ]
      : [
          t("marketDetails.borrower.label.availableGracePeriod"),
          formatSecsToHours(delinquencyGracePeriod - timeDelinquent),
        ]

  const gracePeriodTooltip = useMemo(() => {
    const breakdown = market.getTotalDebtBreakdown()
    const willBeDelinquent = breakdown.status === "delinquent"
    if (!market.isDelinquent) {
      if (willBeDelinquent) {
        // If the market is not currently delinquent but will be after the next update:
        return t("marketDetails.borrower.tooltip.willBeDelinquent")
      }
      if (timeDelinquent > delinquencyGracePeriod) {
        // If the market is not currently delinquent (on-chain) but is incurring penalties:
        return t("marketDetails.borrower.tooltip.delinquencyFeesApply")
      }
      return undefined
    }
    if (!willBeDelinquent) {
      // If the market will stop being delinquent after the next update:
      return t("marketDetails.borrower.tooltip.hasBecomeHealthy")
    }
    // If the market will continue to be delinquent after the next update:
    return t("marketDetails.borrower.tooltip.delinquencyContinues")
  }, [delinquencyGracePeriod, market, t, timeDelinquent])

  const totalInterestAccrued = market
    ? (
        market.totalDelinquencyFeesAccrued ??
        market.underlyingToken.getAmount(0)
      ).add(market.totalBaseInterestAccrued ?? 0)
    : undefined

  const tempRatiosDiffer =
    market.temporaryReserveRatio &&
    market.reserveRatioBips !== market.originalReserveRatioBips

  // Ticks every second while the market has an active periodic schedule so
  // the window status, countdowns and pending-APR state flip live.
  const nowSec = useLivePeriodicNowSeconds(market)
  const tempRatioExpired =
    tempRatiosDiffer && market.temporaryReserveRatioExpiry < nowSec

  const hasTempReserveRatio = tempRatiosDiffer && !tempRatioExpired

  const originalRatioFormatted = formatBps(
    market.originalReserveRatioBips,
    MARKET_PARAMS_DECIMALS.reserveRatioBips,
  )
  const currentRatioFormatted = formatBps(
    market.reserveRatioBips,
    MARKET_PARAMS_DECIMALS.reserveRatioBips,
  )
  const tempReserveRatioExpiry = hasTempReserveRatio
    ? dayjs
        .unix(market.temporaryReserveRatioExpiry)
        .utc()
        .format("D MMM YYYY, HH:mm [UTC]")
    : undefined
  const pendingPeriodicAprChange = getPendingPeriodicAprChange(market, nowSec)
  const pendingPeriodicAprReadyAt = pendingPeriodicAprChange
    ? formatPeriodicDateTime(pendingPeriodicAprChange.responseWindowEnd)
    : undefined

  const tempRatioI18nPrefix = viewerType === "borrower" ? "borrower" : "lender"

  const tempRatioValueComponent = (() => {
    if (hasTempReserveRatio) {
      return (
        <TooltipButton
          value={t(TEMP_RATIO_ACTIVE_TOOLTIP_KEY[tempRatioI18nPrefix], {
            expiry: tempReserveRatioExpiry,
            originalRatio: originalRatioFormatted,
            currentRatio: currentRatioFormatted,
          })}
          color={COLORS.galliano}
        />
      )
    }
    if (tempRatioExpired) {
      return (
        <TooltipButton
          value={t(TEMP_RATIO_EXPIRED_TOOLTIP_KEY[tempRatioI18nPrefix], {
            currentRatio: currentRatioFormatted,
            originalRatio: originalRatioFormatted,
          })}
          color={COLORS.santasGrey}
        />
      )
    }
    return undefined
  })()

  const { hooksConfig, periodicHooksConfig } = market
  const aprDisplay = getMarketAprDisplayBips(market)
  const { aprCopy, ExtraParametersSection } =
    getMarketImplementationVariant(market)
  const implementationType = getMarketImplementationType(market)
  const implementationConfig = getMarketImplementationConfig(implementationType)
  const fixedTermHooksConfig =
    hooksConfig?.kind === HooksKind.FixedTerm ? hooksConfig : undefined
  const lenderOnboarding = getLenderOnboardingType(market.onboardingMode)
  const { depositAccess, withdrawalAccess } = getEffectiveMarketAccess(market)

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
    if (!fixedTermHooksConfig) {
      earlyClosure = "na"
    } else if (fixedTermHooksConfig.allowClosureBeforeTerm) {
      earlyClosure = "yes"
    } else {
      earlyClosure = "no"
    }
  } else {
    earlyClosure = "no"
  }
  let earlyMaturity: "yes" | "no" | "na" = "no"
  if (hooksConfig) {
    if (!fixedTermHooksConfig) {
      earlyMaturity = "na"
    } else if (fixedTermHooksConfig.allowTermReduction) {
      earlyMaturity = "yes"
    } else {
      earlyMaturity = "no"
    }
  } else {
    earlyMaturity = "no"
  }

  // All periodic state below derives from the same ticked `nowSec` so the
  // status, labels and timestamps can never disagree mid-boundary.
  const periodicWindowTiming = getPeriodicWindowTiming(market, nowSec)

  const periodicWindowStatus = (() => {
    if (!periodicHooksConfig) return undefined
    if (periodicHooksConfig.periodicTermClosed) return "closed"
    return periodicWindowTiming?.isOpen ? "open" : "scheduled"
  })()

  const periodicWindowStartLabel =
    periodicWindowStatus === "open" ? "currentWindowStart" : "nextWindowStart"

  const periodicWindowStartTimestamp = (() => {
    if (!periodicWindowTiming || periodicWindowTiming.isTermClosed)
      return undefined
    if (
      periodicWindowTiming.isOpen &&
      periodicWindowTiming.currentWindowEnd !== undefined &&
      periodicHooksConfig
    ) {
      return (
        periodicWindowTiming.currentWindowEnd -
        periodicHooksConfig.withdrawalWindowDuration
      )
    }
    return periodicWindowTiming.nextWindowStart
  })()
  // Compact form ("2m 37s") — the parameters value column ellipsizes past
  // ~26 characters, which the verbose humanized form always exceeds.
  const periodicWindowCountdown = (() => {
    if (!periodicWindowTiming || periodicWindowTiming.isTermClosed)
      return undefined
    if (periodicWindowTiming.isOpen && periodicWindowTiming.currentWindowEnd) {
      return t("common.labels.timeLeft", {
        time: formatCompactDuration(
          periodicWindowTiming.currentWindowEnd - nowSec,
        ),
      })
    }
    return t("marketParameters.periodicTerm.windowStatus.opensIn", {
      duration: formatCompactDuration(
        periodicWindowTiming.nextWindowStart - nowSec,
      ),
    })
  })()

  const adsMarketParameter = getAdsMarketParameterComponent(
    market.chainId,
    market.address,
  )

  const [isMobileOpen, setIsMobileOpen] = React.useState(false)

  useEffect(() => {
    if (!isMobile) {
      setIsMobileOpen(true)
    } else {
      setIsMobileOpen(false)
    }
  }, [isMobile])

  const configuredAprLabel = t(aprCopy.configuredAprLabelKey)

  const configuredAprDisplayValue = `${formatBps(
    aprDisplay.configuredAprBips,
    MARKET_PARAMS_DECIMALS.annualInterestBips,
  )}%`

  const protocolAprDisplayValue = `${formatBps(
    aprDisplay.currentProtocolAprBips,
    MARKET_PARAMS_DECIMALS.annualInterestBips,
  )}%`

  const effectiveLenderAprDisplayValue = `${formatBps(
    aprDisplay.currentEffectiveLenderAprBips,
    MARKET_PARAMS_DECIMALS.annualInterestBips,
  )}%`

  const penaltyAprTooltipValue = market.isIncurringPenalties
    ? `This market is incurring delinquency fees, leading to a total APR of ${effectiveLenderAprDisplayValue}. Penalties will continue to apply until the delinquency timer is below the grace period.`
    : undefined

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
        {t("marketDetails.shared.header.parameters")}
      </Typography>
      <Box sx={MarketParametersContainer(theme)}>
        <Box sx={MarketParametersContainerColumn(theme)}>
          <ParametersItem
            title={t("marketParameters.marketAddress")}
            value={trimAddress(market.address)}
            copy={market.address}
            link={getAddressUrl(market.address)}
          />
          <Divider sx={{ margin: "12px 0 12px" }} />
          <ParametersItem
            title={t("common.fields.underlyingAsset")}
            value={`${market.underlyingToken.name} (${trimAddress(
              market.underlyingToken.address,
            )})`}
            tooltipText={t("common.labels.erc20TokenUsedAll")}
            copy={market.underlyingToken.address}
            link={getTokenUrl(market.underlyingToken.address)}
          />
          <Divider sx={{ margin: "12px 0 12px" }} />
          <ParametersItem
            title={t("marketParameters.marketTokenName")}
            value={market.marketToken.name}
            copy={market.marketToken.address}
            link={getTokenUrl(market.marketToken.address)}
          />
          <Divider sx={{ margin: "12px 0 12px" }} />
          <ParametersItem
            title={t("common.fields.marketTokenSymbol")}
            value={market.marketToken.symbol}
          />
          <Divider sx={{ margin: "12px 0 12px" }} />
          <ParametersItem
            title={t("marketParameters.maxBorrowingCapacity")}
            value={`${formatTokenWithCommas(market.maxTotalSupply, {
              fractionDigits: market.maxTotalSupply.token.decimals,
            })} ${market.underlyingToken.symbol}`}
            tooltipText={t("common.labels.maximumLimitFundsBorrowersCan")}
          />
          <Divider sx={{ margin: "12px 0 12px" }} />
          <ParametersItem
            title={t("marketParameters.totalInterestAccrued")}
            value={toTokenAmountProps(totalInterestAccrued).value}
          />
          {isMobileOpen && additionalItems && additionalItems.length > 0 && (
            <>
              {additionalItems.slice(0, -1).map((item) => (
                <React.Fragment key={item.title}>
                  <Divider sx={{ margin: "12px 0 12px" }} />
                  <ParametersItem
                    title={item.title}
                    value={item.value}
                    tooltipText={item.tooltipText}
                  />
                </React.Fragment>
              ))}
            </>
          )}
          {isMobileOpen && (
            <>
              <Divider sx={{ margin: "12px 0 12px" }} />
              <ParametersItem
                title={t("common.fields.type")}
                value={implementationConfig.label}
              />
              <Divider sx={{ margin: "12px 0 12px" }} />
              {market.version === MarketVersion.V2 && market.hooksKind && (
                <>
                  <ParametersItem
                    title={t("common.fields.term")}
                    value={t(MARKET_TERM_TEXT_KEY[market.hooksKind])}
                    valueTooltipText={t(
                      MARKET_TERM_TOOLTIP_KEY[market.hooksKind],
                    )}
                  />
                  <Divider sx={{ margin: "12px 0 12px" }} />
                </>
              )}
              <ParametersItem
                title={t("common.fields.minimumDeposit")}
                // value={t(
                // `borrowerMarketDetails.parameters.minimumDeposit.${market.hooksConfig?.minimumDeposit ? "none" : "none"}`,
                // )}
                {...(market.hooksConfig?.minimumDeposit?.gt(0)
                  ? toTokenAmountProps(market.hooksConfig.minimumDeposit)
                  : {
                      value: t("marketParameters.minimumDeposit.none"),
                    })}
              />
              {fixedTermHooksConfig && (
                <>
                  <Divider sx={{ margin: "12px 0 12px" }} />
                  <ParametersItem
                    title={t("marketParameters.marketExpiry")}
                    value={`${formatDate(
                      fixedTermHooksConfig.fixedTermEndTime,
                    )} 00:00 UTC`}
                  />
                </>
              )}
              {periodicHooksConfig && (
                <>
                  <Divider sx={{ margin: "12px 0 12px" }} />
                  <ParametersItem
                    title={t("marketParameters.periodicTerm.firstWindowStart")}
                    value={formatPeriodicDateTime(
                      periodicHooksConfig.firstWithdrawalWindowStart,
                    )}
                    tooltipText={t(
                      "marketParameters.periodicTerm.firstWindowStartTooltip",
                    )}
                  />
                  <Divider sx={{ margin: "12px 0 12px" }} />
                  <ParametersItem
                    title={t("common.fields.withdrawalPeriod")}
                    value={formatPeriodicDuration(
                      periodicHooksConfig.periodDuration,
                    )}
                    tooltipText={t(
                      "marketParameters.periodicTerm.periodDurationTooltip",
                    )}
                  />
                  <Divider sx={{ margin: "12px 0 12px" }} />
                  <ParametersItem
                    title={t("common.fields.withdrawalWindow")}
                    value={formatPeriodicDuration(
                      periodicHooksConfig.withdrawalWindowDuration,
                    )}
                    tooltipText={t(
                      "marketParameters.periodicTerm.withdrawalWindowDurationTooltip",
                    )}
                  />
                  {periodicWindowStatus && (
                    <>
                      <Divider sx={{ margin: "12px 0 12px" }} />
                      <ParametersItem
                        title={t(
                          "marketParameters.periodicTerm.windowStatus.label",
                        )}
                        value={
                          periodicWindowCountdown
                            ? `${t(
                                PERIODIC_WINDOW_STATUS_TEXT_KEY[
                                  periodicWindowStatus
                                ],
                              )} · ${periodicWindowCountdown}`
                            : t(
                                PERIODIC_WINDOW_STATUS_TEXT_KEY[
                                  periodicWindowStatus
                                ],
                              )
                        }
                        valueTooltipText={t(
                          PERIODIC_WINDOW_STATUS_TOOLTIP_KEY[
                            periodicWindowStatus
                          ],
                        )}
                      />
                    </>
                  )}
                  {periodicWindowStartTimestamp !== undefined && (
                    <>
                      <Divider sx={{ margin: "12px 0 12px" }} />
                      <ParametersItem
                        title={t(
                          PERIODIC_WINDOW_START_KEY[periodicWindowStartLabel],
                        )}
                        value={formatPeriodicDateTime(
                          periodicWindowStartTimestamp,
                        )}
                      />
                    </>
                  )}
                </>
              )}
              <Divider sx={{ margin: "12px 0 12px" }} />
              <ParametersItem
                title={t("marketParameters.lenderOnboarding.label")}
                value={t(LENDER_ONBOARDING_TEXT_KEY[lenderOnboarding])}
                valueTooltipText={t(
                  LENDER_ONBOARDING_TOOLTIP_KEY[lenderOnboarding],
                )}
              />
              <Divider sx={{ margin: "12px 0 12px" }} />
              <ParametersItem
                title={t("marketParameters.depositAccess.label")}
                value={t(DEPOSIT_ACCESS_TEXT_KEY[depositAccess])}
                valueTooltipText={t(DEPOSIT_ACCESS_TOOLTIP_KEY[depositAccess])}
              />
              <Divider sx={{ margin: "12px 0 12px" }} />
              <ParametersItem
                title={t("marketParameters.withdrawalAccess.label")}
                value={t(WITHDRAWAL_ACCESS_TEXT_KEY[withdrawalAccess])}
                valueTooltipText={t(
                  WITHDRAWAL_ACCESS_TOOLTIP_KEY[withdrawalAccess],
                )}
              />

              {hooksConfig && market.version === MarketVersion.V2 && (
                <>
                  <Divider sx={{ margin: "12px 0 12px" }} />
                  <ParametersItem
                    title={t("marketParameters.hooks.hooksAddress")}
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
            {hasTempReserveRatio && (
              <Box
                sx={{
                  display: "flex",
                  gap: "10px",
                  padding: "12px 16px",
                  borderRadius: "8px",
                  backgroundColor: COLORS.oasis,
                  border: `1px solid ${COLORS.galliano}`,
                  mb: "12px",
                }}
              >
                <Typography
                  variant={isMobile ? "mobText3" : "text3"}
                  sx={{ color: COLORS.butteredRum }}
                >
                  <strong>
                    {t("marketParameters.tempReserveRatio.bannerHeading")}
                  </strong>{" "}
                  {t(TEMP_RATIO_BANNER_BODY_KEY[tempRatioI18nPrefix], {
                    originalRatio: originalRatioFormatted,
                    currentRatio: currentRatioFormatted,
                    expiry: tempReserveRatioExpiry,
                  })}{" "}
                  <Link
                    href={EXTERNAL_LINKS.DOCS_REDUCING_APR}
                    target="_blank"
                    style={{ color: COLORS.butteredRum, fontWeight: 600 }}
                  >
                    {t("common.buttons.learnMore")}
                  </Link>
                </Typography>
              </Box>
            )}
            <ParametersItem
              title={
                hasTempReserveRatio
                  ? t("marketParameters.tempReserveRatio.title")
                  : t("marketParameters.minimumReserveRatio")
              }
              value={`${
                hasTempReserveRatio || tempRatioExpired
                  ? originalRatioFormatted
                  : currentRatioFormatted
              }%`}
              tooltipText={t("common.labels.requiredPercentageMarketFundsMust")}
              valueComponent={tempRatioValueComponent}
            />
            {hasTempReserveRatio && (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "flex-end",
                  mt: "-4px",
                  mb: "2px",
                }}
              >
                <Box
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    backgroundColor: COLORS.oasis,
                  }}
                >
                  <Typography
                    variant="text4"
                    sx={{ color: COLORS.butteredRum, fontSize: "12px" }}
                  >
                    {t("marketParameters.tempReserveRatio.badgeLabel", {
                      currentRatio: currentRatioFormatted,
                      expiry: tempReserveRatioExpiry,
                    })}
                  </Typography>
                </Box>
              </Box>
            )}
            <Divider sx={{ margin: "12px 0 12px" }} />
            <ParametersItem
              title={configuredAprLabel}
              value={configuredAprDisplayValue}
              tooltipText={aprCopy.configuredAprTooltip}
              valueTooltipText={aprCopy.getConfiguredAprValueTooltip(
                aprDisplay,
              )}
            />
            {pendingPeriodicAprChange && pendingPeriodicAprReadyAt && (
              <>
                <Divider sx={{ margin: "12px 0 12px" }} />
                <ParametersItem
                  title={t("marketParameters.pendingPeriodicApr.label")}
                  value={`${formatBps(
                    pendingPeriodicAprChange.proposedAprBips,
                    MARKET_PARAMS_DECIMALS.annualInterestBips,
                  )}%`}
                  tooltipText={t("marketParameters.pendingPeriodicApr.tooltip")}
                  valueTooltipText={t(
                    "marketParameters.pendingPeriodicApr.pendingNotice",
                    {
                      currentApr: formatBps(
                        market.annualInterestBips,
                        MARKET_PARAMS_DECIMALS.annualInterestBips,
                      ),
                      proposedApr: formatBps(
                        pendingPeriodicAprChange.proposedAprBips,
                        MARKET_PARAMS_DECIMALS.annualInterestBips,
                      ),
                      readyAt: pendingPeriodicAprReadyAt,
                    },
                  )}
                />
              </>
            )}
            <Divider sx={{ margin: "12px 0 12px" }} />
            {ExtraParametersSection && (
              <ExtraParametersSection aprDisplay={aprDisplay} />
            )}
            {adsMarketParameter && (
              <>
                {adsMarketParameter}
                <Divider sx={{ margin: "12px 0 12px" }} />
              </>
            )}
            <ParametersItem
              title={t("common.fields.protocolFeeApr")}
              value={protocolAprDisplayValue}
              tooltipText={aprCopy.protocolAprTooltip}
            />
            <Divider sx={{ margin: "12px 0 12px" }} />
            <ParametersItem
              title={t("marketParameters.effectiveAPR")}
              value={effectiveLenderAprDisplayValue}
              tooltipText={aprCopy.effectiveLenderAprTooltip}
            />
            <Divider sx={{ margin: "12px 0 12px" }} />
            <ParametersItem
              title={t("common.fields.penaltyApr")}
              value={`${formatBps(
                market.delinquencyFeeBips,
                MARKET_PARAMS_DECIMALS.delinquencyFeeBips,
              )}%`}
              tooltipText={t(
                "marketParameters.additionalInterestRateChargedIf",
              )}
              alarmState={market.isIncurringPenalties}
              valueTooltipText={penaltyAprTooltipValue}
            />
            <Divider sx={{ margin: "12px 0 12px" }} />
            <ParametersItem
              title={t("marketParameters.maximumGracePeriod")}
              value={`${formatSecsToHours(market.delinquencyGracePeriod)}`}
              tooltipText={t(
                "common.labels.durationBorrowersHaveResolveReserve",
              )}
            />
            <Divider sx={{ margin: "12px 0 12px" }} />
            <ParametersItem
              title={gracePeriodLabel}
              value={gracePeriodTimer}
              tooltipText={t(
                "marketParameters.portionGracePeriodLeftBorrowers",
              )}
              alarmState={timeDelinquent > delinquencyGracePeriod}
              valueTooltipText={gracePeriodTooltip}
            />
            <Divider sx={{ margin: "12px 0 12px" }} />
            <ParametersItem
              title={t("common.fields.withdrawalCycleDuration")}
              value={`${formatSecsToHours(market.withdrawalBatchDuration)}`}
              tooltipText={t("common.labels.fixedPeriodDuringWhichWithdrawal")}
            />
            <Divider sx={{ margin: "12px 0 12px" }} />
            <ParametersItem
              title={t("marketParameters.transferAccess.label")}
              value={t(TRANSFER_ACCESS_TEXT_KEY[transferAccess])}
              valueTooltipText={t(TRANSFER_ACCESS_TOOLTIP_KEY[transferAccess])}
            />
            <Divider sx={{ margin: "12px 0 12px" }} />
            <ParametersItem
              title={t("marketParameters.marketEarlyClosure.label")}
              value={t(EARLY_CLOSURE_TEXT_KEY[earlyClosure])}
              valueTooltipText={t(EARLY_CLOSURE_TOOLTIP_KEY[earlyClosure])}
            />
            <Divider sx={{ margin: "12px 0 12px" }} />
            <ParametersItem
              title={t("marketParameters.marketMaturityReduction.label")}
              value={t(MATURITY_REDUCTION_TEXT_KEY[earlyMaturity])}
              valueTooltipText={t(
                MATURITY_REDUCTION_TOOLTIP_KEY[earlyMaturity],
              )}
            />
            {additionalItems && additionalItems.length > 0 && (
              <>
                <Divider sx={{ margin: "12px 0 12px" }} />
                <ParametersItem
                  title={additionalItems[additionalItems.length - 1].title}
                  value={additionalItems[additionalItems.length - 1].value}
                  tooltipText={
                    additionalItems[additionalItems.length - 1].tooltipText
                  }
                />
              </>
            )}
          </Box>
        )}
      </Box>

      {isMobileOpen && (
        <>
          <Divider />
          <Box
            sx={{
              display: "flex",
              flexDirection: isMobile ? "column" : "row",
              gap: isMobile ? "0px" : "24px",
              width: "100%",
            }}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
              }}
            >
              <ParametersItem
                title={t("marketParameters.wrapper")}
                value=""
                valueComponent={<WrapperChip hasWrapper={hasWrapper} />}
              />
              {hasWrapper && wrapper && (
                <>
                  <Divider sx={{ margin: "12px 0" }} />
                  <ParametersItem
                    title={t("marketParameters.wrapperAddress")}
                    value={trimAddress(wrapper.address.toLowerCase())}
                    copy={wrapper.address}
                    link={getAddressUrl(wrapper.address.toLowerCase())}
                  />
                </>
              )}
            </Box>
            {hasWrapper && wrapper && (
              <Box
                sx={{
                  flex: 1,
                  borderLeft: isMobile
                    ? "none"
                    : `1px solid ${COLORS.athensGrey}`,
                  paddingLeft: isMobile ? 0 : "24px",
                  borderTop: isMobile
                    ? `1px solid ${COLORS.athensGrey}`
                    : "none",
                  marginTop: isMobile ? "12px" : 0,
                  paddingTop: isMobile ? "12px" : 0,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    marginBottom: "4px",
                  }}
                >
                  <Typography
                    variant={isMobile ? "mobText3" : "text3"}
                    sx={{ color: COLORS.santasGrey }}
                  >
                    {t("marketParameters.adoptionStatus")}
                  </Typography>
                  <TooltipButton value={adoptionStatsTooltip} />
                </Box>
                <AdoptionStats
                  marketAmount={marketValue}
                  marketAsset={wrapper.marketToken.symbol}
                  sharesAmount={shareValue}
                  sharesAsset={
                    viewerType === "borrower"
                      ? wrapper.marketToken.symbol
                      : wrapper.shareToken.symbol
                  }
                  marketPct={marketPct}
                  sharesPct={sharesPct}
                />
              </Box>
            )}
          </Box>
        </>
      )}

      {hooksConfig && isLocalHost && isMobileOpen && (
        <>
          <Typography variant="title3">
            {t("marketParameters.hooks.title")}
          </Typography>
          <Box sx={MarketParametersContainer(theme)}>
            <Box sx={MarketParametersContainerColumn(theme)}>
              <ParametersItem
                title={t("marketParameters.hooks.hooksAddress")}
                value={trimAddress(hooksConfig.hooksAddress)}
                copy={hooksConfig.hooksAddress}
                link={getAddressUrl(hooksConfig.hooksAddress)}
              />
              {HOOK_FLAG_KEYS_PRIMARY.map(({ flag, key }) => (
                <ParametersItem
                  key={flag}
                  title={t(key)}
                  value={hooksConfig.flags[flag] ? "True" : "False"}
                />
              ))}
            </Box>
            <Box sx={MarketParametersContainerColumn(theme)}>
              {HOOK_FLAG_KEYS_SECONDARY.map(({ flag, key }) => (
                <ParametersItem
                  key={flag}
                  title={t(key)}
                  value={hooksConfig.flags[flag] ? "True" : "False"}
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
