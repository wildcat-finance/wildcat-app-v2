"use client"

import { JSX } from "react"

import {
  Autocomplete,
  Popper,
  TextField,
  PopperProps,
  MenuItem,
  createFilterOptions,
} from "@mui/material"
import Image from "next/image"

import { TokenInfo } from "@/app/api/tokens-list/interface"

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

const filterOptions = createFilterOptions({
  stringify: (option: TokenInfo) => `${option.address}${option.name}`,
})

export const TokenSelector = () => {
  const { handleChange, handleSelect, query, setQuery, isLoading, tokens } =
    useTokensList()

  return (
    <div>
      <Autocomplete
        PopperComponent={MyPopper}
        filterOptions={filterOptions}
        noOptionsText={isLoading ? "Loading..." : "Enter token name"}
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
            {option.logoURI && (
              <Image
                width={20}
                height={20}
                style={{ marginRight: 10 }}
                src={option.logoURI}
                alt={option.name}
              />
            )}
            {option.name}
          </MenuItem>
        )}
        isOptionEqualToValue={(option, value) =>
          option.address === value.address
        }
        getOptionLabel={(option) => option.name}
        options={tokens}
        popupIcon={null}
        onChange={(event, newValue) => {
          handleSelect(newValue)
        }}
        onInputChange={(event, newInputValue) => {
          setQuery(newInputValue)
        }}
      />
    </div>
  )
}
