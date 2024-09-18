"use client"

import { useEffect } from "react"

import { Box, Typography } from "@mui/material"
import { useSearchParams } from "next/navigation"

import { useGetBorrowerMarkets } from "@/app/[locale]/borrower/hooks/getMaketsHooks/useGetBorrowerMarkets"
import { useGetAllLenders } from "@/app/[locale]/borrower/hooks/useGetAllLenders"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  resetFilters,
  setInitialLendersTableData,
  setLenderFilter,
  setLendersTableData,
  setMarketFilter,
} from "@/store/slices/editLendersListSlice/editLendersListSlice"

import { EditForm } from "./components/EditForm"
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
      const formattedLendersData: LenderTableDataType[] = lendersData.map(
        (lender) => ({
          ...lender,
          id: lender.address,
          status: EditLenderFlowStatuses.OLD,
          prevStatus: EditLenderFlowStatuses.OLD,
          markets: lender.markets?.map((market) => ({
            ...market,
            status: EditLenderFlowStatuses.OLD,
            prevStatus: EditLenderFlowStatuses.OLD,
          })),
        }),
      )

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

  // Filtration settings
  const marketName = urlParams.get("marketName")
  const marketAddress = urlParams.get("marketAddress")
  const lenderAddress = urlParams.get("lenderAddress")

  const selectedMarket = useAppSelector(
    (state) => state.editLendersList.marketFilter,
  )

  useEffect(() => {
    if (marketName && marketAddress) {
      dispatch(setMarketFilter(marketAddress))
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

  const step = useAppSelector((state) => state.editLendersList.step)

  return (
    <Box padding="40px 44px 0 44px" height="100%">
      <Box sx={{ display: "flex", gap: "8px", marginBottom: "25px" }}>
        <Typography variant="title2">
          Editing Lenders List {!isLoading && "for"}
        </Typography>
        {/* TODO: Add Market Selector */}
      </Box>

      <EditForm />
    </Box>
  )
}
