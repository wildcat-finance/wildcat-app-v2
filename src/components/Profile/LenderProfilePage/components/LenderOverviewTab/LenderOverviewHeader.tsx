"use client"

import * as React from "react"

import { Box, SvgIcon, Tooltip, Typography } from "@mui/material"
import Image from "next/image"

import { LenderAnalyticsSummary } from "@/app/[locale]/lender/market/[address]/components/LenderAnalyticsSummary"
import {
  LenderActivityData,
  LenderPositionsData,
} from "@/app/[locale]/lender/profile/hooks/types"
import { useGetBorrowerProfile } from "@/app/[locale]/lender/profile/hooks/useGetBorrowerProfile"
import Avatar from "@/assets/icons/avatar_icon.svg"
import {
  formatDate,
  formatPercent,
  formatUsd,
} from "@/components/Profile/shared/analytics"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { COLORS } from "@/theme/colors"
import { pxToRem } from "@/theme/units"
import { trimAddress } from "@/utils/formatters"

type LenderOverviewHeaderProps = {
  lenderAddress: `0x${string}` | undefined
  data?: LenderPositionsData
  activity?: LenderActivityData
  isLoading: boolean
}

const latestOf = (
  activity: LenderActivityData | undefined,
  types: Array<LenderActivityData["activity"][number]["type"]>,
) => {
  if (!activity) return undefined
  const match = activity.activity.find((entry) => types.includes(entry.type))
  return match?.timestamp
}

const formatEffectiveYield = (value: number | undefined) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return "0.00%"
  }

  return value < 0.01 ? "<0.01%" : formatPercent(value)
}

export const LenderOverviewHeader = ({
  lenderAddress,
  data,
  activity,
  isLoading,
}: LenderOverviewHeaderProps) => {
  const { chainId } = useSelectedNetwork()
  const { data: profile } = useGetBorrowerProfile(chainId, lenderAddress)

  const profileInfo = data?.profile
  const assetsUsed = profileInfo?.assetsUsed ?? []
  const displayName = profile?.alias ?? profile?.name

  const lastDepositTs = latestOf(activity, ["Deposit"])
  const lastWithdrawalTs = latestOf(activity, [
    "Withdrawal Execution",
    "Withdrawal Request",
  ])

  const summaryItems = [
    {
      label: "Total balance",
      value: formatUsd(profileInfo?.totalBalance ?? 0, { compact: true }),
      description: "current value across all markets",
      fullPrecisionValue: formatUsd(profileInfo?.totalBalance ?? 0, {
        maximumFractionDigits: 2,
      }),
    },
    {
      label: "Total deposited",
      value: formatUsd(profileInfo?.totalDeposited ?? 0, { compact: true }),
      description: "all-time deposits",
      fullPrecisionValue: formatUsd(profileInfo?.totalDeposited ?? 0, {
        maximumFractionDigits: 2,
      }),
    },
    {
      label: "Total interest earned",
      value: formatUsd(profileInfo?.totalInterestEarned ?? 0, {
        compact: true,
      }),
      description: "cumulative interest",
      fullPrecisionValue: formatUsd(profileInfo?.totalInterestEarned ?? 0, {
        maximumFractionDigits: 2,
      }),
    },
    {
      label: "Effective yield",
      value: formatEffectiveYield(profileInfo?.effectiveYield),
      description: "interest / total deposited",
      fullPrecisionValue:
        typeof profileInfo?.effectiveYield === "number" &&
        profileInfo.effectiveYield > 0
          ? `${profileInfo.effectiveYield.toFixed(6)}%`
          : undefined,
    },
    {
      label: "Active positions",
      value: String(profileInfo?.activePositions ?? 0),
      description: `open positions with balance, of ${
        profileInfo?.totalPositions ?? 0
      } total`,
    },
    {
      label: "Assets used",
      value: String(assetsUsed.length),
      description: assetsUsed.length > 0 ? assetsUsed.join(", ") : "—",
    },
  ]

  const metaRows: Array<[string, string]> = [
    ["Total positions", String(profileInfo?.totalPositions ?? 0)],
    ["Time on protocol", profileInfo?.timeOnProtocol ?? "—"],
    ["First deposit", profileInfo?.firstDeposit ?? "—"],
    ["Most recent deposit", lastDepositTs ? formatDate(lastDepositTs) : "—"],
    [
      "Most recent withdrawal",
      lastWithdrawalTs ? formatDate(lastWithdrawalTs) : "—",
    ],
  ]

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      <Box>
        <Typography variant="title2">Lender Profile</Typography>
        <Typography
          variant="text2"
          color={COLORS.santasGrey}
          sx={{ marginTop: "4px", display: "block" }}
        >
          Portfolio overview and position details for this lender
        </Typography>
      </Box>

      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", lg: "row" },
          gap: "16px",
          alignItems: "stretch",
        }}
      >
        <Box
          sx={{
            flex: { xs: "none", lg: "0 0 360px" },
            minWidth: 0,
            border: `1px solid ${COLORS.athensGrey}`,
            borderRadius: "16px",
            backgroundColor: COLORS.white,
            padding: "20px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {profile?.avatar ? (
              <Image
                src={profile.avatar}
                alt="avatar"
                width={44}
                height={44}
                style={{ borderRadius: "10px" }}
              />
            ) : (
              <SvgIcon sx={{ fontSize: pxToRem(44) }}>
                <Avatar />
              </SvgIcon>
            )}
            <Box sx={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
              <Tooltip title={lenderAddress ?? ""} placement="top" arrow>
                <Typography variant="title3" noWrap>
                  {displayName ?? trimAddress(lenderAddress ?? "")}
                </Typography>
              </Tooltip>
              <Typography variant="text4" color={COLORS.santasGrey}>
                Lender
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              marginTop: "20px",
            }}
          >
            {metaRows.map(([label, value]) => (
              <Box
                key={label}
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "12px",
                }}
              >
                <Typography variant="text2" color={COLORS.santasGrey}>
                  {label}
                </Typography>
                <Typography variant="text2Highlighted">{value}</Typography>
              </Box>
            ))}
          </Box>
        </Box>

        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            "& > .MuiBox-root": {
              height: "100%",
              gridAutoRows: "1fr",
            },
          }}
        >
          <LenderAnalyticsSummary items={summaryItems} isLoading={isLoading} />
        </Box>
      </Box>
    </Box>
  )
}
