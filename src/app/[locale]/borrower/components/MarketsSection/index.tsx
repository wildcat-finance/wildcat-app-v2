import React, { ChangeEvent, useEffect, useState } from "react"

import {
  Box,
  Button,
  IconButton,
  InputAdornment,
  SvgIcon,
  TextField,
  Typography,
} from "@mui/material"
import { MarketAccount } from "@wildcatfi/wildcat-sdk"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import { MarketSectionSwitcher } from "@/app/[locale]/borrower/components/MarketsSection/сomponents/MarketSectionSwitcher"
import { BorrowerActiveMarketsTables } from "@/app/[locale]/borrower/components/MarketsSection/сomponents/MarketsTables/BorrowerActiveMarketsTables"
import { BorrowerTerminatedMarketsTables } from "@/app/[locale]/borrower/components/MarketsSection/сomponents/MarketsTables/BorrowerTerminatedMarketsTables"
import { OtherMarketsTables } from "@/app/[locale]/borrower/components/MarketsSection/сomponents/MarketsTables/OtherMarketsTables"
import { useBorrowerInvitationRedirect } from "@/app/[locale]/borrower/hooks/useBorrowerInvitationRedirect"
import { useLendersMarkets } from "@/app/[locale]/lender/hooks/useLendersMarkets"
import Cross from "@/assets/icons/cross_icon.svg"
import Search from "@/assets/icons/search_icon.svg"
import { FilterTextField } from "@/components/FilterTextfield"
import { LeadBanner } from "@/components/LeadBanner"
import {
  SmallFilterSelect,
  SmallFilterSelectItem,
} from "@/components/SmallFilterSelect"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useGetController } from "@/hooks/useGetController"
import { ROUTES } from "@/routes"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  BorrowerMarketDashboardSections,
  setShowFullFunctionality,
} from "@/store/slices/borrowerDashboardSlice/borrowerDashboardSlice"
import { COLORS } from "@/theme/colors"
import {
  getMarketStatus,
  MarketAssets,
  MarketStatus,
} from "@/utils/marketStatus"

export const underlyingAssetsMock = [
  {
    id: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
    name: MarketAssets.WBTC,
  },
  {
    id: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    name: MarketAssets.WETH,
  },
  {
    id: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    name: MarketAssets.USDT,
  },
  {
    id: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    name: MarketAssets.USDC,
  },
  {
    id: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    name: MarketAssets.DAI,
  },
]

export const marketStatusesMock = [
  {
    id: MarketStatus.HEALTHY,
    name: MarketStatus.HEALTHY,
  },
  {
    id: MarketStatus.DELINQUENT,
    name: MarketStatus.DELINQUENT,
  },
  {
    id: MarketStatus.PENALTY,
    name: MarketStatus.PENALTY,
  },
]

export const filterMarketAccounts = (
  marketAccounts: MarketAccount[] | undefined,
  name: string,
  statuses: SmallFilterSelectItem[],
  assets: SmallFilterSelectItem[],
) => {
  if (!marketAccounts) return []

  let filteredMarkets = marketAccounts

  const assetsNames = assets.map((asset) => asset.name)

  if (filteredMarkets && name !== "") {
    filteredMarkets = filteredMarkets.filter(({ market }) =>
      market.name.toLowerCase().includes(name.toLowerCase()),
    )
  }

  if (filteredMarkets && statuses.length > 0) {
    const statusesNames = statuses.map((status) => status.name)

    filteredMarkets = filteredMarkets.filter(({ market }) =>
      statusesNames.includes(
        getMarketStatus(
          market.isClosed,
          market.isDelinquent || market.willBeDelinquent,
          market.isIncurringPenalties,
        ),
      ),
    )
  }

  if (filteredMarkets && assets.length > 0) {
    filteredMarkets = filteredMarkets.filter(({ market }) =>
      assetsNames.includes(market.underlyingToken.symbol as MarketAssets),
    )
  }

  return filteredMarkets
}

export const MarketsSection = () => {
  const marketSection = useAppSelector(
    (state) => state.borrowerDashboard.marketSection,
  )

  const showFullFunctionality = useAppSelector(
    (state) => state.borrowerDashboard.showFullFunctionality,
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

  const handleChangeMarket = (evt: ChangeEvent<HTMLInputElement>) => {
    setMarketSearch(evt.target.value)
  }

  const handleClickErase = (evt: React.MouseEvent) => {
    evt.stopPropagation()
    setMarketSearch("")
  }

  const { t } = useTranslation()

  const { address } = useAccount()
  const { isWrongNetwork } = useCurrentNetwork()

  const bannerDisplayConfig = useBorrowerInvitationRedirect()

  // TEST

  const {
    data: marketAccounts,
    isLoadingInitial,
    isLoadingUpdate,
  } = useLendersMarkets()

  const isLoading = isLoadingInitial || isLoadingUpdate

  const testBorrowerMarketAccounts = marketAccounts.filter(
    (account) =>
      account.market.borrower.toLowerCase() === address?.toLowerCase(),
  )

  const noMarkets = testBorrowerMarketAccounts.length === 0

  const testOtherMarketAccounts = marketAccounts.filter(
    (account) =>
      account.market.borrower.toLowerCase() !== address?.toLowerCase(),
  )

  const testFilteredMarketAccounts = filterMarketAccounts(
    testBorrowerMarketAccounts,
    marketSearch,
    marketStatuses,
    marketAssets,
  )

  const testFilteredOtherMarketAccounts = filterMarketAccounts(
    testOtherMarketAccounts,
    marketSearch,
    marketStatuses,
    marketAssets,
  )

  const testActiveMarketAccounts = testFilteredMarketAccounts.filter(
    (account) => !account.market.isClosed,
  )

  const testTerminatedMarketAccounts = testFilteredMarketAccounts.filter(
    (account) => account.market.isClosed,
  )

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
          {!bannerDisplayConfig.hideNewMarketButton && (
            <Link href={ROUTES.borrower.createMarket}>
              <Button
                variant="contained"
                size="small"
                disabled={isWrongNetwork}
                sx={{
                  paddingTop: "8px",
                  paddingBottom: "8px",
                  minWidth: "100px",
                }}
              >
                {t("borrowerMarketList.button.newMarket")}
              </Button>
            </Link>
          )}
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
          <MarketSectionSwitcher />

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

      {!bannerDisplayConfig.hideBanner &&
        !(marketSection === BorrowerMarketDashboardSections.OTHER) && (
          <Box padding="24px 24px 0">
            <LeadBanner
              title={bannerDisplayConfig.title}
              text={bannerDisplayConfig.text}
              buttonText={bannerDisplayConfig.buttonText}
              buttonLink={bannerDisplayConfig.link}
            />
          </Box>
        )}

      {marketSection === BorrowerMarketDashboardSections.ACTIVE &&
        showFullFunctionality &&
        !noMarkets && (
          <BorrowerActiveMarketsTables
            marketAccounts={testActiveMarketAccounts}
            isLoading={isLoading}
            filters={filters}
          />
        )}

      {marketSection === BorrowerMarketDashboardSections.TERMINATED &&
        showFullFunctionality &&
        !noMarkets && (
          <BorrowerTerminatedMarketsTables
            marketAccounts={testTerminatedMarketAccounts}
            isLoading={isLoading}
            filters={filters}
          />
        )}

      {marketSection === BorrowerMarketDashboardSections.OTHER &&
        !isWrongNetwork && (
          <OtherMarketsTables
            marketAccounts={testFilteredOtherMarketAccounts}
            isLoading={isLoading}
            filters={filters}
          />
        )}

      {isWrongNetwork && (
        <Box sx={{ padding: "24px" }}>
          <Typography variant="title3">
            {t("borrowerMarketList.table.noMarkets.wrongNetwork")}
          </Typography>
        </Box>
      )}
    </Box>
  )
}
