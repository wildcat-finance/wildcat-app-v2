import { JSX, forwardRef, ForwardedRef, ChangeEvent } from "react"

import {
  Autocomplete,
  Popper,
  TextField,
  PopperProps,
  MenuItem,
  createFilterOptions,
} from "@mui/material"
import { useTranslation } from "react-i18next"

import countries from "@/config/countries.json"
import { lh, pxToRem } from "@/theme/units"

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
        fontSize: pxToRem(14),
        lineHeight: lh(20, 14),
        fontWeight: 500,
      },
    }}
    placement="bottom-start"
  />
)

type Country = {
  id: string
  name: string
}

const filterOptions = createFilterOptions({
  stringify: (option: Country) => `${option.id} ${option.name}`,
})

type xprops = {
  handleSelect: (country: Country | null) => void
  value: string | null
  error?: boolean
  helperText?: string
  disabled?: boolean
}

export const CountrySelector = ({
  handleSelect,
  value,
  error,
  helperText,
  disabled,
}: xprops) => {
  const { t } = useTranslation()

  const handleSetCountry = (
    event: React.SyntheticEvent,
    selectedCountry: Country | null,
  ) => {
    handleSelect(selectedCountry)
  }

  return (
    <div>
      <Autocomplete
        PopperComponent={MyPopper}
        noOptionsText={t("borrowerProfile.edit.public.country.noOptions")}
        filterOptions={filterOptions}
        disabled={disabled}
        renderInput={(params) => (
          <TextField
            {...params}
            label={t("borrowerProfile.edit.public.country.title")}
            error={error}
            helperText={helperText}
          />
        )}
        renderOption={(props, option) => (
          <MenuItem {...props}>{option.name}</MenuItem>
        )}
        isOptionEqualToValue={(option, val) => option.id === val.id}
        getOptionLabel={(option) => option.name}
        options={countries}
        popupIcon={null}
        onChange={handleSetCountry}
        value={value ? countries.find((c) => c.id === value) : null}
      />
    </div>
  )
}
