"use client"

import { useState } from "react"

import {
  Box,
  Button,
  FormControl,
  FormControlLabel,
  InputAdornment,
  InputLabel,
  ListItemText,
  MenuItem,
  Select,
  SelectChangeEvent,
  SvgIcon,
  TextField,
  Typography,
} from "@mui/material"
import { Market } from "@wildcatfi/wildcat-sdk"
import { useAccount } from "wagmi"

import { useMarketsForBorrower } from "@/app/[locale]/borrower/hooks/useMarketsForBorrower"
import Filter from "@/assets/icons/filter_icon.svg"
import Icon from "@/assets/icons/search_icon.svg"
import ExtendedCheckbox from "@/components/@extended/ExtendedСheckbox"
import { LendersMarketChip } from "@/components/LendersMarketChip"
import { COLORS } from "@/theme/colors"

export default function LenderList() {
  const { data: allMarkets, isLoading } = useMarketsForBorrower()
  const { address, isConnected } = useAccount()
  const activeBorrowerMarkets = allMarkets?.filter(
    (market) =>
      market.borrower.toLowerCase() === address?.toLowerCase() &&
      !market.isClosed,
  )

  const [chosenMarkets, setChosenMarkets] = useState<string[]>([])

  console.log(chosenMarkets, "chosenMarkets")

  const handleChange = (event: SelectChangeEvent<typeof chosenMarkets>) => {
    const {
      target: { value },
    } = event
    setChosenMarkets(
      // On autofill, we get a stringified value.
      typeof value === "string" ? value.split(",") : value,
    )
  }

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

            <FormControl>
              <InputLabel
                sx={{
                  fontSize: 13,
                  fontWeight: 500,
                  lineHeight: "20px",
                  color: COLORS.santasGrey,
                  transform: "translate(33px, 6px) scale(1)",

                  pointerEvents: "none",

                  "&.MuiInputLabel-shrink": {
                    display: "block",

                    "&.Mui-focused": {
                      display: "none",
                    },
                  },

                  "&.MuiFormLabel-filled": {
                    display: "none",
                  },
                }}
              >
                Filter by Markets
              </InputLabel>
              {activeBorrowerMarkets && (
                <Select
                  value={chosenMarkets}
                  onChange={handleChange}
                  renderValue={(selected) => (
                    <Box sx={{ display: "flex", gap: 0.5 }}>
                      {selected.map((value) => (
                        <LendersMarketChip
                          key={value}
                          marketName={value}
                          withButton
                        />
                      ))}
                    </Box>
                  )}
                  size="small"
                  startAdornment={
                    <SvgIcon
                      fontSize="big"
                      sx={{
                        "& path": { stroke: `${COLORS.greySuit}` },
                      }}
                    >
                      <Filter />
                    </SvgIcon>
                  }
                  sx={{
                    width: "180px",
                    "& .MuiSelect-icon": {
                      display: "block",
                      top: "5px",
                      transform: "translate(3.5px, 0px) scale(0.7)",
                      "&.MuiSelect-iconOpen": {
                        transform:
                          "translate(3.5px, 0px) scale(0.7) rotate(180deg)",
                      },

                      "& path": { fill: `${COLORS.santasGrey}` },
                    },
                  }}
                  multiple
                >
                  {/* <Box */}
                  {/*  sx={{ */}
                  {/*    display: "flex", */}
                  {/*    flexDirection: "column", */}
                  {/*    justifyContent: "flex-start", */}
                  {/*    gap: "12px", */}
                  {/*  }} */}
                  {/* > */}
                  {/*  <Typography variant="text2">Filter by Markets</Typography> */}
                  {/*  <TextField */}
                  {/*    size="small" */}
                  {/*    placeholder="Search by Name" */}
                  {/*    sx={{ width: "258px" }} */}
                  {/*    InputProps={{ */}
                  {/*      startAdornment: ( */}
                  {/*        <InputAdornment position="start"> */}
                  {/*          <SvgIcon */}
                  {/*            fontSize="small" */}
                  {/*            sx={{ */}
                  {/*              width: "20px", */}
                  {/*              "& path": { fill: `${COLORS.greySuit}` }, */}
                  {/*            }} */}
                  {/*          > */}
                  {/*            <Icon /> */}
                  {/*          </SvgIcon> */}
                  {/*        </InputAdornment> */}
                  {/*      ), */}
                  {/*    }} */}
                  {/*  /> */}
                  {/* </Box> */}
                  {activeBorrowerMarkets.map((market) => (
                    <MenuItem key={market.address} value={market.name}>
                      {/* <ExtendedCheckbox */}
                      {/*  checked={chosenMarkets.indexOf(market) > -1} */}
                      {/*  sx={{ */}
                      {/*    "& ::before": { */}
                      {/*      transform: "translate(-3px, -3px) scale(0.75)", */}
                      {/*    }, */}
                      {/*  }} */}
                      {/* /> */}
                      {/* <ListItemText primary= /> */}
                      {market.name}
                    </MenuItem>
                  ))}
                </Select>
              )}
            </FormControl>
          </Box>

          <Button
            size="small"
            variant="contained"
            sx={{ width: "98px", justifyContent: "space-between" }}
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
      </Box>
    </Box>
  )
}
