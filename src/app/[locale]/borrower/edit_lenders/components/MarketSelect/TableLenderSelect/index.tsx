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

import Cross from "@/assets/icons/cross_icon.svg"
import Icon from "@/assets/icons/search_icon.svg"
import ExtendedCheckbox from "@/components/@extended/ExtendedСheckbox"
import { LendersMarketChip } from "@/components/LendersMarketChip"
import { COLORS } from "@/theme/colors"

import { TableLenderSelectProps, MarketTableT } from "./interface"
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
  const [selectedMarkets, setSelectedMarkets] = useState<MarketTableT[]>(
    lenderMarkets.map((market) => ({
      ...market,
      prevStatus: market.status,
    })),
  )

  const [initialMarkets] = useState<MarketTableT[]>(
    lenderMarkets.map((market) => ({
      ...market,
      status: market.status,
    })),
  )

  const [marketName, setMarketName] = useState("")

  const filteredMarketsByName = borrowerMarkets.filter((market) =>
    market.name.toLowerCase().includes(marketName.toLowerCase()),
  )

  const handleChangeMarketName = (evt: ChangeEvent<HTMLInputElement>) => {
    setMarketName(evt.target.value)
  }

  const handleChangeMarkets = (
    event: React.ChangeEvent<HTMLInputElement>,
    market: MarketTableT,
  ) => {
    if (event.target.checked) {
      const initialMarket = initialMarkets.find(
        (m) => m.address === market.address,
      )

      setSelectedMarkets((prevItems) => [
        ...prevItems.filter(
          (prevMarket) => prevMarket.address !== market.address,
        ),
        {
          ...market,
          status: initialMarket ? initialMarket.status : "new",
          prevStatus: initialMarket ? initialMarket.status : "new",
        },
      ])
    } else {
      setSelectedMarkets((prevItems) =>
        prevItems
          .map((prevMarket) =>
            prevMarket.address === market.address
              ? {
                  ...prevMarket,
                  prevStatus: prevMarket.status,
                }
              : prevMarket,
          )
          .filter((prevMarket) => prevMarket.address !== market.address),
      )
    }
  }

  const handleDeleteMarket = (marketToDelete: MarketTableT) => {
    setSelectedMarkets((prevMarkets) =>
      prevMarkets.filter((market) => market.address !== marketToDelete.address),
    )
  }

  const handleReset = () => {
    setSelectedMarkets([])
  }

  useEffect(() => {
    setLendersRows((prev) =>
      prev.map((lender) => {
        if (lender.address === lenderAddress)
          lender.markets = selectedMarkets.map((market) => ({
            name: market.name,
            address: market.address,
            status: market.status,
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
                onClick={() => handleDeleteMarket(market)}
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
                  onChange={(event) =>
                    handleChangeMarkets(event, { ...market, status: "new" })
                  }
                  checked={selectedMarkets.some(
                    (chosenMarket) => chosenMarket.address === market.address,
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
