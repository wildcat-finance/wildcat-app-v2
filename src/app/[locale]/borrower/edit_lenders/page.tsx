"use client"

import { useEffect, useState } from "react"
import * as React from "react"

import { Box, Button, Skeleton, Typography } from "@mui/material"
import { useSearchParams } from "next/navigation"

import { ConfirmTable } from "@/app/[locale]/borrower/edit_lenders/components/ConfirmTable"
import useTrackLendersChanges from "@/app/[locale]/borrower/edit_lenders/hooks/useTrackLendersChanges"
import { useGetBorrowerMarkets } from "@/app/[locale]/borrower/hooks/getMaketsHooks/useGetBorrowerMarkets"
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

  const { data, isLoading } = useGetBorrowerMarkets()
  const activeMarkets = data
    ?.filter((market) => !market.isClosed)
    .map((market) => ({ name: market.name, address: market.address }))

  const [initialLendersRows] = useState<LenderTableT[]>(
    mockLendersData
      .filter((lender) => lender.isAuthorized)
      .map((lender) => ({
        ...lender,
        status: "old",
        prevStatus: "old",
        id: lender.address,
        markets: lender.markets.map((market) => ({
          ...market,
          status: "old",
          prevStatus: "old",
        })),
      })),
  )

  const [lendersRows, setLendersRows] = useState<LenderTableT[]>(
    mockLendersData
      .filter((lender) => lender.isAuthorized)
      .map((lender) => ({
        ...lender,
        status: "old",
        prevStatus: "old",
        id: lender.address,
        markets: lender.markets.map((market) => ({
          ...market,
          status: "old",
          prevStatus: "old",
        })),
      })),
  )

  const { isLendersHaveChanges, addedOrModifiedLenders } =
    useTrackLendersChanges(initialLendersRows, lendersRows)

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

  return (
    <Box padding="42px 0 0 8.6vw" height="100%">
      <Box
        width="76.84%"
        sx={{ display: "flex", flexDirection: "column", height: "100%" }}
      >
        <Box sx={TitleContainer}>
          <Typography variant="title2">
            {step === "edit"
              ? "Editing Lenders List"
              : "Confirm Lenders List Edits"}
          </Typography>
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
            borrowerMarkets={activeMarkets ?? []}
          />
        )}

        {step === "confirm" && (
          <ConfirmTable
            lendersRows={addedOrModifiedLenders}
            borrowerMarkets={activeMarkets ?? []}
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
              disabled={!isLendersHaveChanges}
            >
              {step === "confirm" ? "Confirm" : "Sumbit"}
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  )
}
