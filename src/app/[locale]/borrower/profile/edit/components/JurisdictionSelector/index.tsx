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

type Jurisdiction = {
  id: string
  name: string
  label: string
}
const filterOptions = createFilterOptions({
  stringify: (option: Jurisdiction) => `${option.label} ${option.id}`,
})

type xprops = {
  handleSelect: (country: Jurisdiction | null) => void
  value: string | null
  options: Jurisdiction[]
  error?: boolean
  helperText?: string
  disabled?: boolean
}

export const JurisdictionSelector = ({
  handleSelect,
  value,
  options,
  error,
  helperText,
  disabled,
}: xprops) => {
  const { t } = useTranslation()

  const handleSetJurisdiction = (
    event: React.SyntheticEvent,
    selectedJurisdiction: Jurisdiction | null,
  ) => {
    handleSelect(selectedJurisdiction)
  }

  return (
    <div>
      <Autocomplete
        disabled={disabled}
        filterOptions={filterOptions}
        PopperComponent={MyPopper}
        noOptionsText={t("borrowerProfile.edit.public.jurisdiction.noOptions")}
        renderInput={(params) => (
          <TextField
            {...params}
            label={t("borrowerProfile.edit.public.jurisdiction.title")}
            error={error}
            helperText={helperText}
          />
        )}
        renderOption={(props, option) => (
          <MenuItem {...props}>{option.label}</MenuItem>
        )}
        isOptionEqualToValue={(option, val) => option.id === val.id}
        getOptionLabel={(option) => option.label}
        options={options}
        popupIcon={null}
        onChange={handleSetJurisdiction}
        value={value ? options.find((c) => c.id === value) : null}
      />
    </div>
  )
}
