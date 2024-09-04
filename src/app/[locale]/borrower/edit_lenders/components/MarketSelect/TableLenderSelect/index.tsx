import { ChangeEvent, useEffect, useState } from "react"

import {
  Box,
  Button,
  FormControl,
  FormControlLabel,
  IconButton,
  InputAdornment,
  InputLabel,
  Select,
  SvgIcon,
  TextField,
} from "@mui/material"

import { MarketTableT } from "@/app/[locale]/borrower/edit_lenders/interface"
import { MarketDataT } from "@/app/[locale]/borrower/edit_lenders/lendersMock"
import Cross from "@/assets/icons/cross_icon.svg"
import Icon from "@/assets/icons/search_icon.svg"
import ExtendedCheckbox from "@/components/@extended/ExtendedСheckbox"
import { LendersMarketChip } from "@/components/LendersMarketChip"
import { COLORS } from "@/theme/colors"

import { TableLenderSelectProps } from "./interface"
import {
  ChipContainer,
  DeleteButtonStyle,
  InputLabelStyle,
  MenuBox,
  MenuStyle,
  SelectStyle,
  VariantsContainer,
} from "./style"

export const TableLenderSelect = ({
  borrowerMarkets,
  lenderMarkets,
  lenderAddress,
  setLendersRows,
  disabled,
}: TableLenderSelectProps) => {
  const [selectedMarkets, setSelectedMarkets] =
    useState<MarketTableT[]>(lenderMarkets)

  const [initialMarkets] = useState<MarketTableT[]>(lenderMarkets)

  const [marketName, setMarketName] = useState("")

  const filteredMarketsByName = borrowerMarkets.filter((market) =>
    market.name.toLowerCase().includes(marketName.toLowerCase()),
  )

  const handleChangeMarketName = (evt: ChangeEvent<HTMLInputElement>) => {
    setMarketName(evt.target.value)
  }

  const getInitialMarket = (market: MarketDataT) =>
    initialMarkets.find((m) => m.address === market.address)

  const handleChangeMarkets = (
    event: React.ChangeEvent<HTMLInputElement>,
    market: MarketDataT,
  ) => {
    const initialMarket = getInitialMarket(market)
    const isMarketOld = initialMarket?.status === "old"

    if (event.target.checked) {
      setSelectedMarkets((prevItems) => [
        ...prevItems.filter(
          (prevMarket) => prevMarket.address !== market.address,
        ),
        {
          ...market,
          status: isMarketOld ? initialMarket.status : "new",
          prevStatus: isMarketOld ? initialMarket.prevStatus : "new",
        },
      ])
    } else {
      setSelectedMarkets((prevMarkets) =>
        prevMarkets.reduce((acc, m) => {
          if (m.address === market.address) {
            if (isMarketOld) {
              acc.push({
                ...m,
                prevStatus: "old",
                status: "deleted",
              })
            }
          } else {
            acc.push(m)
          }
          return acc
        }, [] as MarketTableT[]),
      )
    }
  }

  const handleDeleteMarket = (marketToDelete: MarketTableT) => {
    const initialMarket = getInitialMarket(marketToDelete)
    const isMarketOld = initialMarket?.status === "old"

    setSelectedMarkets((prevMarkets) =>
      prevMarkets.reduce((acc, market) => {
        if (market.address === marketToDelete.address) {
          if (isMarketOld) {
            acc.push({
              ...market,
              prevStatus: "old",
              status: "deleted",
            })
          }
        } else {
          acc.push(market)
        }
        return acc
      }, [] as MarketTableT[]),
    )
  }

  const restorePreviousStatus = (marketToRestore: MarketTableT) => {
    setSelectedMarkets((prevMarkets) =>
      prevMarkets.map((market) =>
        market.address === marketToRestore.address
          ? {
              ...market,
              status: market.prevStatus,
            }
          : market,
      ),
    )
  }

  const handleReset = () => {
    setSelectedMarkets((prevMarkets) =>
      prevMarkets.reduce((acc, market) => {
        if (market.status === "old") {
          acc.push({
            ...market,
            prevStatus: market.status,
            status: "deleted",
          })
        }
        return acc
      }, [] as MarketTableT[]),
    )
  }

  useEffect(() => {
    setLendersRows((prev) =>
      prev.map((lender) => {
        if (lender.address === lenderAddress)
          lender.markets = selectedMarkets.map((market) => ({
            name: market.name,
            address: market.address,
            status: market.status,
            prevStatus: market.prevStatus,
          }))
        return lender
      }),
    )
  }, [selectedMarkets])

  return (
    <FormControl fullWidth>
      <InputLabel sx={InputLabelStyle}>Add market</InputLabel>

      <Select
        disabled={disabled}
        value={selectedMarkets}
        size="small"
        multiple
        sx={SelectStyle}
        endAdornment={
          <IconButton onClick={handleReset} sx={DeleteButtonStyle}>
            <SvgIcon
              fontSize="small"
              sx={{
                "& path": { fill: `${COLORS.santasGrey}` },
              }}
            >
              <Cross />
            </SvgIcon>
          </IconButton>
        }
        renderValue={(selected) => (
          <Box sx={ChipContainer}>
            {selected.map((market) => (
              <LendersMarketChip
                key={market.address}
                marketName={market.name}
                withButton
                width="fit-content"
                onClick={() =>
                  market.status === "deleted"
                    ? restorePreviousStatus(market)
                    : handleDeleteMarket(market)
                }
                type={market.status}
              />
            ))}
          </Box>
        )}
        MenuProps={MenuStyle}
      >
        <Box sx={MenuBox}>
          <TextField
            onChange={handleChangeMarketName}
            fullWidth
            size="small"
            placeholder="Search by Name"
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
        </Box>

        <Box sx={VariantsContainer}>
          {filteredMarketsByName.map((market) => (
            <FormControlLabel
              key={market.address}
              label={market.name}
              control={
                <ExtendedCheckbox
                  value={market}
                  onChange={(event) => handleChangeMarkets(event, market)}
                  checked={selectedMarkets.some(
                    (chosenMarket) =>
                      chosenMarket.address === market.address &&
                      chosenMarket.status !== "deleted",
                  )}
                  sx={{
                    "& ::before": {
                      transform: "translate(-3px, -3px) scale(0.75)",
                    },
                  }}
                />
              }
            />
          ))}
        </Box>

        <Button
          onClick={handleReset}
          size="medium"
          variant="contained"
          color="secondary"
          sx={{ width: "100%" }}
        >
          Reset
        </Button>
      </Select>
    </FormControl>
  )
}
