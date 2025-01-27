import React, { ChangeEvent, useState } from "react"

import { Box, Button, Typography } from "@mui/material"
import { Market } from "@wildcatfi/wildcat-sdk"
import Link from "next/link"

import { useGetAllLenders } from "@/app/[locale]/borrower/hooks/useGetAllLenders"
import { FilterTextField } from "@/components/FilterTextfield"
import {
  SmallFilterSelect,
  SmallFilterSelectItem,
} from "@/components/SmallFilterSelect"
import { ROUTES } from "@/routes"
import { useAppSelector } from "@/store/hooks"
import { COLORS } from "@/theme/colors"
import { trimAddress } from "@/utils/formatters"

export type LendersSectionProps = {
  markets: Market[] | undefined
  // eslint-disable-next-line react/no-unused-prop-types
  isMarketsLoading: boolean
}

export const LendersSection = ({ markets }: LendersSectionProps) => {
  const { data: lenders } = useGetAllLenders()

  const [lenderSearch, setLenderSearch] = useState<string>("")
  const [marketsFilter, setMarketsFilter] = useState<SmallFilterSelectItem[]>(
    [],
  )
  const [selectedLenders, setSelectedLenders] = useState<
    SmallFilterSelectItem[]
  >([])

  const showFullFunctionality = useAppSelector(
    (state) => state.borrowerDashboard.showFullFunctionality,
  )

  const marketsOptions = markets?.map((market) => ({
    id: market.address,
    name: market.name,
  }))

  const lendersNames: { [key: string]: string } = JSON.parse(
    typeof window !== "undefined"
      ? localStorage.getItem("lenders-name") || "{}"
      : "{}",
  )

  const lendersData = lenders?.addresses
    .map((a) => lenders?.lenders[a])
    .map((l) => ({
      ...l,
      markets: l?.markets.marketIds.map((m) => l?.markets.markets[m]),
    }))
    .map((lender) => ({
      address: lender.lender,
      isAuthorized: lender.authorized,
      markets: lender.markets.map((market) => ({
        name: market.name,
        address: market.id,
      })),
    }))

  const lendersOptions = lendersData?.map((lender) => ({
    id: lender.address,
    name: lendersNames[lender.address] || trimAddress(lender.address),
  }))

  // const filteredLendersData = (lendersData ?? []).filter((lender) => {
  //   const searchFilterLower = lenderSearch.toLowerCase()
  //
  //   const isLenderMatchedBySearch =
  //     (lendersNames[lender.address] ?? "")
  //       .toLowerCase()
  //       .includes(searchFilterLower) ||
  //     lender.address.toLowerCase().includes(searchFilterLower)
  //
  //   const isMarketMatchedBySearch = lender.markets.some(
  //     (market) =>
  //       market.name.toLowerCase().includes(searchFilterLower) ||
  //       market.address.toLowerCase().includes(searchFilterLower),
  //   )
  //
  //   const matchesSearch =
  //     lenderSearch === "" || isLenderMatchedBySearch || isMarketMatchedBySearch
  //
  //   const isLenderSelected =
  //     selectedLenders.length === 0 ||
  //     selectedLenders.some(
  //       (selectedLender) => selectedLender.id === lender.address,
  //     )
  //
  //   const hasSelectedMarkets =
  //     marketsFilter.length === 0 ||
  //     lender.markets.some((market) =>
  //       marketsFilter.some(
  //         (selectedMarket) => selectedMarket.id === market.address,
  //       ),
  //     )
  //
  //   if (selectedLenders.length > 0 && marketsFilter.length > 0) {
  //     return isLenderSelected && hasSelectedMarkets && matchesSearch
  //   }
  //   if (selectedLenders.length > 0) {
  //     return isLenderSelected && matchesSearch
  //   }
  //   if (selectedLenders.length > 0) {
  //     return hasSelectedMarkets && matchesSearch
  //   }
  //
  //   return matchesSearch
  // })

  // const authorizedLenders = filteredLendersData?.filter(
  //   (lender) => lender.isAuthorized,
  // )
  //
  // const deauthorizedLenders = filteredLendersData?.filter(
  //   (lender) => !lender.isAuthorized,
  // )

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
            Lenders
          </Typography>
          {showFullFunctionality && (
            <Link href={ROUTES.borrower.createMarket}>
              <Button
                variant="contained"
                size="small"
                disabled={!showFullFunctionality}
                sx={{
                  paddingTop: "8px",
                  paddingBottom: "8px",
                  minWidth: "100px",
                }}
              >
                Edit Lenders List
              </Button>
            </Link>
          )}
        </Box>
        <Typography
          variant="text3"
          color={COLORS.santasGrey}
          sx={{ marginBottom: "24px" }}
        >
          List of lenders that’s applied to your markets.{" "}
          <Link
            href="https://docs.wildcat.finance/"
            style={{ color: COLORS.santasGrey }}
            target="_blank"
          >
            Learn more
          </Link>
        </Typography>

        <Box sx={{ width: "fit-content", display: "flex", gap: "6px" }}>
          <FilterTextField
            value={lenderSearch}
            setValue={setLenderSearch}
            placeholder="Search by Name"
          />

          <SmallFilterSelect
            placeholder="Markets"
            options={marketsOptions ?? []}
            selected={marketsFilter}
            setSelected={setMarketsFilter}
          />

          <SmallFilterSelect
            placeholder="Lenders"
            options={lendersOptions ?? []}
            selected={selectedLenders}
            setSelected={setSelectedLenders}
          />
        </Box>
      </Box>

      {/* <Box */}
      {/*  sx={{ */}
      {/*    width: "100%", */}
      {/*    height: "calc(100vh - 43px - 52px - 52px - 110px - 36px)", */}
      {/*    overflow: "auto", */}
      {/*    overflowY: "auto", */}
      {/*    display: "flex", */}
      {/*    flexDirection: "column", */}
      {/*    gap: "16px", */}
      {/*    marginTop: "24px", */}
      {/*  }} */}
      {/* > */}
      {/*  <LendersTable */}
      {/*    tableData={authorizedLenders} */}
      {/*    isLoading={false} */}
      {/*    isOpen */}
      {/*    label="Active Lenders" */}
      {/*  /> */}

      {/*  <LendersTable */}
      {/*    tableData={deauthorizedLenders} */}
      {/*    isLoading={false} */}
      {/*    label="Deleted Lenders" */}
      {/*  /> */}
      {/* </Box> */}
    </Box>
  )
}
