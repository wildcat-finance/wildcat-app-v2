import { JSX, forwardRef, ForwardedRef } from "react"

import {
  Autocomplete,
  Popper,
  TextField,
  PopperProps,
  MenuItem,
  createFilterOptions,
} from "@mui/material"
import Image from "next/image"
import { useTranslation } from "react-i18next"

import { TokenInfo } from "@/app/api/tokens-list/interface"

import { useTokensList } from "./hooks/useTokensList"
import { TokenSelectorProps } from "./interface"

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
  stringify: (option: TokenInfo) =>
    `${option.address}${option.name}${option.symbol}`,
})

export const UnderlyingAssetSelect = forwardRef(
  (
    { error, errorText, handleTokenSelect, onBlur }: TokenSelectorProps,
    ref: ForwardedRef<HTMLInputElement>,
  ) => {
    const { t } = useTranslation()
    const { handleChange, handleSelect, query, setQuery, isLoading, tokens } =
      useTokensList()

    const handleSetToken = (
      event: React.SyntheticEvent,
      selectedToken: TokenInfo | null,
    ) => {
      handleSelect(selectedToken)
      handleTokenSelect(selectedToken)
    }

    return (
      <div>
        <Autocomplete
          PopperComponent={MyPopper}
          filterOptions={filterOptions}
          noOptionsText={
            isLoading
              ? t(
                  "createMarket.forms.marketDescription.block.marketAsset.loading",
                )
              : t(
                  "createMarket.forms.marketDescription.block.marketAsset.dropdownPlaceholder",
                )
          }
          ref={ref}
          onBlur={onBlur}
          renderInput={(params) => (
            <TextField
              {...params}
              value={query}
              onChange={handleChange}
              label={t(
                "createMarket.forms.marketDescription.block.marketAsset.placeholder",
              )}
              error={error}
              helperText={errorText}
            />
          )}
          renderOption={(props, option) => (
            <MenuItem {...props}>
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
          isOptionEqualToValue={(option, val) => option.address === val.address}
          getOptionLabel={(option) => option.name}
          options={tokens}
          popupIcon={null}
          onChange={handleSetToken}
          onInputChange={(event, newInputValue) => {
            setQuery(newInputValue)
          }}
        />
      </div>
    )
  },
)
