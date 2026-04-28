import React, { useEffect, useMemo } from "react"

import { Box, Divider, Typography, useTheme } from "@mui/material"
import { MarketVersion, HooksKind } from "@wildcatfi/wildcat-sdk"
import humanizeDuration from "humanize-duration"
import Link from "next/link"
import { useTranslation } from "react-i18next"

import { getAdsMarketParameterComponent } from "@/components/AdsBanners/adsHelpers"
import { SeeMoreButton } from "@/components/Mobile/SeeMoreButton"
import { EXTERNAL_LINKS } from "@/constants/external-links"
import { useBlockExplorer } from "@/hooks/useBlockExplorer"
import { useEthersProvider } from "@/hooks/useEthersSigner"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { useAdoptionData } from "@/hooks/wrapper/useAdoptionData"
import { formatDate } from "@/lib/mla"
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
import {
  getConfiguredAprLabelKey,
  getMarketAprDisplayBips,
} from "@/utils/marketApr"
import {
  getMarketImplementationConfig,
  getMarketImplementationType,
} from "@/utils/marketImplementation"

import { MarketParametersProps } from "./interface"
import {
  MarketParametersContainer,
  MarketParametersContainerColumn,
} from "./style"
import { ParametersItem } from "../ParametersItem"
import { TooltipButton } from "../TooltipButton"

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
}) => (
  <Box
    sx={{
      display: "flex",
      flexDirection: "column",
      gap: "6px",
      width: "100%",
    }}
  >
    <AdoptionStatsRow
      label="Original Token"
      amount={marketAmount}
      asset={marketAsset}
      pct={marketPct}
    />
    <AdoptionStatsRow
      label="Wrapped Token"
      amount={sharesAmount}
      asset={sharesAsset}
      pct={sharesPct}
    />
  </Box>
)

export const MarketParameters = ({
  market,
  viewerType,
  wrapper,
  hasWrapper,
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
          t("borrowerMarketDetails.label.remainingTime"),
          humanizeDuration((timeDelinquent - delinquencyGracePeriod) * 1000, {
            round: true,
            largest: 1,
          }),
        ]
      : [
          t("borrowerMarketDetails.label.availableGracePeriod"),
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

  const nowSec = Date.now() / 1000
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

  const tempRatioI18nPrefix = viewerType === "borrower" ? "borrower" : "lender"

  const tempRatioValueComponent = (() => {
    if (hasTempReserveRatio) {
      return (
        <TooltipButton
          value={t(
            `borrowerMarketDetails.parameters.tempReserveRatio.${tempRatioI18nPrefix}ActiveTooltip`,
            {
              expiry: tempReserveRatioExpiry,
              originalRatio: originalRatioFormatted,
              currentRatio: currentRatioFormatted,
            },
          )}
          color={COLORS.galliano}
        />
      )
    }
    if (tempRatioExpired) {
      return (
        <TooltipButton
          value={t(
            `borrowerMarketDetails.parameters.tempReserveRatio.${tempRatioI18nPrefix}ExpiredTooltip`,
            {
              currentRatio: currentRatioFormatted,
              originalRatio: originalRatioFormatted,
            },
          )}
          color={COLORS.santasGrey}
        />
      )
    }
    return undefined
  })()

  const { hooksConfig } = market
  const aprDisplay = getMarketAprDisplayBips(market)
  const { isRevolving } = aprDisplay
  const implementationType = getMarketImplementationType(market)
  const implementationConfig = getMarketImplementationConfig(implementationType)
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

  const configuredAprLabel = t(getConfiguredAprLabelKey(market))

  const configuredAprTooltip = isRevolving
    ? "The annual percentage rate charged on drawn capital in a revolving market. Undrawn deposited capital accrues the separate commitment APR instead."
    : "The fixed annual percentage rate (excluding any protocol fees) that borrowers pay to lenders for assets within the market."

  const protocolAprTooltip = isRevolving
    ? "An additional APR that accrues to the protocol as a percentage of the market's current blended lender APR: commitment APR plus the utilization-weighted utilization APR."
    : "An additional APR that accrues to the protocol by slowly increasing required reserves. Derived by the fee configuration of the protocol as a percentage of the current base APR."

  const effectiveLenderAprTooltip = isRevolving
    ? "The current APR being paid to lenders across deposited capital: commitment APR on undrawn capital, plus utilization APR on drawn capital, plus penalty APR if applicable."
    : "The current interest rate being paid to lenders: the base APR plus penalty APR if applicable."

  const revolvingUtilizationTooltip =
    aprDisplay.utilizationBips !== undefined
      ? `Current utilization: ${formatBps(
          aprDisplay.utilizationBips,
          MARKET_PARAMS_DECIMALS.reserveRatioBips,
        )}% of deposited capital is drawn.`
      : undefined

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
        {t("borrowerMarketDetails.header.parameters")}
      </Typography>
      <Box sx={MarketParametersContainer(theme)}>
        <Box sx={MarketParametersContainerColumn(theme)}>
          <ParametersItem
            title={t("borrowerMarketDetails.parameters.marketAddress")}
            value={trimAddress(market.address)}
            copy={market.address}
            link={getAddressUrl(market.address)}
          />
          <Divider sx={{ margin: "12px 0 12px" }} />
          <ParametersItem
            title={t("borrowerMarketDetails.parameters.underlyingAsset")}
            value={`${market.underlyingToken.name} (${trimAddress(
              market.underlyingToken.address,
            )})`}
            tooltipText="The ERC-20 token used for all transactions in the market, such as Wrapped Ether (WETH) or USDC."
            copy={market.underlyingToken.address}
            link={getTokenUrl(market.underlyingToken.address)}
          />
          <Divider sx={{ margin: "12px 0 12px" }} />
          <ParametersItem
            title={t("borrowerMarketDetails.parameters.marketTokenName")}
            value={market.marketToken.name}
            copy={getTokenUrl(market.marketToken.address)}
            link={getTokenUrl(market.marketToken.address)}
          />
          <Divider sx={{ margin: "12px 0 12px" }} />
          <ParametersItem
            title={t("borrowerMarketDetails.parameters.marketTokenPrefix")}
            value={market.marketToken.symbol}
          />
          <Divider sx={{ margin: "12px 0 12px" }} />

          <ParametersItem
            title="Wrapper"
            value=""
            valueComponent={<WrapperChip hasWrapper={hasWrapper} />}
          />
          <Divider sx={{ margin: "12px 0 12px" }} />

          {hasWrapper && wrapper && (
            <>
              <ParametersItem
                title="Wrapper Address"
                value={trimAddress(wrapper.address.toLowerCase())}
                copy={wrapper.address}
                link={getAddressUrl(wrapper.address.toLowerCase())}
              />
              <Divider sx={{ margin: "12px 0 12px" }} />
            </>
          )}

          {hasWrapper && wrapper && (
            <>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  width: "100%",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <Typography variant="text3" sx={{ color: COLORS.santasGrey }}>
                    Adoption Status
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
              <Divider sx={{ margin: "12px 0 12px" }} />
            </>
          )}

          <ParametersItem
            title={t("borrowerMarketDetails.parameters.maxBorrowingCapacity")}
            value={`${formatTokenWithCommas(market.maxTotalSupply, {
              fractionDigits: market.maxTotalSupply.token.decimals,
            })} ${market.underlyingToken.symbol}`}
            tooltipText="The maximum limit of funds that borrowers can access in the market."
          />
          <Divider sx={{ margin: "12px 0 12px" }} />
          <ParametersItem
            title={t("borrowerMarketDetails.parameters.totalInterestAccrued")}
            value={toTokenAmountProps(totalInterestAccrued).value}
          />
          {isMobileOpen && (
            <>
              <Divider sx={{ margin: "12px 0 12px" }} />
              <ParametersItem
                title={t(
                  "borrowerMarketDetails.parameters.marketImplementation.label",
                )}
                value={implementationConfig.label}
              />
              <Divider sx={{ margin: "12px 0 12px" }} />
              {market.version === MarketVersion.V2 && market.hooksKind && (
                <>
                  <ParametersItem
                    title={t(
                      "borrowerMarketDetails.parameters.marketTerm.label",
                    )}
                    value={t(
                      `borrowerMarketDetails.parameters.marketTerm.${market.hooksKind}.text`,
                    )}
                    valueTooltipText={t(
                      `borrowerMarketDetails.parameters.marketTerm.${market.hooksKind}.tooltip`,
                    )}
                  />
                  <Divider sx={{ margin: "12px 0 12px" }} />
                </>
              )}
              <ParametersItem
                title={t(
                  "borrowerMarketDetails.parameters.minimumDeposit.label",
                )}
                // value={t(
                // `borrowerMarketDetails.parameters.minimumDeposit.${market.hooksConfig?.minimumDeposit ? "none" : "none"}`,
                // )}
                {...(market.hooksConfig?.minimumDeposit?.gt(0)
                  ? toTokenAmountProps(market.hooksConfig.minimumDeposit)
                  : {
                      value: t(
                        "borrowerMarketDetails.parameters.minimumDeposit.none",
                      ),
                    })}
              />
              {market.hooksConfig?.kind === HooksKind.FixedTerm && (
                <>
                  <Divider sx={{ margin: "12px 0 12px" }} />
                  <ParametersItem
                    title={t("borrowerMarketDetails.parameters.marketExpiry")}
                    value={`${formatDate(
                      market.hooksConfig.fixedTermEndTime,
                    )} 00:00 UTC`}
                  />
                </>
              )}
              <Divider sx={{ margin: "12px 0 12px" }} />
              <ParametersItem
                title={t(
                  "borrowerMarketDetails.parameters.depositAccess.label",
                )}
                value={t(
                  `borrowerMarketDetails.parameters.depositAccess.${depositAccess}.text`,
                )}
                valueTooltipText={t(
                  `borrowerMarketDetails.parameters.depositAccess.${depositAccess}.tooltip`,
                )}
              />
              <Divider sx={{ margin: "12px 0 12px" }} />
              <ParametersItem
                title={t(
                  "borrowerMarketDetails.parameters.withdrawalAccess.label",
                )}
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
                    title={t("borrowerMarketDetails.hooks.hooksAddress")}
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
                    {t(
                      "borrowerMarketDetails.parameters.tempReserveRatio.bannerHeading",
                    )}
                  </strong>{" "}
                  {t(
                    `borrowerMarketDetails.parameters.tempReserveRatio.${tempRatioI18nPrefix}BannerBody`,
                    {
                      originalRatio: originalRatioFormatted,
                      currentRatio: currentRatioFormatted,
                      expiry: tempReserveRatioExpiry,
                    },
                  )}{" "}
                  <Link
                    href={EXTERNAL_LINKS.DOCS_REDUCING_APR}
                    target="_blank"
                    style={{ color: COLORS.butteredRum, fontWeight: 600 }}
                  >
                    {t("borrowerMarketDetails.modals.apr.learnMore")}
                  </Link>
                </Typography>
              </Box>
            )}
            <ParametersItem
              title={
                hasTempReserveRatio
                  ? t("borrowerMarketDetails.parameters.tempReserveRatio.title")
                  : t("borrowerMarketDetails.parameters.minimumReserveRatio")
              }
              value={`${
                hasTempReserveRatio || tempRatioExpired
                  ? originalRatioFormatted
                  : currentRatioFormatted
              }%`}
              tooltipText="A required percentage of market funds that must remain liquid and unavailable for borrowing."
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
                    {t(
                      "borrowerMarketDetails.parameters.tempReserveRatio.badgeLabel",
                      {
                        currentRatio: currentRatioFormatted,
                        expiry: tempReserveRatioExpiry,
                      },
                    )}
                  </Typography>
                </Box>
              </Box>
            )}
            <Divider sx={{ margin: "12px 0 12px" }} />
            <ParametersItem
              title={configuredAprLabel}
              value={configuredAprDisplayValue}
              tooltipText={configuredAprTooltip}
              valueTooltipText={
                isRevolving ? revolvingUtilizationTooltip : undefined
              }
            />
            <Divider sx={{ margin: "12px 0 12px" }} />
            {isRevolving && (
              <>
                <ParametersItem
                  title={t("borrowerMarketDetails.parameters.commitmentAPR")}
                  value={
                    aprDisplay.commitmentAprBips !== undefined
                      ? `${formatBps(
                          aprDisplay.commitmentAprBips,
                          MARKET_PARAMS_DECIMALS.annualInterestBips,
                        )}%`
                      : "..."
                  }
                  tooltipText="The annual percentage rate charged on undrawn deposited capital in a revolving market."
                />
                <Divider sx={{ margin: "12px 0 12px" }} />
              </>
            )}
            {adsMarketParameter && (
              <>
                {adsMarketParameter}
                <Divider sx={{ margin: "12px 0 12px" }} />
              </>
            )}
            <ParametersItem
              title={t("borrowerMarketDetails.parameters.protocolAPR")}
              value={protocolAprDisplayValue}
              tooltipText={protocolAprTooltip}
            />
            <Divider sx={{ margin: "12px 0 12px" }} />
            <ParametersItem
              title={t("borrowerMarketDetails.parameters.effectiveAPR")}
              value={effectiveLenderAprDisplayValue}
              tooltipText={effectiveLenderAprTooltip}
            />
            <Divider sx={{ margin: "12px 0 12px" }} />
            <ParametersItem
              title={t("borrowerMarketDetails.parameters.penaltyAPR")}
              value={`${formatBps(
                market.delinquencyFeeBips,
                MARKET_PARAMS_DECIMALS.delinquencyFeeBips,
              )}%`}
              tooltipText="An additional interest rate charged if the market remains delinquent—failing to maintain required reserves—after the grace period has elapsed."
              alarmState={market.isIncurringPenalties}
              valueTooltipText={penaltyAprTooltipValue}
            />
            <Divider sx={{ margin: "12px 0 12px" }} />
            <ParametersItem
              title={t("borrowerMarketDetails.parameters.maximumGracePeriod")}
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
              title={t(
                "borrowerMarketDetails.parameters.withdrawalCycleDuration",
              )}
              value={`${formatSecsToHours(market.withdrawalBatchDuration)}`}
              tooltipText="A fixed period during which withdrawal requests are grouped and processed."
            />
            <Divider sx={{ margin: "12px 0 12px" }} />
            <ParametersItem
              title={t("borrowerMarketDetails.parameters.transferAccess.label")}
              value={t(
                `borrowerMarketDetails.parameters.transferAccess.${transferAccess}.text`,
              )}
              valueTooltipText={t(
                `borrowerMarketDetails.parameters.transferAccess.${transferAccess}.tooltip`,
              )}
            />
            <Divider sx={{ margin: "12px 0 12px" }} />
            <ParametersItem
              title={t(
                "borrowerMarketDetails.parameters.marketEarlyClosure.label",
              )}
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
                "borrowerMarketDetails.parameters.marketMaturityReduction.label",
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
            {t("borrowerMarketDetails.hooks.title")}
          </Typography>
          <Box sx={MarketParametersContainer(theme)}>
            <Box sx={MarketParametersContainerColumn(theme)}>
              <ParametersItem
                title={t("borrowerMarketDetails.hooks.hooksAddress")}
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
