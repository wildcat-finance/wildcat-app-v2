import * as React from "react"

import { Box, Button, Divider, Typography } from "@mui/material"
import Link from "next/link"

import { LenderInterestBreakdownEntry } from "@/app/[locale]/lender/profile/hooks/types"
import { MarketStatusChip } from "@/components/@extended/MarketStatusChip"
import { MarketTypeChip } from "@/components/@extended/MarketTypeChip"
import { BorrowerProfileChip } from "@/components/BorrowerProfileChip"
import { formatPercent, formatUsd } from "@/components/Profile/shared/analytics"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"
import { buildBorrowerProfileHref, buildMarketHref } from "@/utils/formatters"

import { MarketCardData } from "./interface"

// Interest breakdown colors (kept in sync with the Capital tab's breakdown).
const IN_HAND_COLOR = "#6687FF" // Blue 700 — no design token
const NEUTRAL_BAR_COLOR = COLORS.iron // in protocol / base APR
const PENALTY_BAR_COLOR = COLORS.wildWatermelon
const BAR_TRACK_COLOR = COLORS.blackHaze

type StatItem = { label: string; value: string }

// One stat column (label + value) in the card's metrics row.
const Stat = ({ label, value }: StatItem) => (
  <Box
    sx={{
      flex: 1,
      minWidth: 0,
      display: "flex",
      flexDirection: "column",
      gap: "6px",
    }}
  >
    <Typography variant="text3" noWrap sx={{ opacity: 0.8 }}>
      {label}
    </Typography>
    <Typography variant="text1" noWrap>
      {value}
    </Typography>
  </Box>
)

// Thin vertical divider between stat columns.
const StatDivider = () => (
  <Divider
    orientation="vertical"
    flexItem
    // The theme forces `height: 1px` on every Divider root; override it back to
    // auto so flexItem / align-self stretch can size the vertical divider.
    sx={{
      borderColor: COLORS.iron,
      marginX: "16px",
      height: "auto",
      alignSelf: "stretch",
    }}
  />
)

type InterestPanelItem = { label: string; value: number; color: string }

// One half of the breakdown: title/subtitle, a proportional 2-segment bar, and
// a 2-row legend (swatch + label + USD value).
const InterestPanel = ({
  title,
  subtitle,
  items,
}: {
  title: string
  subtitle: string
  items: [InterestPanelItem, InterestPanelItem]
}) => {
  const total = items[0].value + items[1].value
  const firstPct = total > 0 ? (items[0].value / total) * 100 : 0

  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box mb="17px">
        <Typography variant="text3" display="block">
          {title}
        </Typography>
        <Typography variant="text3" color={COLORS.matteSilver} display="block">
          {subtitle}
        </Typography>
      </Box>

      <Box
        sx={{
          display: "flex",
          height: "4px",
          borderRadius: "3px",
          overflow: "hidden",
          backgroundColor: BAR_TRACK_COLOR,
          mb: "12px",
        }}
      >
        <Box sx={{ width: `${firstPct}%`, backgroundColor: items[0].color }} />
        <Box
          sx={{ width: `${100 - firstPct}%`, backgroundColor: items[1].color }}
        />
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {items.map((item) => (
          <Box
            key={item.label}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "8px",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                minWidth: 0,
              }}
            >
              <Box
                sx={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "2px",
                  flexShrink: 0,
                  backgroundColor: item.color,
                }}
              />
              <Typography variant="text3" color={COLORS.blackRock} noWrap>
                {item.label}
              </Typography>
            </Box>
            <Typography variant="text3" color={COLORS.blackRock}>
              {formatUsd(item.value, { compact: true })}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  )
}

// "Interest status" + "Interest source" panels, split by a vertical divider.
const InterestBreakdown = ({
  entry,
}: {
  entry: LenderInterestBreakdownEntry
}) => (
  <Box sx={{ display: "flex", gap: "24px" }}>
    <InterestPanel
      title="Interest status"
      subtitle="In hand vs still in protocol"
      items={[
        { label: "In hand", value: entry.inHandUsd, color: IN_HAND_COLOR },
        {
          label: "In protocol",
          value: entry.inProtocolUsd,
          color: NEUTRAL_BAR_COLOR,
        },
      ]}
    />

    <Divider
      orientation="vertical"
      flexItem
      sx={{
        borderColor: COLORS.iron,
        height: "auto",
        alignSelf: "stretch",
      }}
    />

    <InterestPanel
      title="Interest source"
      subtitle="Base APR vs penalty APR"
      items={[
        { label: "Base APR", value: entry.baseUsd, color: NEUTRAL_BAR_COLOR },
        {
          label: "Penalty APR",
          value: entry.penaltyUsd,
          color: PENALTY_BAR_COLOR,
        },
      ]}
    />
  </Box>
)

export const MarketCard = ({
  data,
  chainId,
}: {
  data: MarketCardData
  chainId: number | undefined
}) => {
  const marketHref = buildMarketHref(
    data.marketId,
    undefined,
    ROUTES.lender.market,
  )
  // Only positions that actually earned interest get the breakdown section.
  const showBreakdown = !!data.breakdown && data.breakdown.totalInterestUsd > 0

  return (
    <Box
      sx={{
        border: `1px solid ${COLORS.iron}`,
        borderRadius: "12px",
        backgroundColor: "transparent",
        padding: "16px",
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "16px",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            minWidth: 0,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              minWidth: 0,
            }}
          >
            <Typography variant="text1">{data.name}</Typography>

            <MarketStatusChip status={data.status} withPeriod={false} />
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              minWidth: 0,
            }}
          >
            {data.borrower ? (
              <Box
                component={Link}
                href={buildBorrowerProfileHref(data.borrower, chainId)}
                prefetch={false}
                sx={{ display: "flex", textDecoration: "none" }}
              >
                <BorrowerProfileChip
                  borrower={data.borrowerName ?? data.borrower}
                />
              </Box>
            ) : (
              <BorrowerProfileChip
                borrower={data.borrowerName ?? data.borrower}
              />
            )}

            <Box sx={{ display: "flex", gap: "2px", alignItems: "center" }}>
              <Typography variant="text3" noWrap>
                {data.asset}
              </Typography>

              <Typography variant="text3"> ・ </Typography>

              <MarketTypeChip type="table" {...data.term} />
            </Box>
          </Box>
        </Box>

        <Button
          component={Link}
          href={marketHref}
          variant="contained"
          color="secondary"
          size="small"
          sx={{ flexShrink: 0 }}
        >
          View options
        </Button>
      </Box>

      <Box sx={{ display: "flex", marginTop: "28px" }}>
        <Stat
          label="Total balance"
          value={formatUsd(data.balance, { compact: true })}
        />

        <StatDivider />

        <Stat
          label="Deposited"
          value={formatUsd(data.deposited, { compact: true })}
        />

        <StatDivider />

        <Stat
          label="Interest earned"
          value={formatUsd(data.interest, { compact: true })}
        />

        <StatDivider />

        <Stat label="APR" value={formatPercent(data.apr)} />
      </Box>

      {showBreakdown && data.breakdown && (
        <>
          <Divider sx={{ marginY: "16px", borderColor: COLORS.iron }} />
          <InterestBreakdown entry={data.breakdown} />
        </>
      )}
    </Box>
  )
}
