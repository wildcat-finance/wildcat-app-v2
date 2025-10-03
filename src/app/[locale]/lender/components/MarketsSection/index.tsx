import React, { useEffect, useMemo, useState } from "react"

import { Box, Button, Skeleton, Typography } from "@mui/material"
import {
  DepositStatus,
  LenderRole,
  MarketAccount,
  MarketVersion,
  SupportedChainId,
} from "@wildcatfi/wildcat-sdk"
import Link from "next/link"
import { useTranslation } from "react-i18next"

import { useBorrowerNames } from "@/app/[locale]/borrower/hooks/useBorrowerNames"
import { LenderMarketSectionSwitcher } from "@/app/[locale]/lender/components/MarketsSection/components/LenderMarketSectionSwitcher"
import { LenderActiveMarketsTables } from "@/app/[locale]/lender/components/MarketsSection/components/MarketsTables/LenderActiveMarketsTables"
import { LenderTerminatedMarketsTables } from "@/app/[locale]/lender/components/MarketsSection/components/MarketsTables/LenderTerminatedMarketsTables"
import { OtherMarketsTables } from "@/app/[locale]/lender/components/MarketsSection/components/MarketsTables/OtherMarketsTables"
import { MobileMarketSectionHeader } from "@/app/[locale]/lender/components/MarketsSection/components/MobileMarketSectionSwitcher"
import { useLendersMarkets } from "@/app/[locale]/lender/hooks/useLendersMarkets"
import { FilterTextField } from "@/components/FilterTextfield"
import { MobileFilterButton } from "@/components/Mobile/MobileFilterButton"
import { MobileSearchButton } from "@/components/Mobile/MobileSearchButton"
import {
  SmallFilterSelect,
  SmallFilterSelectItem,
} from "@/components/SmallFilterSelect"
import { WrongNetworkAlert } from "@/components/WrongNetworkAlert"
import { useAllTokensWithMarkets } from "@/hooks/useAllTokensWithMarkets"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { marketStatusesMock } from "@/mocks/mocks"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { setLendersSectionAmount } from "@/store/slices/lenderDashboardAmountSlice/lenderDashboardAmountsSlice"
import {
  LenderMarketDashboardSections,
  setMarketSection,
  setShowFullFunctionality,
} from "@/store/slices/lenderDashboardSlice/lenderDashboardSlice"
import { COLORS } from "@/theme/colors"
import { EXCLUDED_MARKETS } from "@/utils/constants"
import { filterMarketAccounts } from "@/utils/filters"
import { MarketStatus } from "@/utils/marketStatus"

export const MarketsSection = () => {
  const isMobile = useMobileResolution()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const marketSection = useAppSelector(
    (state) => state.lenderDashboard.marketSection,
  )

  const [marketSearch, setMarketSearch] = useState<string>("")
  const [marketAssets, setMarketAssets] = useState<SmallFilterSelectItem[]>([])
  const [marketStatuses, setMarketStatuses] = useState<SmallFilterSelectItem[]>(
    [],
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

  const { t } = useTranslation()
  const dispatch = useAppDispatch()

  const {
    isWrongNetwork,
    chainId: targetChainId,
    isTestnet,
  } = useCurrentNetwork()
  const { data: borrowers } = useBorrowerNames()

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
        borrowers,
      ),
    [marketAccounts, marketSearch, marketStatuses, marketAssets, borrowers],
  )

  const { data: tokensRaw } = useAllTokensWithMarkets()
  const tokens = useMemo(() => {
    if (isTestnet) {
      /// Only take first token with a given symbol
      return tokensRaw?.filter(
        (token, index, self) =>
          index === self.findIndex((x) => x.symbol === token.symbol),
      )
    }
    return tokensRaw
  }, [tokensRaw, targetChainId])

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

  const lenderMarkets = marketAccounts
    .filter(
      (account) =>
        !EXCLUDED_MARKETS.includes(account.market.address.toLowerCase()) ||
        account.isAuthorizedOnController ||
        account.role !== LenderRole.Null,
    )
    .filter((account) => account.hasEverInteracted)

  const depositedMarketsAmount = lenderMarkets.filter(
    (market) => !market.market.isClosed && market.hasEverInteracted,
  ).length

  const nonDepositedMarketsAmount = lenderMarkets.filter(
    (market) => !market.market.isClosed && !market.hasEverInteracted,
  ).length

  const prevActiveAmount = lenderMarkets.filter(
    (market) => market.market.isClosed && market.hasEverInteracted,
  ).length

  const neverActiveAmount = lenderMarkets.filter(
    (market) => market.market.isClosed && !market.hasEverInteracted,
  ).length

  const othersMarkets = marketAccounts
    .filter(
      (account) =>
        !EXCLUDED_MARKETS.includes(account.market.address.toLowerCase()) ||
        account.isAuthorizedOnController ||
        account.role !== LenderRole.Null,
    )
    .filter((account) => !account.hasEverInteracted)

  const selfOnboardAmount = othersMarkets.filter(
    (account) =>
      !account.hasEverInteracted &&
      account.market.version === MarketVersion.V2 &&
      account.depositAvailability === DepositStatus.Ready,
  ).length

  const manualAmount = othersMarkets.filter(
    (account) =>
      !(
        !account.hasEverInteracted &&
        account.market.version === MarketVersion.V2 &&
        account.depositAvailability === DepositStatus.Ready
      ),
  ).length

  useEffect(() => {
    dispatch(
      setLendersSectionAmount({
        name: "deposited",
        value: isWrongNetwork ? 0 : depositedMarketsAmount,
      }),
    )
    dispatch(
      setLendersSectionAmount({
        name: "nonDeposited",
        value: isWrongNetwork ? 0 : nonDepositedMarketsAmount,
      }),
    )
    dispatch(
      setLendersSectionAmount({
        name: "prevActive",
        value: isWrongNetwork ? 0 : prevActiveAmount,
      }),
    )
    dispatch(
      setLendersSectionAmount({
        name: "neverActive",
        value: isWrongNetwork ? 0 : neverActiveAmount,
      }),
    )
    dispatch(
      setLendersSectionAmount({
        name: "selfOnboard",
        value: isWrongNetwork ? 0 : selfOnboardAmount,
      }),
    )
    dispatch(
      setLendersSectionAmount({
        name: "manual",
        value: isWrongNetwork ? 0 : manualAmount,
      }),
    )
  }, [
    depositedMarketsAmount,
    nonDepositedMarketsAmount,
    prevActiveAmount,
    neverActiveAmount,
    selfOnboardAmount,
    manualAmount,
    isWrongNetwork,
  ])

  const noMarketsAtAll = lenderMarkets.length === 0

  const noActiveMarkets =
    lenderMarkets.filter((account) => !account.market.isClosed).length === 0

  useEffect(() => {
    dispatch(setShowFullFunctionality(!noMarketsAtAll))

    if (noMarketsAtAll) {
      dispatch(setMarketSection(LenderMarketDashboardSections.OTHER))
    } else {
      dispatch(setMarketSection(LenderMarketDashboardSections.ACTIVE))
    }
  }, [noMarketsAtAll])

  if (!mounted)
    return (
      <Skeleton
        sx={{
          width: "100%",
          height: {
            xs: "153px",
            md: "162px",
          },
          borderRadius: "14px",
          backgroundColor: {
            xs: COLORS.white06,
            md: "transparent",
          },
        }}
      />
    )

  return (
    <Box sx={{ width: "100%" }}>
      {!isMobile && (
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
              {t("dashboard.markets.title")}
            </Typography>

            {marketSection !== LenderMarketDashboardSections.OTHER &&
              !isLoading && (
                <Button
                  variant="contained"
                  size="small"
                  disabled={isWrongNetwork}
                  sx={{
                    paddingTop: "8px",
                    paddingBottom: "8px",
                    minWidth: "100px",
                  }}
                  onClick={() =>
                    dispatch(
                      setMarketSection(LenderMarketDashboardSections.OTHER),
                    )
                  }
                >
                  {t("dashboard.markets.lenderTitleButton")}
                </Button>
              )}
          </Box>

          <Typography
            variant="text3"
            color={COLORS.santasGrey}
            sx={{ marginBottom: "24px" }}
          >
            {t("dashboard.markets.lenderSubtitle")}{" "}
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
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            {!noMarketsAtAll && <LenderMarketSectionSwitcher />}

            <Box sx={{ width: "fit-content", display: "flex", gap: "6px" }}>
              <FilterTextField
                value={marketSearch}
                setValue={setMarketSearch}
                placeholder={t("dashboard.markets.filters.name")}
                width="180px"
              />

              <SmallFilterSelect
                placeholder={t("dashboard.markets.filters.assets")}
                options={
                  tokens?.map((token) => ({
                    id: token.address,
                    name: token.symbol,
                  })) ?? []
                }
                selected={marketAssets}
                setSelected={setMarketAssets}
                width="180px"
              />

              <SmallFilterSelect
                placeholder={t("dashboard.markets.filters.statuses")}
                options={marketStatusesMock}
                selected={marketStatuses}
                setSelected={setMarketStatuses}
                width="180px"
              />
            </Box>
          </Box>
        </Box>
      )}

      {isMobile && (
        <MobileMarketSectionHeader>
          <Box sx={{ display: "flex", gap: "4px" }}>
            <MobileFilterButton
              assetsOptions={
                tokens?.map((token) => ({
                  id: token.address,
                  name: token.symbol,
                })) ?? []
              }
              statusesOptions={marketStatusesMock}
              marketAssets={marketAssets}
              marketStatuses={marketStatuses}
              setMarketAssets={setMarketAssets}
              setMarketStatuses={setMarketStatuses}
            />

            <MobileSearchButton
              marketAccounts={filteredMarketAccounts ?? []}
              marketSearch={marketSearch}
              setMarketSearch={setMarketSearch}
            />
          </Box>
        </MobileMarketSectionHeader>
      )}

      {marketSection === LenderMarketDashboardSections.ACTIVE &&
        !noActiveMarkets &&
        !noMarketsAtAll &&
        !isWrongNetwork && (
          <LenderActiveMarketsTables
            marketAccounts={filteredActiveLenderMarketAccounts}
            borrowers={borrowers ?? []}
            isLoading={isLoading}
            filters={filters}
          />
        )}

      {marketSection === LenderMarketDashboardSections.TERMINATED &&
        !noMarketsAtAll &&
        !isWrongNetwork && (
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
            borrowers={borrowers ?? []}
            isLoading={isLoading}
            filters={filters}
          />
        )}

      {isWrongNetwork && <WrongNetworkAlert />}

      {noActiveMarkets &&
        !isLoading &&
        !noMarketsAtAll &&
        marketSection === LenderMarketDashboardSections.ACTIVE && (
          <Box
            sx={{
              width: "100%",
              padding: { xs: "4px 0 0", md: "24px 24px 0px" },
            }}
          >
            <Box
              sx={{
                width: "100%",
                padding: "40px 24px",
                display: "flex",
                flexDirection: "column",
                backgroundColor: { xs: COLORS.white, md: COLORS.hintOfRed },
                borderRadius: "16px",
              }}
            >
              <Typography variant="text1" marginBottom="6px">
                {t("dashboard.markets.noMarkets.lenderAlert.title")}
              </Typography>
              <Typography
                variant="text3"
                color={COLORS.santasGrey}
                marginBottom="24px"
              >
                {t("dashboard.markets.noMarkets.lenderAlert.subtitle")}
              </Typography>

              <Button
                variant="contained"
                sx={{ width: "fit-content", padding: "8px 12px" }}
                onClick={() =>
                  dispatch(
                    setMarketSection(LenderMarketDashboardSections.OTHER),
                  )
                }
              >
                <Typography
                  variant="text4"
                  color={COLORS.white}
                  sx={{ fontWeight: 600 }}
                >
                  {t("dashboard.markets.noMarkets.lenderAlert.button")}
                </Typography>
              </Button>
            </Box>
          </Box>
        )}
    </Box>
  )
}
