"use client"

import { JSX } from "react"

import {
  Autocomplete,
  Popper,
  TextField,
  PopperProps,
  MenuItem,
} from "@mui/material"

import { useTokensList } from "./hooks/useTokensList"

const MyPopper = (props: JSX.IntrinsicAttributes & PopperProps) => (
  <Popper
    {...props}
    sx={{
      "& .MuiAutocomplete-listbox": {
        padding: 0,
        margin: 0,
      },
      "& .MuiPaper-root": {
        fontFamily: "inherit",
        padding: "8px",
        marginTop: "2px",
        maxHeight: "300px",
      },
      "& .MuiAutocomplete-noOptions": {
        padding: "6px 12px",
        fontSize: 14,
        fontWeight: 500,
        lineHeight: "20px",
      },
    }}
    placement="bottom-start"
  />
)

export const TokenSelector = () => {
  const { handleChange, query, tokens, isLoading } = useTokensList()

  console.log(query, "query")

  return (
    <div>
      <Autocomplete
        PopperComponent={MyPopper}
        noOptionsText={
          isLoading
            ? "Loading..."
            : "Enter the first three letters of the asset"
        }
        renderInput={(params) => (
          <TextField
            {...params}
            value={query}
            onChange={handleChange}
            label="Search name or paste address"
          />
        )}
        renderOption={(props, option) => (
          <MenuItem key={option.address} {...props}>
            {`${option.name}`}
          </MenuItem>
        )}
        isOptionEqualToValue={(option, value) =>
          option.address === value.address
        }
        getOptionLabel={(option) => `${option.name}`}
        options={tokens}
        popupIcon={null}
      />
    </div>
  )
}
