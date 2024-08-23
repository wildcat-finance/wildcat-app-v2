"use client"

import { ChangeEvent, useState } from "react"

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
import Search from "@/assets/icons/search_icon.svg"
import { COLORS } from "@/theme/colors"

import { EditLendersTable } from "./components/EditLendersTable"
import { FilterLenderSelect } from "./components/MarketSelect/FilterLenderSelect"
import { AddLenderModal } from "./components/Modals/AddLender"
import { LenderTableT } from "./interface"
import { MarketDataT, mockLendersData } from "./lendersMock"
import {
  AlertContainer,
  FiltersContainer,
  SearchStyles,
  TitleContainer,
} from "./style"

export default function EditLendersPage() {
  const [selectedMarkets, setSelectedMarkets] = useState<MarketDataT[]>([])

  const { data: allMarkets } = useMarketsForBorrower()
  const { address } = useAccount()
  const activeBorrowerMarkets = allMarkets
    ?.filter(
      (market) =>
        market.borrower.toLowerCase() === address?.toLowerCase() &&
        !market.isClosed,
    )
    .map((market) => ({ name: market.name, address: market.address }))

  const [lenderNameOrAddress, setLenderNameOrAddress] = useState("")

  const handleChangeLender = (evt: ChangeEvent<HTMLInputElement>) => {
    setLenderNameOrAddress(evt.target.value)
  }

  const [lendersNames, setLendersNames] = useState<{ [key: string]: string }>(
    JSON.parse(localStorage.getItem("lenders-name") || "{}"),
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

  console.log("Edited Lenders Data", lendersRows)

  const filteredLenders = lendersRows.filter((lender) => {
    const matchesAllMarkets =
      selectedMarkets.length === 0 ||
      selectedMarkets.every((selectedMarket) =>
        lender.markets.some(
          (lenderMarket) => lenderMarket.address === selectedMarket.address,
        ),
      )

    const matchesSearchTerm =
      lenderNameOrAddress === "" ||
      lender.name.name
        .toLowerCase()
        .includes(lenderNameOrAddress.toLowerCase()) ||
      lender.address.toLowerCase().includes(lenderNameOrAddress.toLowerCase())

    return matchesAllMarkets && matchesSearchTerm
  })

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

        <Box sx={FiltersContainer}>
          <Box display="flex" gap="4px">
            <TextField
              onChange={handleChangeLender}
              size="small"
              placeholder="Search"
              sx={SearchStyles}
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
                      <Search />
                    </SvgIcon>
                  </InputAdornment>
                ),
              }}
            />

            <FilterLenderSelect
              borrowerMarkets={activeBorrowerMarkets ?? []}
              selectedMarkets={selectedMarkets}
              setSelectedMarkets={setSelectedMarkets}
            />
          </Box>

          <AddLenderModal
            setLendersRows={setLendersRows}
            setLendersNames={setLendersNames}
            borrowerMarkets={activeBorrowerMarkets ?? []}
          />
        </Box>

        <EditLendersTable
          lendersRows={filteredLenders}
          setLendersRows={setLendersRows}
          setLendersNames={setLendersNames}
          borrowerMarkets={activeBorrowerMarkets ?? []}
        />

        <Box
          sx={{
            margin: "auto 0 0 0",
            paddingTop: "20px",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          {/* <Button variant="contained" size="large" sx={{ width: "140px" }}> */}
          {/*  Sumbit */}
          {/* </Button> */}

          <Box />

          <Button variant="contained" size="large" sx={{ width: "140px" }}>
            Sumbit
          </Button>
        </Box>
      </Box>
    </Box>
  )
}
