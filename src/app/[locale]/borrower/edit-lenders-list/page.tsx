"use client"

import { useEffect } from "react"
import * as React from "react"

import { Box, Skeleton, Typography } from "@mui/material"
import { useSearchParams } from "next/navigation"

import { FiltersContainer } from "@/app/[locale]/borrower/edit-lenders/style"
import { useGetBorrowerMarkets } from "@/app/[locale]/borrower/hooks/getMaketsHooks/useGetBorrowerMarkets"
import { useGetAllLenders } from "@/app/[locale]/borrower/hooks/useGetAllLenders"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  resetFilters,
  setActiveBorrowerMarkets,
  setInitialLendersTableData,
  setLenderFilter,
  setLendersTableData,
  setMarketFilter,
} from "@/store/slices/editLendersListSlice/editLendersListSlice"
import { COLORS } from "@/theme/colors"

import { EditLendersForm } from "./components/EditLendersForm"
import { EditLenderFlowStatuses, LenderTableDataType } from "./interface"

export default function EditLendersListPage() {
  const dispatch = useAppDispatch()
  const urlParams = useSearchParams()

  // Getting Lenders Data Logic
  const { data: lenders, isLoading: isLendersLoading } = useGetAllLenders()
  const lendersData = lenders?.addresses.map((address) => {
    const lender = lenders?.lenders[address]
    return {
      address: lender.lender,
      isAuthorized: lender.authorized,
      markets: lender?.markets?.marketIds.map((marketId) => {
        const market = lender.markets.markets[marketId]
        return {
          name: market.name,
          address: market.id,
        }
      }),
    }
  })

  useEffect(() => {
    if (lendersData) {
      const formattedLendersData: LenderTableDataType[] = lendersData
        .filter((lender) => lender.isAuthorized)
        .map((lender) => ({
          ...lender,
          id: lender.address,
          status: EditLenderFlowStatuses.OLD,
          prevStatus: EditLenderFlowStatuses.OLD,
          markets: lender.markets?.map((market) => ({
            ...market,
            status: EditLenderFlowStatuses.OLD,
            prevStatus: EditLenderFlowStatuses.OLD,
          })),
        }))

      dispatch(setInitialLendersTableData(formattedLendersData))
      dispatch(setLendersTableData(formattedLendersData))
    }
  }, [isLendersLoading])

  // Getting Borrower Markets Logic
  const { data: borrowerMarkets, isLoading: isMarketsLoading } =
    useGetBorrowerMarkets()
  const activeBorrowerMarkets = borrowerMarkets
    ?.filter((market) => !market.isClosed)
    .map((market) => ({ name: market.name, address: market.address }))

  useEffect(() => {
    if (activeBorrowerMarkets) {
      dispatch(setActiveBorrowerMarkets(activeBorrowerMarkets))
    }
  }, [isMarketsLoading])

  // Filtration settings
  const marketName = urlParams.get("marketName")
  const marketAddress = urlParams.get("marketAddress")
  const lenderAddress = urlParams.get("lenderAddress")

  const selectedMarket = useAppSelector(
    (state) => state.editLendersList.marketFilter,
  )

  useEffect(() => {
    if (marketName && marketAddress) {
      dispatch(setMarketFilter({ name: marketName, address: marketAddress }))
    }
    if (lenderAddress) {
      dispatch(setLenderFilter(lenderAddress))
    }

    return () => {
      dispatch(resetFilters())
    }
  }, [])

  // Constants
  const isLoading = isLendersLoading && isMarketsLoading
  // const isLoading = true

  const step = useAppSelector((state) => state.editLendersList.step)

  return (
    <Box padding="40px 44px 0 44px" height="100%">
      <Box sx={{ display: "flex", gap: "8px", marginBottom: "25px" }}>
        <Typography variant="title2">
          Editing Lenders List {!isLoading && "for"}
        </Typography>
        {/* TODO: Add Market Selector */}
      </Box>

      {step === "edit" && <EditLendersForm isLoading={isLoading} />}
    </Box>
  )
}
