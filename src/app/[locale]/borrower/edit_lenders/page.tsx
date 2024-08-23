"use client"

import { useState } from "react"

import { Box, Button, Typography } from "@mui/material"
import { useAccount } from "wagmi"

import { ConfirmTable } from "@/app/[locale]/borrower/edit_lenders/components/ConfirmTable"
import { useMarketsForBorrower } from "@/app/[locale]/borrower/hooks/useMarketsForBorrower"
import { COLORS } from "@/theme/colors"

import { EditLendersForm } from "./components/EditForm"
import { LenderTableT } from "./interface"
import { mockLendersData } from "./lendersMock"
import { AlertContainer, TitleContainer } from "./style"

export default function EditLendersPage() {
  const [step, setStep] = useState<"edit" | "confirm">("edit")

  const handleClickSumbit = () => {
    setStep("confirm")
  }

  const handleClickBack = () => {
    setStep("edit")
  }

  const { data: allMarkets } = useMarketsForBorrower()
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

        {step === "edit" && (
          <EditLendersForm
            lendersRows={lendersRows}
            setLendersRows={setLendersRows}
            setLendersNames={setLendersNames}
            borrowerMarkets={activeBorrowerMarkets ?? []}
          />
        )}

        {step === "confirm" && (
          <ConfirmTable
            lendersRows={lendersRows}
            borrowerMarkets={activeBorrowerMarkets ?? []}
          />
        )}

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
              onClick={handleClickBack}
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
            onClick={handleClickSumbit}
          >
            {step === "confirm" ? "Confirm" : "Sumbit"}
          </Button>
        </Box>
      </Box>
    </Box>
  )
}
