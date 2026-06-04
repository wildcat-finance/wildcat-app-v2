"use client"

import { useRef } from "react"

import { MenuItem, Select, SelectChangeEvent, Typography } from "@mui/material"

import {
  MarketSelectMenuItemStyles,
  MarketSelectMenuStyles,
} from "@/app/[locale]/borrower/edit-lenders-list/components/MarketSelect/style"
import { COLORS } from "@/theme/colors"
import { lh, pxToRem } from "@/theme/units"

type TopMarketSectionSelectProps = {
  options: string[]
  value: string
  onChange: (value: string) => void
}

export const TopMarketSectionSelect = ({
  options,
  value,
  onChange,
}: TopMarketSectionSelectProps) => {
  const selectRef = useRef<HTMLElement>(null)

  const handleChange = (event: SelectChangeEvent) => {
    onChange(event.target.value)
  }

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

  return (
    <Select
      ref={selectRef}
      value={value}
      onOpen={onOpen}
      onClose={onClose}
      onChange={handleChange}
      displayEmpty
      renderValue={(val) => (
        <Typography variant="text3" sx={{ color: COLORS.blackRock }}>
          {val}
        </Typography>
      )}
      sx={{
        width: "fit-content !important",
        height: "32px !important",
        minHeight: "32px !important",
        paddingRight: "0px !important",
        backgroundColor: "transparent !important",
        border: "1px solid transparent !important",
        borderRadius: "8px !important",
        transition: "background-color 0.15s ease, border-color 0.15s ease",

        "& .MuiSelect-select": {
          padding: "0 !important",
          paddingLeft: "8px !important",
          paddingRight: "30px !important",

          "& .MuiTypography-root": {
            fontSize: pxToRem(20),
            lineHeight: lh(32, 20),
            fontWeight: 500,
          },
        },
        "& .MuiSelect-icon": {
          top: "calc(50% - 10px)",
          right: "4px",
          opacity: 0.6,
          transition: "opacity 0.15s ease",
          "& path": {
            fill: COLORS.blackRock,
          },
        },

        "&:hover, &.Mui-focused": {
          backgroundColor: `${COLORS.blackHaze} !important`,
          borderColor: `${COLORS.athensGrey} !important`,

          "& .MuiSelect-select": {
            paddingLeft: "8px !important",
          },
          "& .MuiSelect-icon": {
            opacity: "1 !important",
          },
        },
      }}
      MenuProps={{
        sx: MarketSelectMenuStyles,
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
      {options.map((option) => (
        <MenuItem key={option} value={option} sx={MarketSelectMenuItemStyles}>
          <Typography variant="text3" color={COLORS.white}>
            {option}
          </Typography>
        </MenuItem>
      ))}
    </Select>
  )
}
