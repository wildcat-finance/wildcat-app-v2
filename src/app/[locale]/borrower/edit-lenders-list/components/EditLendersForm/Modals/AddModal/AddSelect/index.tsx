import { ChangeEvent, useRef, useState } from "react"

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

import {
  EditLenderFlowStatuses,
  MarketTableDataType,
} from "@/app/[locale]/borrower/edit-lenders-list/interface"
import Cross from "@/assets/icons/cross_icon.svg"
import Icon from "@/assets/icons/search_icon.svg"
import ExtendedCheckbox from "@/components/@extended/ExtendedСheckbox"
import { LendersMarketChip } from "@/components/LendersMarketChip"
import { useAppSelector } from "@/store/hooks"
import { COLORS } from "@/theme/colors"

import { AddSelectProps } from "./interface"
import {
  ChipBoxStyle,
  DeleteButtonStyle,
  InputLabelStyle,
  MenuStyle,
  PaperContainer,
  SelectStyle,
  VariantsContainer,
} from "./style"

export const AddSelect = ({
  selectedMarkets,
  setSelectedMarkets,
  disabled,
}: AddSelectProps) => {
  const activeBorrowerMarkets = useAppSelector(
    (state) => state.editLendersList.activeBorrowerMarkets,
  )

  const [marketName, setMarketName] = useState("")
  const allMarketsSelected =
    selectedMarkets.length === activeBorrowerMarkets.length

  const filteredMarketsByName = activeBorrowerMarkets.filter((market) =>
    market.name.toLowerCase().includes(marketName.toLowerCase()),
  )

  const handleChangeMarketName = (evt: ChangeEvent<HTMLInputElement>) => {
    setMarketName(evt.target.value)
  }

  const handleChangeMarkets = (
    event: React.ChangeEvent<HTMLInputElement>,
    market: MarketTableDataType,
  ) => {
    if (event.target.checked) {
      setSelectedMarkets((prevItems) => [...prevItems, market])
    } else {
      setSelectedMarkets((prevItems) =>
        prevItems.filter(
          (selectedItem) => selectedItem.address !== market.address,
        ),
      )
    }
  }

  const handleSelectAllMarkets = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (event.target.checked) {
      setSelectedMarkets(
        activeBorrowerMarkets.map((market) => ({
          ...market,
          status: EditLenderFlowStatuses.NEW,
        })),
      )
    } else {
      setSelectedMarkets([])
    }
  }

  const handleDeleteMarket = (marketToDelete: string) => {
    setSelectedMarkets((prevMarkets) =>
      prevMarkets.filter((market) => market.address !== marketToDelete),
    )
  }

  const handleReset = () => {
    setSelectedMarkets([])
  }

  const selectRef = useRef<HTMLElement>(null)

  const onOpen = () => {
    if (selectRef.current) {
      selectRef.current.classList.add("Mui-focused")

      const previousElement = selectRef.current
        .previousSibling as Element | null
      previousElement?.classList.add("Mui-focused")
    }

    setMarketName("")
  }

  const onClose = () => {
    if (selectRef.current) {
      selectRef.current.classList.remove("Mui-focused")

      const previousElement = selectRef.current
        .previousSibling as Element | null
      previousElement?.classList.remove("Mui-focused")
    }
  }

  return (
    <FormControl fullWidth>
      <InputLabel disabled={disabled} sx={InputLabelStyle}>
        Add at least one market
      </InputLabel>

      <Select
        ref={selectRef}
        onOpen={onOpen}
        onClose={onClose}
        sx={SelectStyle}
        multiple
        value={selectedMarkets}
        disabled={disabled}
        endAdornment={
          selectedMarkets.length !== 0 ? (
            <IconButton onClick={handleReset} sx={DeleteButtonStyle}>
              <SvgIcon
                fontSize="small"
                sx={{
                  "& path": {
                    fill: disabled ? COLORS.whiteLilac : COLORS.santasGrey,
                  },
                }}
              >
                <Cross />
              </SvgIcon>
            </IconButton>
          ) : null
        }
        renderValue={(selected) => (
          <Box sx={ChipBoxStyle}>
            {selected.map((market) => (
              <LendersMarketChip
                key={market.address}
                marketName={market.name}
                withButton
                width="fit-content"
                onClick={() => handleDeleteMarket(market.address)}
                type="new"
              />
            ))}
          </Box>
        )}
        MenuProps={MenuStyle}
      >
        <Box sx={PaperContainer}>
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
          <FormControlLabel
            label="All Markets"
            control={
              <ExtendedCheckbox
                onChange={handleSelectAllMarkets}
                checked={allMarketsSelected}
                sx={{
                  "& ::before": {
                    transform: "translate(-3px, -3px) scale(0.75)",
                  },
                }}
              />
            }
          />
          {filteredMarketsByName.map((market) => (
            <FormControlLabel
              key={market.address}
              sx={{ marginLeft: "14px" }}
              label={market.name}
              control={
                <ExtendedCheckbox
                  value={market}
                  onChange={(event) =>
                    handleChangeMarkets(event, {
                      ...market,
                      status: EditLenderFlowStatuses.NEW,
                    })
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
          sx={{ width: "100%", marginTop: "24px" }}
        >
          Reset
        </Button>
      </Select>
    </FormControl>
  )
}
