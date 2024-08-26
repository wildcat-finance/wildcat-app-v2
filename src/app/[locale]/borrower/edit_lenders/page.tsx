"use client"

import { useEffect, useState } from "react"
import * as React from "react"

import { Box, Button, Skeleton, Typography } from "@mui/material"
import { useSearchParams } from "next/navigation"
import { useAccount } from "wagmi"

import { ConfirmTable } from "@/app/[locale]/borrower/edit_lenders/components/ConfirmTable"
import { useMarketsForBorrower } from "@/app/[locale]/borrower/hooks/useMarketsForBorrower"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  resetEditLendersSlice,
  setEditStep,
  setLenderFilter,
  setMarketFilter,
} from "@/store/slices/editLendersSlice/editLendersSlice"
import { COLORS } from "@/theme/colors"

import { EditLendersForm } from "./components/EditForm"
import { LenderTableT } from "./interface"
import { mockLendersData } from "./lendersMock"
import { AlertContainer, FiltersContainer, TitleContainer } from "./style"

export default function EditLendersPage() {
  const urlParams = useSearchParams()

  const marketName = urlParams.get("marketName")
  const marketAddress = urlParams.get("marketAddress")
  const lenderAddress = urlParams.get("lenderAddress")

  const dispatch = useAppDispatch()
  const step = useAppSelector((state) => state.editLenders.step)

  const handleClickConfirm = () => {
    dispatch(setEditStep("confirm"))
  }

  const handleClickEdit = () => {
    dispatch(setEditStep("edit"))
  }

  const { data: allMarkets, isLoading } = useMarketsForBorrower()
  const { address } = useAccount()
  const activeBorrowerMarkets = allMarkets
    ?.filter(
      (market) =>
        market.borrower.toLowerCase() === address?.toLowerCase() &&
        !market.isClosed,
    )
    .map((market) => ({ name: market.name, address: market.address }))

  const [lendersNames, setLendersNames] = useState<{ [key: string]: string }>(
    (() => {
      const storedNames = JSON.parse(
        localStorage.getItem("lenders-name") || "{}",
      )
      return Object.keys(storedNames).reduce(
        (acc, key) => {
          acc[key.toLowerCase()] = storedNames[key]
          return acc
        },
        {} as { [key: string]: string },
      )
    })(),
  )

  const [lendersRows, setLendersRows] = useState<LenderTableT[]>(
    mockLendersData
      .filter((lender) => lender.isAuthorized)
      .map((lender) => ({
        ...lender,
        status: "old",
        prevStatus: "old",
        id: lender.address,
        name: (() => {
          const correctLender = lendersNames[lender.address.toLowerCase()] || ""
          return { name: correctLender, address: lender.address }
        })(),
        markets: lender.markets.map((market) => ({
          ...market,
          status: "old",
        })),
      })),
  )

  useEffect(() => {
    if (marketName && marketAddress) {
      dispatch(setMarketFilter([{ name: marketName, address: marketAddress }]))
    }
    if (lenderAddress) {
      dispatch(setLenderFilter(lenderAddress))
    }

    return () => {
      dispatch(resetEditLendersSlice())
    }
  }, [])

  const confirmedRows = lendersRows.filter(
    (lender) => !(lender.status === "deleted" && lender.prevStatus === "new"),
  )

  return (
    <Box padding="42px 0 0 8.6vw" height="100%">
      <Box
        width="76.84%"
        sx={{ display: "flex", flexDirection: "column", height: "100%" }}
      >
        <Box sx={TitleContainer}>
          <Typography variant="title2">Editing Lenders List</Typography>
          <Typography variant="text2" color={COLORS.santasGrey}>
            You can edit in both ways by lenders and by filtering markets
          </Typography>
        </Box>

        <Box sx={AlertContainer}>
          <Typography variant="text3" color={COLORS.butteredRum}>
            Please, keep in mind that once you submit this request you will be
            required to pay gas to confirm. So make all changes before
            submitting.
          </Typography>
        </Box>

        {isLoading && (
          <>
            <Box sx={FiltersContainer}>
              <Box display="flex" gap="4px">
                <Skeleton
                  sx={{ bgcolor: COLORS.athensGrey }}
                  width="180px"
                  height="32px"
                />
                <Skeleton
                  sx={{ bgcolor: COLORS.athensGrey }}
                  width="220px"
                  height="32px"
                />
              </Box>
              <Skeleton
                sx={{ bgcolor: COLORS.athensGrey, borderRadius: "8px" }}
                width="98px"
                height="32px"
              />
            </Box>

            <Box
              display="flex"
              flexDirection="column"
              rowGap="8px"
              marginTop="20px"
            >
              <Skeleton
                height="52px"
                width="100%"
                sx={{ bgcolor: COLORS.athensGrey }}
              />
              <Skeleton
                height="52px"
                width="100%"
                sx={{ bgcolor: COLORS.athensGrey }}
              />
              <Skeleton
                height="52px"
                width="100%"
                sx={{ bgcolor: COLORS.athensGrey }}
              />
              <Skeleton
                height="52px"
                width="100%"
                sx={{ bgcolor: COLORS.athensGrey }}
              />
            </Box>
          </>
        )}

        {step === "edit" && !isLoading && (
          <EditLendersForm
            lendersRows={lendersRows}
            setLendersRows={setLendersRows}
            setLendersNames={setLendersNames}
            borrowerMarkets={activeBorrowerMarkets ?? []}
          />
        )}

        {step === "confirm" && (
          <ConfirmTable
            lendersRows={confirmedRows}
            borrowerMarkets={activeBorrowerMarkets ?? []}
          />
        )}

        {!isLoading && (
          <Box
            sx={{
              margin: "auto 0 0 0",
              paddingTop: "20px",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            {step === "confirm" ? (
              <Button
                variant="text"
                size="large"
                sx={{ width: "140px" }}
                onClick={handleClickEdit}
              >
                Back
              </Button>
            ) : (
              <Box />
            )}

            <Button
              variant="contained"
              size="large"
              sx={{ width: "140px" }}
              onClick={handleClickConfirm}
            >
              {step === "confirm" ? "Confirm" : "Sumbit"}
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  )
}
