"use client"

import * as React from "react"

import { Box, Typography } from "@mui/material"
import { HooksKind } from "@wildcatfi/wildcat-sdk"

import {
  getBorrowerDisplayName,
  useBorrowerNames,
} from "@/app/[locale]/borrower/hooks/useBorrowerNames"
import { getPositionMarketStatus } from "@/app/[locale]/lender/profile/components/LenderProfileOverviewTab/ProfileHealthTable/interface"
import {
  LenderProfileOverviewContainer,
  LenderProfileOverviewSection,
  ProfileOverviewTitleContainer,
} from "@/app/[locale]/lender/profile/components/LenderProfileOverviewTab/style"
import { LenderPositionsData } from "@/app/[locale]/lender/profile/hooks/types"
import { useLenderInterestBreakdown } from "@/app/[locale]/lender/profile/hooks/useLenderInterestBreakdown"
import { FilterTextField } from "@/components/FilterTextfield"
import { MarketsFilterSelect } from "@/components/MarketsFilterSelect"
import { MarketsFilterSelectItem } from "@/components/MarketsFilterSelect/interface"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { COLORS } from "@/theme/colors"
import { MarketStatus } from "@/utils/marketStatus"

import { MarketCard } from "./MarketCard"
import { MarketCardData } from "./MarketCard/interface"

type LenderProfileMarketsTabProps = {
  lenderAddress?: `0x${string}`
  lenderData?: LenderPositionsData
}

// Status filter mirrors the displayed badge labels (MarketStatus values).
const STATUS_OPTIONS: MarketsFilterSelectItem[] = [
  { id: MarketStatus.HEALTHY, name: MarketStatus.HEALTHY },
  { id: MarketStatus.DELINQUENT, name: MarketStatus.DELINQUENT },
  { id: MarketStatus.PENALTY, name: MarketStatus.PENALTY },
  { id: MarketStatus.TERMINATED, name: MarketStatus.TERMINATED },
]

export const LenderProfileMarketsTab = ({
  lenderAddress,
  lenderData,
}: LenderProfileMarketsTabProps) => {
  const isMobile = useMobileResolution()
  const { chainId } = useSelectedNetwork()
  const { data: borrowers } = useBorrowerNames()

  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<
    MarketsFilterSelectItem[]
  >([])
  const [assetFilter, setAssetFilter] = React.useState<
    MarketsFilterSelectItem[]
  >([])

  const { data: interestBreakdown } = useLenderInterestBreakdown({
    lenderAddress,
    marketIds: lenderData?.marketIds ?? [],
    priceMap: lenderData?.priceMap ?? {},
    decimalsMap: lenderData?.decimalsMap ?? {},
  })

  const byMarket = interestBreakdown?.byMarket ?? {}

  const cards = React.useMemo<MarketCardData[]>(
    () =>
      (lenderData?.positions ?? []).map((position) => {
        const { termEndTime } = position
        const breakdown = byMarket[position.marketId]

        return {
          id: position.marketId,
          marketId: position.marketId,
          name: position.marketName,
          borrower: position.borrower,
          borrowerName: getBorrowerDisplayName(
            position.borrower,
            borrowers ?? [],
            "name",
          ),
          status: getPositionMarketStatus(position.status),
          term:
            termEndTime > 0
              ? {
                  kind: HooksKind.FixedTerm,
                  fixedPeriod: termEndTime * 1000 - Date.now(),
                }
              : { kind: HooksKind.OpenTerm },
          asset: position.asset,
          balance: position.currentBalance,
          deposited: position.totalDeposited,
          interest: breakdown?.totalInterestUsd ?? position.interestEarned,
          apr: position.apr,
          breakdown,
        }
      }),
    [lenderData?.positions, borrowers, byMarket],
  )

  const assetOptions = React.useMemo<MarketsFilterSelectItem[]>(() => {
    const assets = new Set<string>()
    ;(lenderData?.positions ?? []).forEach((position) => {
      if (position.asset) assets.add(position.asset)
    })
    return Array.from(assets)
      .sort()
      .map((asset) => ({ id: asset, name: asset }))
  }, [lenderData?.positions])

  const filteredCards = React.useMemo(() => {
    const statusIds = statusFilter.map((item) => item.id)
    const assetIds = assetFilter.map((item) => item.id)
    const query = search.trim().toLowerCase()

    return cards.filter((card) => {
      const matchesStatus =
        statusIds.length === 0 || statusIds.includes(card.status.status)
      const matchesAsset =
        assetIds.length === 0 || assetIds.includes(card.asset)
      // Search by market name/address or borrower name/address.
      const matchesSearch =
        query === "" ||
        [card.name, card.marketId, card.borrowerName ?? "", card.borrower]
          .join(" ")
          .toLowerCase()
          .includes(query)
      return matchesStatus && matchesAsset && matchesSearch
    })
  }, [cards, statusFilter, assetFilter, search])

  return (
    <Box sx={LenderProfileOverviewContainer}>
      <Box sx={LenderProfileOverviewSection}>
        <Box sx={ProfileOverviewTitleContainer}>
          <Typography variant={isMobile ? "mobH3" : "title3"}>
            Markets
          </Typography>
        </Box>

        <Box
          sx={{
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
            marginBottom: "16px",
          }}
        >
          <Box sx={{ display: "flex", gap: "6px" }}>
            <MarketsFilterSelect
              placeholder="Asset"
              options={assetOptions}
              selected={assetFilter}
              setSelected={setAssetFilter}
            />

            <MarketsFilterSelect
              placeholder="Status"
              options={STATUS_OPTIONS}
              selected={statusFilter}
              setSelected={setStatusFilter}
            />
          </Box>

          <FilterTextField
            value={search}
            setValue={setSearch}
            placeholder="Search"
            width="264px"
          />
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {filteredCards.map((card) => (
            <MarketCard key={card.id} data={card} chainId={chainId} />
          ))}

          {filteredCards.length === 0 && (
            <Box
              sx={{
                border: `1px dashed ${COLORS.iron}`,
                borderRadius: "16px",
                padding: "24px",
              }}
            >
              <Typography variant="text3" color={COLORS.santasGrey}>
                No markets match the current filters.
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  )
}
