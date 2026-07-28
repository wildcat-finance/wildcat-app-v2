"use client"

import { Box, SvgIcon, Tooltip, Typography } from "@mui/material"
import { HooksKind, TokenAmount } from "@wildcatfi/wildcat-sdk"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { MarketStatusAndTermChip } from "@/components/@extended/MarketStatusAndTermChip"
import {
  getAdsCellProps,
  getAdsTooltipComponent,
} from "@/components/AdsBanners/adsHelpers"
import { BorrowerProfileChip } from "@/components/BorrowerProfileChip"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"
import { buildMarketHref, formatBps } from "@/utils/formatters"
import { getMarketStatusChip, MarketStatus } from "@/utils/marketStatus"
import { getMarketTypeChip } from "@/utils/marketType"

export type ExploreMarketCardItem = {
  id: string
  status: ReturnType<typeof getMarketStatusChip>
  term: ReturnType<typeof getMarketTypeChip>
  name: string
  borrower: string | undefined
  borrowerAddress: string | undefined
  debt: TokenAmount | undefined
  capacity: TokenAmount
  asset: string
  apr: number
  withdrawalBatchDuration: number
  chainId: number
}

const compactFormat = (value: number) =>
  new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value)

const formatCompactToken = (amount: TokenAmount | undefined) =>
  amount ? compactFormat(parseFloat(amount.format(amount.decimals))) : "0"

const formatWithdrawalCycle = (seconds: number) => {
  const hours = Math.floor(seconds / 3600)
  return `${hours > 0 ? `${hours}h` : "<1h"} withdrawal`
}

const formatMaturity = (millisecondsFromNow: number) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(Date.now() + millisecondsFromNow)

export const ExploreMarketCard = ({
  marketItem,
  isLast = false,
}: {
  marketItem: ExploreMarketCardItem
  isLast?: boolean
}) => {
  const router = useRouter()

  const adsCellProps = getAdsCellProps(marketItem.chainId, marketItem.id)
  const adsComponent = adsCellProps
    ? getAdsTooltipComponent(
        marketItem.chainId,
        marketItem.id,
        formatBps(marketItem.apr),
      )
    : undefined

  const isOpenTerm = marketItem.term.kind === HooksKind.OpenTerm
  const termLabel = isOpenTerm ? "Open Term" : "Fixed Term"
  const termDetail = isOpenTerm
    ? formatWithdrawalCycle(marketItem.withdrawalBatchDuration)
    : `matures ${formatMaturity(marketItem.term.fixedPeriod ?? 0)}`
  const depositedRaw = marketItem.debt?.raw.toBigInt() ?? BigInt(0)
  const capacityRaw = marketItem.capacity.raw.toBigInt()
  const depositedPct =
    capacityRaw > BigInt(0)
      ? Math.min(
          100,
          Number((depositedRaw * BigInt(10000)) / capacityRaw) / 100,
        )
      : 0

  return (
    <Box
      onClick={() =>
        router.push(buildMarketHref(marketItem.id, marketItem.chainId))
      }
      sx={{
        width: "100%",
        backgroundColor: COLORS.white,
        padding: "16px 12px",
        borderBottom: isLast ? "none" : `1px solid ${COLORS.athensGrey}`,
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        cursor: "pointer",
      }}
    >
      <Box
        sx={{
          width: "100%",
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        <Typography
          sx={{
            minWidth: 0,
            overflow: "hidden",
            color: COLORS.black,
            fontSize: "20px",
            fontWeight: 600,
            lineHeight: "26px",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {marketItem.name}
        </Typography>

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: "4px",
            flexShrink: 0,
          }}
        >
          <Typography
            sx={{
              color: COLORS.black,
              fontSize: "22px",
              fontWeight: 600,
              lineHeight: "28px",
              whiteSpace: "nowrap",
            }}
          >
            {formatBps(marketItem.apr)}% APR
          </Typography>

          {adsCellProps && (
            <Tooltip
              placement="bottom-end"
              arrow={false}
              title={adsComponent}
              componentsProps={{
                tooltip: {
                  sx: {
                    p: 0,
                    bgcolor: "transparent",
                    boxShadow: "none",
                    borderRadius: 0,
                    maxWidth: "none",
                  },
                },
              }}
            >
              <Box
                onClick={(event) => event.stopPropagation()}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  "& .stacked-icon:not(:first-of-type)": { ml: "-4px" },
                }}
              >
                {adsCellProps.icons.map((icon, idx) => (
                  <SvgIcon
                    key={icon.key ?? idx}
                    className="stacked-icon"
                    sx={{ fontSize: "18px" }}
                  >
                    {icon}
                  </SvgIcon>
                ))}
              </Box>
            </Tooltip>
          )}
        </Box>
      </Box>

      {marketItem.borrowerAddress ? (
        <Link
          href={`${ROUTES.lender.profile}/${marketItem.borrowerAddress}`}
          onClick={(e) => e.stopPropagation()}
          style={{
            display: "flex",
            width: "fit-content",
            maxWidth: "100%",
            textDecoration: "none",
          }}
        >
          <BorrowerProfileChip
            borrower={marketItem.borrower ?? marketItem.borrowerAddress}
            size="large"
          />
        </Link>
      ) : (
        <BorrowerProfileChip
          borrower={marketItem.borrower ?? marketItem.borrowerAddress}
          size="large"
        />
      )}

      <Box sx={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <MarketStatusAndTermChip
          status={marketItem.status}
          termLabel={termLabel}
        />

        <Typography
          sx={{
            minWidth: 0,
            overflow: "hidden",
            color: COLORS.matteSilver,
            fontSize: "14px",
            lineHeight: "20px",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {termDetail}
        </Typography>

        <Box
          sx={{
            width: "10px",
            height: "10px",
            flexShrink: 0,
            marginLeft: "auto",
            borderTop: `2px solid ${COLORS.matteSilver}`,
            borderRight: `2px solid ${COLORS.matteSilver}`,
            transform: "rotate(45deg)",
          }}
        />
      </Box>

      <Box
        sx={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        <Typography
          sx={{
            color: COLORS.black,
            fontSize: "15px",
            fontWeight: 600,
            lineHeight: "20px",
            whiteSpace: "nowrap",
          }}
        >
          {formatCompactToken(marketItem.debt)} {marketItem.asset} deposited
        </Typography>

        <Typography
          sx={{
            overflow: "hidden",
            color: COLORS.matteSilver,
            fontSize: "14px",
            lineHeight: "20px",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          of {formatCompactToken(marketItem.capacity)} {marketItem.asset} cap
        </Typography>
      </Box>

      <Box
        sx={{
          width: "100%",
          height: "6px",
          overflow: "hidden",
          borderRadius: "3px",
          backgroundColor: COLORS.athensGrey,
        }}
      >
        <Box
          sx={{
            width: `${depositedPct}%`,
            height: "100%",
            borderRadius: "inherit",
            backgroundColor:
              marketItem.status.status === MarketStatus.HEALTHY
                ? COLORS.blueRibbon
                : COLORS.greySuit,
          }}
        />
      </Box>
    </Box>
  )
}
