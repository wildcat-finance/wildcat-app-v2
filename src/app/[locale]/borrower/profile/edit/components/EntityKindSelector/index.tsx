import { JSX, useMemo } from "react"

import {
  Autocomplete,
  Popper,
  TextField,
  PopperProps,
  MenuItem,
  createFilterOptions,
} from "@mui/material"
import { useTranslation } from "react-i18next"

import ELFsByCountry from "@/config/elfs-by-country.json"

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

type EntityLegalForm = {
  elfCode: string
  countryCode: string
  countryName: string
  subDivisionCode?: string
  subDivisionName?: string
  /**
   * This is the country code of the ELF if it is a federal ELF
   * or the jurisdiction code of the jurisdiction in which the ELF is active
   */
  jurisdictionCode: string
  jurisdictionName: string
  active: boolean
  localName: string
  transliteratedName: string
  localAbbreviations: string[]
  transliteratedAbbreviations: string[]
  languageCode: string
  languageName: string
  name: string
}

type xprops = {
  countryCode?: string
  jurisdictionCode?: string
  handleSelect: (country: EntityLegalForm | null) => void
  value: string | null
  error?: boolean
  helperText?: string
}

const filterOptions = createFilterOptions({
  stringify: (option: EntityLegalForm) =>
    `${option.localAbbreviations.join(", ")} ${option.name}`,
})

export const EntityKindSelector = ({
  handleSelect,
  value,
  countryCode,
  jurisdictionCode,
  error,
  helperText,
}: xprops) => {
  const { t } = useTranslation()

  const handleSetJurisdiction = (
    event: React.SyntheticEvent,
    selectedELF: EntityLegalForm | null,
  ) => {
    handleSelect(selectedELF)
  }

  const options = useMemo(() => {
    if (countryCode && countryCode in ELFsByCountry) {
      const elfs = ELFsByCountry[countryCode as keyof typeof ELFsByCountry]
      if (jurisdictionCode) {
        return elfs
          .filter((elf) => elf.jurisdictionCode === jurisdictionCode)
          .sort((a, b) => a.name.localeCompare(b.name))
      }
      return elfs.sort((a, b) =>
        `${a.jurisdictionCode} ${a.name}`.localeCompare(
          `${b.jurisdictionCode} ${b.name}`,
        ),
      )
    }
    return []
  }, [countryCode, jurisdictionCode])

  const getOptionLabel = (option: EntityLegalForm) => {
    if (!jurisdictionCode) {
      const prefix =
        option.jurisdictionCode === countryCode
          ? `[Federal]`
          : `[${option.jurisdictionName}]`
      return `${prefix} ${option.name}`
    }
    return option.name
  }

  return (
    <div>
      <Autocomplete
        PopperComponent={MyPopper}
        filterOptions={filterOptions}
        noOptionsText={t("borrowerProfile.edit.public.entityKind.noOptions")}
        renderInput={(params) => (
          <TextField
            {...params}
            label={t("borrowerProfile.edit.public.entityKind.title")}
            error={error}
            helperText={helperText}
          />
        )}
        renderOption={({ key, ...props }, option) => (
          <MenuItem key={key} {...props}>
            {getOptionLabel(option)}
          </MenuItem>
        )}
        isOptionEqualToValue={(option, val) => option.elfCode === val?.elfCode}
        getOptionLabel={getOptionLabel}
        options={options}
        popupIcon={null}
        onChange={handleSetJurisdiction}
        value={value ? options.find((c) => c.elfCode === value) : null}
      />
    </div>
  )
}
