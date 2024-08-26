import { ChangeEvent, useState } from "react"

import {
  Box,
  Button,
  FormControl,
  FormControlLabel,
  InputAdornment,
  InputLabel,
  Select,
  SvgIcon,
  TextField,
  Typography,
} from "@mui/material"

import {
  ChipContainer,
  InputLabelStyle,
  MenuStyle,
  SelectStyle,
} from "@/app/[locale]/borrower/edit_lenders/components/MarketSelect/FilterLenderSelect/style"
import { MarketDataT } from "@/app/[locale]/borrower/edit_lenders/lendersMock"
import Filter from "@/assets/icons/filter_icon.svg"
import Icon from "@/assets/icons/search_icon.svg"
import ExtendedCheckbox from "@/components/@extended/ExtendedСheckbox"
import { LendersMarketChip } from "@/components/LendersMarketChip"
import { useAppDispatch } from "@/store/hooks"
import { setMarketFilter } from "@/store/slices/editLendersSlice/editLendersSlice"
import { COLORS } from "@/theme/colors"

import { FilterLenderSelectProps } from "./interface"

export const FilterLenderSelect = ({
  borrowerMarkets,
  selectedMarkets,
}: FilterLenderSelectProps) => {
  const dispatch = useAppDispatch()

  const [marketName, setMarketName] = useState("")
  const allMarketsSelected = selectedMarkets.length === borrowerMarkets.length

  const filteredMarketsByName = borrowerMarkets.filter((market) =>
    market.name.toLowerCase().includes(marketName.toLowerCase()),
  )

  const handleChangeMarketName = (evt: ChangeEvent<HTMLInputElement>) => {
    setMarketName(evt.target.value)
  }

  const handleChangeMarkets = (
    event: React.ChangeEvent<HTMLInputElement>,
    market: MarketDataT,
  ) => {
    if (event.target.checked) {
      dispatch(setMarketFilter([...selectedMarkets, market]))
    } else {
      dispatch(
        setMarketFilter(
          selectedMarkets.filter(
            (selectedItem) => selectedItem.address !== market.address,
          ),
        ),
      )
    }
  }

  const handleToggleAllMarkets = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (event.target.checked) {
      dispatch(setMarketFilter(borrowerMarkets))
    } else {
      dispatch(setMarketFilter([]))
    }
  }

  const handleDeleteMarket = (marketToDelete: string) => {
    dispatch(
      setMarketFilter(
        selectedMarkets.filter(
          (selectedItem) => selectedItem.address !== marketToDelete,
        ),
      ),
    )
  }

  const handleReset = () => {
    dispatch(setMarketFilter([]))
  }

  return (
    <FormControl sx={{ width: "220px" }}>
      <InputLabel sx={InputLabelStyle}>Filter by Markets</InputLabel>

      <Select
        value={selectedMarkets}
        size="small"
        multiple
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
        renderValue={(selected) => (
          <Box sx={ChipContainer}>
            {selected.map((market) => (
              <LendersMarketChip
                key={market.address}
                marketName={market.name}
                withButton
                width={market.name.length > 15 ? "100%" : "fit-content"}
                onClick={() => handleDeleteMarket(market.address)}
              />
            ))}
          </Box>
        )}
        MenuProps={MenuStyle}
        sx={SelectStyle}
      >
        <Box
          sx={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            marginBottom: "16px",
          }}
        >
          <Typography variant="text2">Filter by Markets</Typography>

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

        <Box
          sx={{
            height: "132px",
            overflow: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            padding: "0 10px",
          }}
        >
          <FormControlLabel
            control={
              <ExtendedCheckbox
                checked={allMarketsSelected}
                onChange={handleToggleAllMarkets}
                sx={{
                  "& ::before": {
                    transform: "translate(-3px, -3px) scale(0.75)",
                  },
                }}
              />
            }
            label="All Markets"
          />
          {filteredMarketsByName.map((market) => (
            <FormControlLabel
              key={market.address}
              label={market.name}
              control={
                <ExtendedCheckbox
                  value={market}
                  onChange={(event) => handleChangeMarkets(event, market)}
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
          sx={{ width: "100%", marginTop: "24px" }}
        >
          Reset
        </Button>
      </Select>
    </FormControl>
  )
}
