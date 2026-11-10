import * as React from "react"

import {
  Box,
  Button,
  Skeleton,
  SvgIcon,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material"
import { HooksKind } from "@wildcatfi/wildcat-sdk"
import humanizeDuration from "humanize-duration"
import Link from "next/link"
import { useTranslation } from "react-i18next"

import { useGetBorrowerProfile } from "@/app/[locale]/lender/profile/hooks/useGetBorrowerProfile"
import Avatar from "@/assets/icons/avatar_icon.svg"
import { MarketStatusChip } from "@/components/@extended/MarketStatusChip"
import {
  BorrowerProfileChip,
  DefaultedBorrowerBadge,
} from "@/components/BorrowerProfileChip"
import { MarketCycleChip } from "@/components/MarketCycleChip"
import { MobileMoreButton } from "@/components/Mobile/MobileMoreButton"
import { useDefaultedMarkets } from "@/hooks/useDefaultedMarkets"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"
import { lh, pxToRem } from "@/theme/units"
import { trimAddress } from "@/utils/formatters"
import { getMarketStatusChip, MarketStatus } from "@/utils/marketStatus"
import { getMarketTypeChip } from "@/utils/marketType"

import { MarketHeaderProps } from "./interface"
import {
  MarketHeaderDetailsRow,
  MarketHeaderInfoContainer,
  MarketHeaderStatusContainer,
  MarketHeaderStatusRow,
  MarketHeaderTitleRow,
  MarketHeaderUpperContainer,
} from "./style"

export const MarketHeader = ({
  market,
  mla,
  hasMarketDescription,
  isLiveMarketReady = true,
  variant = "lender",
}: MarketHeaderProps) => {
  const { t } = useTranslation()
  const theme = useTheme()
  const isMobile = useMobileResolution()

  const [remainingTime, setRemainingTime] = React.useState<string>("")

  React.useEffect(() => {
    const cycleEnd = market.pendingWithdrawalExpiry

    if (!isLiveMarketReady || !cycleEnd) {
      setRemainingTime("")
      return undefined
    }

    const updateRemainingTime = () => {
      const now = Math.floor(Date.now() / 1000)
      const timeLeft = cycleEnd - now
      if (timeLeft > 0) {
        setRemainingTime(
          humanizeDuration(timeLeft * 1000, {
            round: true,
            largest: 1,
            units: ["h", "m", "s"],
          }),
        )
      } else {
        setRemainingTime("")
      }
    }

    updateRemainingTime()

    const intervalId = setInterval(updateRemainingTime, 1000)

    return () => clearInterval(intervalId)
  }, [market.pendingWithdrawalExpiry, isLiveMarketReady])

  // The header only displays status, so it reads the last snapshot rather
  // than dropping to a skeleton each time the status refreshes.
  const { isDefaultedForDisplay, defaultedMarketsOfBorrower } =
    useDefaultedMarkets(market.chainId)
  const borrowerDefaultsCount = defaultedMarketsOfBorrower(
    market.borrower,
  ).length

  const defaultStatus = isDefaultedForDisplay(market.address)
  const marketStatus =
    isLiveMarketReady && defaultStatus !== undefined
      ? getMarketStatusChip(market, defaultStatus)
      : undefined
  const isStatusDefaulted = marketStatus?.status === MarketStatus.DEFAULTED
  const shouldShowCycleChip =
    !!marketStatus && Boolean(remainingTime) && !market.isClosed

  const isBorrowerView = variant === "borrower"
  const penaltyDays = Math.floor(marketStatus?.penaltyPeriod ?? 0)
  const isOpenTerm = getMarketTypeChip(market).kind !== HooksKind.FixedTerm
  const baseApr = (market.annualInterestBips / 100).toFixed(2)

  const statusChips = marketStatus ? (
    <>
      <MarketStatusChip
        status={marketStatus}
        variant="filled"
        periodLayout="inline"
      />
      {shouldShowCycleChip && (
        <MarketCycleChip status={marketStatus.status} time={remainingTime} />
      )}
    </>
  ) : (
    <Skeleton
      variant="rounded"
      width={190}
      height={16}
      aria-label="Loading market status"
    />
  )

  const { data: profileData } = useGetBorrowerProfile(
    market.chainId,
    market.borrower as `0x${string}`,
  )

  const getBorrowerName = () => {
    if (profileData) {
      return profileData.alias ?? profileData.name
    }

    return trimAddress(market.borrower)
  }

  if (isMobile)
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          backgroundColor: COLORS.white,
          borderRadius: "14px",
          padding: "12px 16px",
        }}
      >
        <Box sx={MarketHeaderStatusContainer(theme)}>{statusChips}</Box>

        <Box
          sx={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            alignItems: "flex-start",
            marginBottom: "20px",
          }}
        >
          <Box
            sx={{
              width: "100%",
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "8px",
            }}
          >
            <Typography
              variant="mobH3"
              sx={{
                flex: 1,
                minWidth: 0,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                wordBreak: "break-word",
              }}
            >
              {market.name}
            </Typography>

            <MobileMoreButton market={market} />
          </Box>

          <Box
            sx={{
              display: "flex",
              gap: "8px",
              alignItems: "center",
              marginTop: "2px",
            }}
          >
            <Link
              href={`${ROUTES.lender.profile}/${market.borrower}`}
              style={{ display: "flex", textDecoration: "none" }}
            >
              <Box
                sx={{
                  display: "flex",
                  gap: "6px",
                  alignItems: "center",
                  padding: "2px 10px 2px 4px",
                  borderRadius: "12px",
                  bgcolor: COLORS.whiteSmoke,
                }}
              >
                {profileData ? (
                  <Box
                    sx={{
                      width: "16px",
                      height: "16px",
                      borderRadius: "50%",
                      bgcolor: "#4CA6D9",

                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Typography
                      variant="mobText4"
                      sx={{
                        fontSize: "8px",
                        lineHeight: "8px",
                        color: COLORS.white,
                      }}
                    >
                      {String(getBorrowerName())[0]}
                    </Typography>
                  </Box>
                ) : (
                  <SvgIcon
                    sx={{
                      fontSize: "16px",
                      "& circle": { fill: "#4CA6D9", opacity: 1 },
                      "& path": { fill: COLORS.white },
                    }}
                  >
                    <Avatar />
                  </SvgIcon>
                )}

                <Typography variant="mobText3">{getBorrowerName()}</Typography>

                {borrowerDefaultsCount > 0 && (
                  <>
                    <Typography variant="caption" color={COLORS.greySuit}>
                      |
                    </Typography>
                    <DefaultedBorrowerBadge count={borrowerDefaultsCount} />
                  </>
                )}
              </Box>
            </Link>
          </Box>
        </Box>

        <Box
          sx={{
            display: "flex",
            width: "100%",
            overflowX: "auto",
            whiteSpace: "nowrap",
            gap: "4px",
          }}
        >
          <Button
            variant="text"
            size="small"
            sx={{
              minWidth: "fit-content",
              padding: "6px 8px",
              flexShrink: 0,
              fontSize: 10,
              fontWeight: 600,
              lineHeight: "16px",
              backgroundColor: COLORS.hintOfRed,
            }}
            component="a"
            href="#status"
          >
            Status
          </Button>
          {hasMarketDescription && (
            <Button
              variant="text"
              size="small"
              sx={{
                minWidth: "fit-content",
                padding: "6px 8px",
                flexShrink: 0,
                fontSize: 10,
                fontWeight: 600,
                lineHeight: "16px",
                backgroundColor: COLORS.hintOfRed,
              }}
              component="a"
              href="#marketDescription"
            >
              Market Description
            </Button>
          )}
          <Button
            variant="text"
            size="small"
            sx={{
              minWidth: "fit-content",
              padding: "6px 8px",
              flexShrink: 0,
              fontSize: 10,
              fontWeight: 600,
              lineHeight: "16px",
              backgroundColor: COLORS.hintOfRed,
            }}
            component="a"
            href="#requests"
          >
            Withdrawal Requests
          </Button>
          {mla && !("noMLA" in mla) && (
            <Button
              variant="text"
              size="small"
              sx={{
                minWidth: "fit-content",
                padding: "6px 8px",
                flexShrink: 0,
                fontSize: 10,
                fontWeight: 600,
                lineHeight: "16px",
                backgroundColor: COLORS.hintOfRed,
              }}
              component="a"
              href="#mla"
            >
              MLA
            </Button>
          )}
        </Box>
      </Box>
    )

  const titleText = (
    <Typography
      variant="title2"
      sx={{
        whiteSpace: "nowrap",
        textOverflow: "ellipsis",
        overflow: "hidden",
      }}
    >
      {market.name}
    </Typography>
  )

  return (
    <Box sx={MarketHeaderUpperContainer}>
      <Box sx={MarketHeaderInfoContainer}>
        <Box sx={MarketHeaderTitleRow}>
          {market.name.length > 32 ? (
            <Tooltip title={market.name} placement="right">
              {titleText}
            </Tooltip>
          ) : (
            titleText
          )}

          <Box sx={MarketHeaderStatusRow}>
            {marketStatus ? (
              <>
                <MarketStatusChip
                  status={marketStatus}
                  variant="filled"
                  withPeriod={!isStatusDefaulted}
                />
                {isStatusDefaulted && penaltyDays >= 1 && (
                  <Typography
                    variant={isBorrowerView ? "text4" : undefined}
                    sx={{
                      color: COLORS.blackRock08,
                      whiteSpace: "nowrap",
                      ...(!isBorrowerView && {
                        fontSize: pxToRem(9),
                        lineHeight: lh(12, 9),
                        fontWeight: 500,
                      }),
                    }}
                  >
                    {t("defaultedMarkets.chip.penaltyDays", {
                      days: penaltyDays,
                    })}
                  </Typography>
                )}
                {shouldShowCycleChip && (
                  <MarketCycleChip
                    status={marketStatus.status}
                    time={remainingTime}
                  />
                )}
              </>
            ) : (
              <Skeleton
                variant="rounded"
                width={190}
                height={16}
                aria-label="Loading market status"
              />
            )}
          </Box>
        </Box>

        <Box sx={MarketHeaderDetailsRow}>
          {!isBorrowerView && (
            <BorrowerProfileChip
              borrower={getBorrowerName()}
              size="header"
              href={`${ROUTES.lender.profile}/${market.borrower}`}
              defaultedMarketsCount={borrowerDefaultsCount}
            />
          )}

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "2px",
              padding: isBorrowerView ? "2px 0" : "2px 8px",
            }}
          >
            <Typography variant="text2">
              {market.underlyingToken.symbol}
            </Typography>
            <Typography variant="text3">・</Typography>
            <Typography variant="text2">
              {isOpenTerm
                ? t("marketHeader.openTerm")
                : t("marketHeader.fixedTerm")}
            </Typography>
            <Typography variant="text3">・</Typography>
            <Typography variant="text2">{t("marketHeader.baseApr")}</Typography>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                padding: "1px 6px",
                borderRadius: "12px",
                bgcolor: COLORS.athensGrey,
              }}
            >
              <Typography variant="text2">{baseApr}%</Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
