import React, { useMemo, useState } from "react"

import { Box, Typography } from "@mui/material"
import { MarketAccount } from "@wildcatfi/wildcat-sdk"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import { useGetBorrowers } from "@/app/[locale]/borrower/hooks/useGetBorrowers"
import { LenderMarketSectionSwitcher } from "@/app/[locale]/lender/components/MarketsSection/components/LenderMarketSectionSwitcher"
import { LenderActiveMarketsTables } from "@/app/[locale]/lender/components/MarketsSection/components/MarketsTables/LenderActiveMarketsTables"
import { OtherMarketsTables } from "@/app/[locale]/lender/components/MarketsSection/components/MarketsTables/OtherMarketsTables"
import { useLendersMarkets } from "@/app/[locale]/lender/hooks/useLendersMarkets"
import { FilterTextField } from "@/components/FilterTextfield"
import {
  SmallFilterSelect,
  SmallFilterSelectItem,
} from "@/components/SmallFilterSelect"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { marketStatusesMock, underlyingAssetsMock } from "@/mocks/mocks"
import { useAppSelector } from "@/store/hooks"
import { LenderMarketDashboardSections } from "@/store/slices/lenderDashboardSlice/lenderDashboardSlice"
import { COLORS } from "@/theme/colors"
import { filterMarketAccounts } from "@/utils/filters"
import { MarketStatus } from "@/utils/marketStatus"
import {
  LenderTerminatedMarketsTables
} from "@/app/[locale]/lender/components/MarketsSection/components/MarketsTables/LenderTerminatedMarketsTables"

export const MarketsSection = () => {
  const marketSection = useAppSelector(
    (state) => state.lenderDashboard.marketSection,
  )

  const [marketSearch, setMarketSearch] = useState<string>("")
  const [marketAssets, setMarketAssets] = useState<SmallFilterSelectItem[]>([])
  const [marketStatuses, setMarketStatuses] = useState<SmallFilterSelectItem[]>(
    [],
  )

  const filters = {
    nameFilter: marketSearch,
    assetFilter: marketAssets,
    statusFilter: marketStatuses.map((status) => status.name) as MarketStatus[],
  }

  const { t } = useTranslation()

  const { address } = useAccount()
  const { isWrongNetwork } = useCurrentNetwork()

  const {
    data: marketAccounts,
    isLoadingInitial,
    isLoadingUpdate,
  } = useLendersMarkets()

  const isLoading = isLoadingInitial || isLoadingUpdate

  const filteredMarketAccounts = useMemo(
    () =>
      filterMarketAccounts(
        marketAccounts,
        marketSearch,
        marketStatuses,
        marketAssets,
      ),
    [marketAccounts, marketSearch, marketStatuses, marketAssets],
  )

  const {
    active: filteredActiveLenderMarketAccounts,
    terminated: filteredTerminatedMarketAccounts,
    other: filteredOtherMarketAccounts,
  } = useMemo(
    () =>
      filteredMarketAccounts.reduce(
        (all, account) => {
          if (account.hasEverInteracted) {
            if (!account.market.isClosed) {
              all.active.push(account)
            } else {
              all.terminated.push(account)
            }
          } else {
            all.other.push(account)
          }
          return all
        },
        {
          active: [] as MarketAccount[],
          terminated: [] as MarketAccount[],
          other: [] as MarketAccount[],
        },
      ),
    [filteredMarketAccounts],
  )

  const { data: borrowers } = useGetBorrowers()

  return (
    <Box
      sx={{
        width: "100%",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          padding: "0 24px",
        }}
      >
        <Box
          sx={{
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="title2" sx={{ marginBottom: "6px" }}>
            Markets
          </Typography>
        </Box>
        <Typography
          variant="text3"
          color={COLORS.santasGrey}
          sx={{ marginBottom: "24px" }}
        >
          All markets you’ve created or create a new one.{" "}
          <Link
            href="https://docs.wildcat.finance/"
            style={{ color: COLORS.santasGrey }}
            target="_blank"
          >
            Learn more
          </Link>
        </Typography>

        <Box
          sx={{
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <LenderMarketSectionSwitcher />

          <Box sx={{ width: "fit-content", display: "flex", gap: "6px" }}>
            <FilterTextField
              value={marketSearch}
              setValue={setMarketSearch}
              placeholder="Search by Name"
            />

            <SmallFilterSelect
              placeholder="Asset"
              options={underlyingAssetsMock}
              selected={marketAssets}
              setSelected={setMarketAssets}
            />

            <SmallFilterSelect
              placeholder="Status"
              options={marketStatusesMock}
              selected={marketStatuses}
              setSelected={setMarketStatuses}
            />
          </Box>
        </Box>
      </Box>

      {marketSection === LenderMarketDashboardSections.ACTIVE && (
        <LenderActiveMarketsTables
          marketAccounts={filteredActiveLenderMarketAccounts}
          borrowers={borrowers ?? []}
          isLoading={isLoading}
          filters={filters}
        />
      )}

      {marketSection === LenderMarketDashboardSections.TERMINATED && (
        <LenderTerminatedMarketsTables
          marketAccounts={filteredTerminatedMarketAccounts}
          borrowers={borrowers ?? []}
          isLoading={isLoading}
          filters={filters}
        />
      )}

      {marketSection === LenderMarketDashboardSections.OTHER &&
        !isWrongNetwork && (
          <OtherMarketsTables
            marketAccounts={filteredOtherMarketAccounts}
            isLoading={isLoading}
            filters={filters}
          />
        )}
    </Box>
  )
}
