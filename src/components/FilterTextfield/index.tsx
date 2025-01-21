import React, { ChangeEvent, Dispatch, SetStateAction } from "react"

import { IconButton, InputAdornment, SvgIcon, TextField } from "@mui/material"

import Cross from "@/assets/icons/cross_icon.svg"
import Search from "@/assets/icons/search_icon.svg"
import { COLORS } from "@/theme/colors"

export type FilterTextFieldProps = {
  value: string
  setValue: Dispatch<SetStateAction<string>>
  placeholder?: string
  width?: string
}

export const FilterTextField = ({
  value,
  setValue,
  placeholder,
  width,
}: FilterTextFieldProps) => {
  const handleChangeValue = (evt: ChangeEvent<HTMLInputElement>) => {
    setValue(evt.target.value)
  }

  const handleClickErase = (evt: React.MouseEvent) => {
    evt.stopPropagation()
    setValue("")
  }

  return (
    <TextField
      value={value}
      onChange={handleChangeValue}
      size="small"
      placeholder={placeholder || "Search"}
      sx={{
        width: width || "180px",

        "& .MuiInputBase-root": {
          paddingRight: "8px",
        },
      }}
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
        endAdornment: value ? (
          <InputAdornment position="end">
            <IconButton
              onClick={handleClickErase}
              disableRipple
              sx={{
                padding: "0 2px 0 0",
                "& path": {
                  fill: `${COLORS.greySuit}`,
                  transition: "fill 0.2s",
                },
                "& :hover": {
                  "& path": { fill: `${COLORS.santasGrey}` },
                },
              }}
            >
              <SvgIcon fontSize="small">
                <Cross />
              </SvgIcon>
            </IconButton>
          </InputAdornment>
        ) : null,
      }}
    />
  )
}
