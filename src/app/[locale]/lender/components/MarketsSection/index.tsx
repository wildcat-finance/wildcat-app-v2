import React, { useEffect, useMemo, useState } from "react"

import { Box, Button, Typography } from "@mui/material"
import {
  DepositStatus,
  LenderRole,
  MarketAccount,
  MarketVersion,
} from "@wildcatfi/wildcat-sdk"
import Link from "next/link"
import { useTranslation } from "react-i18next"

import { useBorrowerNames } from "@/app/[locale]/borrower/hooks/useBorrowerNames"
import { LenderMarketSectionSwitcher } from "@/app/[locale]/lender/components/MarketsSection/components/LenderMarketSectionSwitcher"
import { LenderActiveMarketsTables } from "@/app/[locale]/lender/components/MarketsSection/components/MarketsTables/LenderActiveMarketsTables"
import { LenderTerminatedMarketsTables } from "@/app/[locale]/lender/components/MarketsSection/components/MarketsTables/LenderTerminatedMarketsTables"
import { OtherMarketsTables } from "@/app/[locale]/lender/components/MarketsSection/components/MarketsTables/OtherMarketsTables"
import { useLendersMarkets } from "@/app/[locale]/lender/hooks/useLendersMarkets"
import { FilterTextField } from "@/components/FilterTextfield"
import {
  SmallFilterSelect,
  SmallFilterSelectItem,
} from "@/components/SmallFilterSelect"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { marketStatusesMock, underlyingAssetsMock } from "@/mocks/mocks"
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
  const dispatch = useAppDispatch()

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

  const { data: borrowers } = useBorrowerNames()

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
        value: depositedMarketsAmount,
      }),
    )
    dispatch(
      setLendersSectionAmount({
        name: "nonDeposited",
        value: nonDepositedMarketsAmount,
      }),
    )
    dispatch(
      setLendersSectionAmount({ name: "prevActive", value: prevActiveAmount }),
    )
    dispatch(
      setLendersSectionAmount({
        name: "neverActive",
        value: neverActiveAmount,
      }),
    )
    dispatch(
      setLendersSectionAmount({
        name: "selfOnboard",
        value: selfOnboardAmount,
      }),
    )
    dispatch(setLendersSectionAmount({ name: "manual", value: manualAmount }))
  }, [
    depositedMarketsAmount,
    nonDepositedMarketsAmount,
    prevActiveAmount,
    neverActiveAmount,
    selfOnboardAmount,
    manualAmount,
    dispatch,
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
  }, [noMarketsAtAll, dispatch])

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
            {t("dashboard.markets.title")}
          </Typography>

          {!(marketSection === LenderMarketDashboardSections.OTHER) &&
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
            />

            <SmallFilterSelect
              placeholder={t("dashboard.markets.filters.assets")}
              options={underlyingAssetsMock}
              selected={marketAssets}
              setSelected={setMarketAssets}
            />

            <SmallFilterSelect
              placeholder={t("dashboard.markets.filters.statuses")}
              options={marketStatusesMock}
              selected={marketStatuses}
              setSelected={setMarketStatuses}
            />
          </Box>
        </Box>
      </Box>

      {marketSection === LenderMarketDashboardSections.ACTIVE &&
        !noActiveMarkets &&
        !noMarketsAtAll && (
          <LenderActiveMarketsTables
            marketAccounts={filteredActiveLenderMarketAccounts}
            borrowers={borrowers ?? []}
            isLoading={isLoading}
            filters={filters}
          />
        )}

      {marketSection === LenderMarketDashboardSections.TERMINATED &&
        !noMarketsAtAll && (
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

      {noActiveMarkets &&
        !isLoading &&
        !noMarketsAtAll &&
        marketSection === LenderMarketDashboardSections.ACTIVE && (
          <Box sx={{ width: "100%", padding: "0 24px", marginTop: "24px" }}>
            <Box
              sx={{
                width: "100%",
                padding: "40px 24px",
                display: "flex",
                flexDirection: "column",
                backgroundColor: COLORS.hintOfRed,
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
