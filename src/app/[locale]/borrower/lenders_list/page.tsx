"use client"

import { useState } from "react"

import {
  Box,
  Button,
  InputAdornment,
  SvgIcon,
  TextField,
  Typography,
} from "@mui/material"
import { useAccount } from "wagmi"

import { useMarketsForBorrower } from "@/app/[locale]/borrower/hooks/useMarketsForBorrower"
import { MarketSelect } from "@/app/[locale]/borrower/lenders_list/components/MarketSelect"
import Icon from "@/assets/icons/search_icon.svg"
import { mockLendersData } from "@/mocks/mocks"
import { COLORS } from "@/theme/colors"

import { EditLendersTable } from "./components/EditLendersTable"

export default function LenderList() {
  const { data: allMarkets, isLoading } = useMarketsForBorrower()
  const { address, isConnected } = useAccount()
  const activeBorrowerMarketsNames = allMarkets
    ?.filter(
      (market) =>
        market.borrower.toLowerCase() === address?.toLowerCase() &&
        !market.isClosed,
    )
    .map((market) => market.name)

  const [chosenMarkets, setChosenMarkets] = useState<string[]>([])

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setChosenMarkets((prevItems) => [...prevItems, event.target.value])
    } else {
      setChosenMarkets((prevItems) =>
        prevItems.filter((selectedItem) => selectedItem !== event.target.value),
      )
    }
  }

  const handleDeleteMarket = (marketToDelete: string) => {
    setChosenMarkets((prevMarkets) =>
      prevMarkets.filter((market) => market !== marketToDelete),
    )
  }

  const handleReset = () => {
    setChosenMarkets([])
  }

  const [lendersName, setLendersName] = useState<{ [key: string]: string }>(
    JSON.parse(localStorage.getItem("lenders-name") || "{}"),
  )

  const [rows, setRows] = useState(
    mockLendersData.map((item) => ({
      ...item,
      status: "old",
      id: item.address,
      name: (() => {
        const correctLender = lendersName[item.address.toLowerCase()] || ""
        return { name: correctLender, address: item.address }
      })(),
    })),
  )

  return (
    <Box sx={{ padding: "42px 0 0 8.6vw" }}>
      <Box width="76.84%">
        <Box sx={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <Typography variant="title2">Editing Lenders List</Typography>
          <Typography variant="text2" color={COLORS.santasGrey}>
            You can edit in both ways by lenders and by filtering markets
          </Typography>
        </Box>

        <Box
          sx={{
            backgroundColor: COLORS.oasis,
            padding: "8px 16px",
            borderRadius: "12px",
            marginTop: "25px",
          }}
        >
          <Typography variant="text3" color={COLORS.butteredRum}>
            Please, keep in mind that once you submit this request you will be
            required to pay gas to confirm. So make all changes before
            submitting.
          </Typography>
        </Box>

        {activeBorrowerMarketsNames && (
          <>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: "25px",
              }}
            >
              <Box>
                <TextField
                  size="small"
                  placeholder="Search by Name"
                  sx={{ width: "180px", marginRight: "6px" }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SvgIcon
                          fontSize="small"
                          sx={{
                            width: "20px",
                            "& path": { fill: `${COLORS.greySuit}` },
                          }}
                        >
                          <Icon />
                        </SvgIcon>
                      </InputAdornment>
                    ),
                  }}
                />

                <MarketSelect
                  chosenMarkets={chosenMarkets}
                  borrowerMarkets={activeBorrowerMarketsNames}
                  handleChange={handleChange}
                  handleDelete={handleDeleteMarket}
                  handleReset={handleReset}
                />
              </Box>
              <Button
                size="small"
                variant="contained"
                sx={{ width: "98px", justifyContent: "space-between" }}
                onClick={() => {
                  setRows((prev) => [
                    ...prev,
                    {
                      id: "0x5F55005B15B9E00Ec52528fe672eb30f450151F6",
                      isAuth: false,
                      name: {
                        name: "",
                        address: "0x5F55005B15B9E00Ec52528fe672eb30f450151F6",
                      },
                      address: "0x5F55005B15B9E00Ec52528fe672eb30f450151F6",
                      markets: [
                        {
                          marketName: "Test Market 3",
                          address: "0xaedfd7255f30b651c687831b47d73b179a8adc89",
                        },
                      ],
                      status: "new",
                    },
                    {
                      id: "0x5F55005B15B9E00Ec52528fe672eb30f450151F7",
                      isAuth: false,
                      name: {
                        name: "",
                        address: "0x5F55005B15B9E00Ec52528fe672eb30f450151F7",
                      },
                      address: "0x5F55005B15B9E00Ec52528fe672eb30f450151F7",
                      markets: [
                        {
                          marketName: "Test Market 4",
                          address: "0xaedfd7255f30b651c687831b47d73b179a8adc89",
                        },
                      ],
                      status: "remove",
                    },
                  ])
                }}
              >
                <Typography
                  variant="text3"
                  color="white"
                  sx={{ position: "relative", bottom: "1px" }}
                >
                  +
                </Typography>
                Add Lender
              </Button>
            </Box>

            <Box sx={{ marginTop: "10px" }}>
              <EditLendersTable
                rows={rows}
                setRows={setRows}
                setLendersName={setLendersName}
              />
            </Box>
          </>
        )}
      </Box>
    </Box>
  )
}
