"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"

import { Box, Button, Divider, Skeleton, Typography } from "@mui/material"
import { LenderRole, MarketAccount } from "@wildcatfi/wildcat-sdk"
import Link from "next/link"
import { useTranslation } from "react-i18next"

import { useLenderMarketsContext } from "@/app/[locale]/lender/context"
import { FilterTextField } from "@/components/FilterTextfield"
import { MarketsFilterSelect } from "@/components/MarketsFilterSelect"
import { MarketsFilterSelectItem } from "@/components/MarketsFilterSelect/interface"
import { MobileFilterButton } from "@/components/Mobile/MobileFilterButton"
import { MobileSearchButton } from "@/components/Mobile/MobileSearchButton"
import { RepeatingSkeletons } from "@/components/RepeatingSkeletons"
import { WrongNetworkAlert } from "@/components/WrongNetworkAlert"
import { useAllTokensWithMarkets } from "@/hooks/useAllTokensWithMarkets"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { marketStatusesMock } from "@/mocks/mocks"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  LenderMarketDashboardSections,
  setMarketSection,
} from "@/store/slices/lenderDashboardSlice/lenderDashboardSlice"
import { setMarketFilters } from "@/store/slices/marketFiltersSlice/marketFiltersSlice"
import { COLORS } from "@/theme/colors"
import { EXCLUDED_MARKETS } from "@/utils/constants"
import { filterMarketAccounts } from "@/utils/filters"
import { MarketStatus } from "@/utils/marketStatus"

import { ActiveMarketsTables } from "../MarketsTables/ActiveMarketsTables"
import { TerminatedMarketsTables } from "../MarketsTables/TerminatedMarketsTables"
import { MobileHeader } from "../MobileHeader"

const withdrawalCycleOptions = [
  { id: "0-86400", name: "≤ 24h" },
  { id: "86401-259200", name: "1 - 3 days" },
  { id: "259201-604800", name: "3 - 7 days" },
  { id: "604801-Infinity", name: "7+ days" },
]

export const MyMarketsSection = () => {
  const isMobile = useMobileResolution()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const dispatch = useAppDispatch()
  const { t } = useTranslation()
  const {
    isWrongNetwork,
    chainId: targetChainId,
    isTestnet,
  } = useCurrentNetwork()

  const { marketAccounts, isLoadingInitial, isLoadingUpdate, borrowers } =
    useLenderMarketsContext()

  const isLoading = isLoadingInitial || isLoadingUpdate

  const marketSection = useAppSelector(
    (state) => state.lenderDashboard.marketSection,
  )

  const marketFilters = useAppSelector((s) => s.marketFilters.lender)
  const {
    search: marketSearch,
    assets: marketAssets,
    statuses: marketStatuses,
    withdrawalCycles: marketWithdrawalCycles,
  } = marketFilters

  const setMarketSearch: React.Dispatch<React.SetStateAction<string>> =
    useCallback(
      (value) => {
        const next =
          typeof value === "function"
            ? (value as (prev: string) => string)(marketSearch)
            : value
        dispatch(
          setMarketFilters({ role: "lender", filters: { search: next } }),
        )
      },
      [dispatch, marketSearch],
    )

  const setMarketAssets: React.Dispatch<
    React.SetStateAction<MarketsFilterSelectItem[]>
  > = useCallback(
    (value) => {
      const next =
        typeof value === "function"
          ? (
              value as (
                prev: MarketsFilterSelectItem[],
              ) => MarketsFilterSelectItem[]
            )(marketAssets)
          : value
      dispatch(setMarketFilters({ role: "lender", filters: { assets: next } }))
    },
    [dispatch, marketAssets],
  )

  const setMarketStatuses: React.Dispatch<
    React.SetStateAction<MarketsFilterSelectItem[]>
  > = useCallback(
    (value) => {
      const next =
        typeof value === "function"
          ? (
              value as (
                prev: MarketsFilterSelectItem[],
              ) => MarketsFilterSelectItem[]
            )(marketStatuses)
          : value
      dispatch(
        setMarketFilters({ role: "lender", filters: { statuses: next } }),
      )
    },
    [dispatch, marketStatuses],
  )

  const setMarketWithdrawalCycles: React.Dispatch<
    React.SetStateAction<MarketsFilterSelectItem[]>
  > = useCallback(
    (value) => {
      const next =
        typeof value === "function"
          ? (
              value as (
                prev: MarketsFilterSelectItem[],
              ) => MarketsFilterSelectItem[]
            )(marketWithdrawalCycles)
          : value
      dispatch(
        setMarketFilters({
          role: "lender",
          filters: { withdrawalCycles: next },
        }),
      )
    },
    [dispatch, marketWithdrawalCycles],
  )

  const filters = useMemo(
    () => ({
      nameFilter: marketSearch,
      assetFilter: marketAssets,
      statusFilter: marketStatuses.map(
        (status) => status.name,
      ) as MarketStatus[],
    }),
    [marketSearch, marketAssets, marketStatuses],
  )

  // Markets the lender has ever interacted with, excluding blacklisted addresses
  const myMarketAccounts = useMemo(
    () =>
      marketAccounts
        .filter(
          (account) =>
            !EXCLUDED_MARKETS.includes(account.market.address.toLowerCase()) ||
            account.isAuthorizedOnController ||
            account.role !== LenderRole.Null,
        )
        .filter((account) => account.hasEverInteracted),
    [marketAccounts],
  )

  const filteredMarketAccounts = useMemo(
    () =>
      filterMarketAccounts(
        myMarketAccounts,
        marketSearch,
        marketStatuses,
        marketAssets,
        borrowers,
        marketWithdrawalCycles,
      ),
    [
      myMarketAccounts,
      marketSearch,
      marketStatuses,
      marketAssets,
      borrowers,
      marketWithdrawalCycles,
    ],
  )

  const {
    active: filteredActiveMarkets,
    terminated: filteredTerminatedMarkets,
  } = useMemo(
    () =>
      filteredMarketAccounts.reduce(
        (all, account) => {
          if (!account.market.isClosed) {
            all.active.push(account)
          } else {
            all.terminated.push(account)
          }
          return all
        },
        {
          active: [] as MarketAccount[],
          terminated: [] as MarketAccount[],
        },
      ),
    [filteredMarketAccounts],
  )

  const { data: tokensRaw } = useAllTokensWithMarkets()
  const tokens = useMemo(() => {
    if (isTestnet) {
      return tokensRaw?.filter(
        (token, index, self) =>
          index === self.findIndex((x) => x.symbol === token.symbol),
      )
    }
    return tokensRaw
  }, [tokensRaw, targetChainId])

  const activeCount = myMarketAccounts.filter((a) => !a.market.isClosed).length
  const terminatedCount = myMarketAccounts.filter(
    (a) => a.market.isClosed,
  ).length

  if (!mounted)
    return (
      <Skeleton
        sx={{
          width: "100%",
          height: { xs: "153px", md: "162px" },
          borderRadius: "14px",
          backgroundColor: { xs: COLORS.white06, md: "transparent" },
        }}
      />
    )

  return (
    <Box>
      {/* Mobile Version */}
      {isMobile && (
        <MobileHeader>
          <Box sx={{ display: "flex", gap: "4px" }}>
            <MobileFilterButton
              assetsOptions={
                tokens?.map((token) => ({
                  id: token.address,
                  name: token.symbol,
                })) ?? []
              }
              statusesOptions={marketStatusesMock}
              withdrawalCycleOptions={withdrawalCycleOptions}
              marketAssets={marketAssets}
              marketStatuses={marketStatuses}
              marketWithdrawalCycles={marketWithdrawalCycles}
              setMarketAssets={setMarketAssets}
              setMarketStatuses={setMarketStatuses}
              setMarketWithdrawalCycles={setMarketWithdrawalCycles}
            />
            <MobileSearchButton
              marketAccounts={filteredMarketAccounts ?? []}
              marketSearch={marketSearch}
              setMarketSearch={setMarketSearch}
            />
          </Box>
        </MobileHeader>
      )}

      {/* Desktop Version */}
      {!isMobile && (
        <Box>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              padding: "28px 16px 0",
            }}
          >
            <Typography variant="title2">My Markets</Typography>

            <Typography variant="text3" color={COLORS.santasGrey}>
              All markets you have a position in.{" "}
              <Link
                href="https://docs.wildcat.finance/using-wildcat/day-to-day-usage/lenders"
                style={{ color: COLORS.santasGrey }}
                target="_blank"
                rel="noreferrer"
              >
                {t("dashboard.markets.docsLink")}
              </Link>
            </Typography>

            <Box
              sx={{
                display: "flex",
                gap: "12px",
                marginTop: "18px",
              }}
            >
              {isLoading ? (
                <RepeatingSkeletons
                  itemsLength={2}
                  skeletonSX={{
                    width: "165px",
                    height: "32px",
                    borderRadius: "10px",
                  }}
                />
              ) : (
                <>
                  <Button
                    variant="text"
                    onClick={() =>
                      dispatch(
                        setMarketSection(LenderMarketDashboardSections.ACTIVE),
                      )
                    }
                    sx={{
                      gap: "6px",
                      padding: "6px 16px",
                      fontWeight:
                        marketSection === LenderMarketDashboardSections.ACTIVE
                          ? 600
                          : 500,
                      backgroundColor:
                        marketSection === LenderMarketDashboardSections.ACTIVE
                          ? COLORS.whiteSmoke
                          : "transparent",
                    }}
                  >
                    Active Markets
                    {activeCount > 0 && (
                      <Typography
                        variant="text3"
                        color={COLORS.santasGrey}
                        sx={{ lineHeight: "20px" }}
                      >
                        {activeCount}
                      </Typography>
                    )}
                  </Button>

                  <Button
                    variant="text"
                    onClick={() =>
                      dispatch(
                        setMarketSection(
                          LenderMarketDashboardSections.TERMINATED,
                        ),
                      )
                    }
                    sx={{
                      gap: "6px",
                      padding: "6px 16px",
                      fontWeight:
                        marketSection ===
                        LenderMarketDashboardSections.TERMINATED
                          ? 600
                          : 500,
                      backgroundColor:
                        marketSection ===
                        LenderMarketDashboardSections.TERMINATED
                          ? COLORS.whiteSmoke
                          : "transparent",
                    }}
                  >
                    Terminated Markets
                    {terminatedCount > 0 && (
                      <Typography
                        variant="text3"
                        color={COLORS.santasGrey}
                        sx={{ lineHeight: "20px" }}
                      >
                        {terminatedCount}
                      </Typography>
                    )}
                  </Button>
                </>
              )}
            </Box>
          </Box>

          <Divider
            sx={{
              margin: "18px 0 16px",
              borderColor: COLORS.athensGrey,
            }}
          />

          <Box
            sx={{
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
              padding: "0 16px",
            }}
          >
            <Box sx={{ display: "flex", gap: "6px" }}>
              <MarketsFilterSelect
                placeholder={t("dashboard.markets.filters.assets")}
                options={
                  tokens?.map((token) => ({
                    id: token.address,
                    name: token.symbol,
                  })) ?? []
                }
                selected={marketAssets}
                setSelected={setMarketAssets}
              />
              <MarketsFilterSelect
                placeholder={t("dashboard.markets.filters.statuses")}
                options={marketStatusesMock}
                selected={marketStatuses}
                setSelected={setMarketStatuses}
              />
              <MarketsFilterSelect
                placeholder="Withdrawal Cycle"
                options={withdrawalCycleOptions}
                selected={marketWithdrawalCycles}
                setSelected={setMarketWithdrawalCycles}
              />
            </Box>

            <FilterTextField
              value={marketSearch}
              setValue={setMarketSearch}
              placeholder={t("dashboard.markets.filters.name")}
              width="264px"
            />
          </Box>
        </Box>
      )}
      {isWrongNetwork && <WrongNetworkAlert />}
      {!isWrongNetwork &&
        marketSection === LenderMarketDashboardSections.ACTIVE && (
          <ActiveMarketsTables
            marketAccounts={filteredActiveMarkets}
            borrowers={borrowers ?? []}
            isLoading={isLoading}
            filters={filters}
          />
        )}
      {!isWrongNetwork &&
        marketSection === LenderMarketDashboardSections.TERMINATED && (
          <TerminatedMarketsTables
            marketAccounts={filteredTerminatedMarkets}
            borrowers={borrowers ?? []}
            isLoading={isLoading}
            filters={filters}
          />
        )}
    </Box>
  )
}
