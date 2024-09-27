import { ChangeEvent, useRef, useState } from "react"
import * as React from "react"

import {
  Box,
  InputAdornment,
  MenuItem,
  Select,
  SelectChangeEvent,
  SvgIcon,
  TextField,
  Typography,
} from "@mui/material"

import Icon from "@/assets/icons/search_icon.svg"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { setMarketFilter } from "@/store/slices/editLendersListSlice/editLendersListSlice"
import { COLORS } from "@/theme/colors"

export const MarketSelect = () => {
  const dispatch = useAppDispatch()

  // Select settings
  const selectRef = useRef<HTMLElement>(null)

  const onOpen = () => {
    if (selectRef.current) {
      selectRef.current.classList.add("Mui-focused")

      const previousElement = selectRef.current
        .previousSibling as Element | null
      previousElement?.classList.add("Mui-focused")
    }
  }

  const onClose = () => {
    if (selectRef.current) {
      selectRef.current.classList.remove("Mui-focused")

      const previousElement = selectRef.current
        .previousSibling as Element | null
      previousElement?.classList.remove("Mui-focused")
    }
  }

  // Getting active borrower markets from the store
  const activeBorrowerMarkets = useAppSelector(
    (state) => state.editLendersList.activeBorrowerMarkets,
  )

  // Filtration settings

  const marketFilter = useAppSelector(
    (state) => state.editLendersList.marketFilter,
  )

  const handleChangeMarket = (event: SelectChangeEvent) => {
    const selectedValue = event.target.value

    if (selectedValue === "All Markets") {
      dispatch(setMarketFilter({ name: "All Markets", address: "0x00" }))
    } else {
      const selectedMarket = activeBorrowerMarkets.find(
        (market) => market.name === selectedValue,
      )
      if (selectedMarket) {
        dispatch(setMarketFilter(selectedMarket))
      }
    }
  }

  const [marketName, setMarketName] = useState("")

  const filteredMarketsByName = activeBorrowerMarkets.filter((market) =>
    market.name.toLowerCase().includes(marketName.toLowerCase()),
  )

  const handleChangeMarketName = (evt: ChangeEvent<HTMLInputElement>) => {
    // evt.stopPropagation()
    setMarketName(evt.target.value)
  }

  return (
    <Select
      ref={selectRef}
      value={marketFilter?.name || ""}
      onOpen={onOpen}
      onClose={onClose}
      onChange={handleChangeMarket}
      displayEmpty
      sx={{
        width: "fit-content !important",
        height: "32px !important",
        minHeight: "32px !important",
        paddingRight: "0px !important",
        border: "none !important",

        "& .MuiSelect-select": {
          padding: "0 !important",
          paddingRight: "35px !important",

          "& .MuiTypography-root": {
            fontSize: "24px",
            lineHeight: "32px",
            fontWeight: 500,

            color:
              marketFilter.name === "All Markets"
                ? COLORS.santasGrey
                : COLORS.ultramarineBlue,
          },
        },
      }}
      MenuProps={{
        sx: {
          "& .MuiPaper-root": {
            width: "360px",
            fontFamily: "inherit",
            padding: "8px",
            backgroundColor: COLORS.cobaltBlack,
          },
        },
        anchorOrigin: {
          vertical: "bottom",
          horizontal: "left",
        },
        transformOrigin: {
          vertical: "top",
          horizontal: "left",
        },
      }}
    >
      <Box>
        <TextField
          onChange={handleChangeMarketName}
          onKeyDown={(e) => e.stopPropagation()}
          fullWidth
          size="small"
          placeholder="Search by Name"
          sx={{
            marginBottom: "8px",

            "& .MuiInputBase-root": {
              color: COLORS.white,
              border: "none",
              borderBottom: `1px solid ${COLORS.white01}`,
              borderRadius: 0,
            },

            "& .MuiFormLabel-root": {
              color: COLORS.white03,
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SvgIcon
                  fontSize="small"
                  sx={{
                    width: "20px",
                    "& path": { fill: `${COLORS.white03}` },
                  }}
                >
                  <Icon />
                </SvgIcon>
              </InputAdornment>
            ),
          }}
        />
      </Box>
      <MenuItem
        value="All Markets"
        sx={{
          "&:hover": {
            background: COLORS.white01,
          },
          "&.Mui-focusVisible": {
            background: COLORS.white01,
          },
          "&.Mui-selected": {
            background: "transparent",
            color: COLORS.santasGrey,
            "&:hover": {
              background: "transparent",
              cursor: "pointer",
            },
            "&.Mui-focusVisible": {
              background: "transparent",
            },
          },
        }}
      >
        <Typography variant="text3" color={COLORS.white}>
          All Markets
        </Typography>
      </MenuItem>
      {filteredMarketsByName.map((market) => (
        <MenuItem
          key={market.address}
          value={market.name}
          sx={{
            "&:hover": {
              background: COLORS.white01,
            },
            "&.Mui-focusVisible": {
              background: COLORS.white01,
            },
            "&.Mui-selected": {
              background: "transparent",
              color: COLORS.santasGrey,
              "&:hover": {
                background: "transparent",
                cursor: "pointer",
              },
              "&.Mui-focusVisible": {
                background: "transparent",
              },
            },
          }}
        >
          <Typography variant="text3" color={COLORS.white}>
            {market.name}
          </Typography>
        </MenuItem>
      ))}
    </Select>
  )
}
