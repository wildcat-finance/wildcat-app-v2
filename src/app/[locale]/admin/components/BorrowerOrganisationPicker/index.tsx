"use client"

import { JSX } from "react"

import {
  Autocomplete,
  createFilterOptions,
  MenuItem,
  Popper,
  PopperProps,
  SxProps,
  TextField,
  Theme,
} from "@mui/material"
import { useTranslation } from "react-i18next"

import { BorrowerOrganisation } from "@/app/api/borrowers/interface"
import DownArrow from "@/assets/icons/downArrow20_icon.svg"
import { lh, pxToRem } from "@/theme/units"

import {
  BorrowerOrganisationOption,
  getOrganisationLabel,
} from "../BorrowerOrganisationOption"

const PickerPopper = (props: JSX.IntrinsicAttributes & PopperProps) => (
  <Popper
    {...props}
    sx={{
      "& .MuiAutocomplete-listbox": { padding: 0, margin: 0 },
      "& .MuiPaper-root": {
        fontFamily: "inherit",
        padding: "8px",
        marginTop: "2px",
      },
      "& .MuiAutocomplete-noOptions, & .MuiAutocomplete-loading": {
        padding: "6px 12px",
        fontSize: pxToRem(14),
        lineHeight: lh(20, 14),
        fontWeight: 500,
      },
    }}
    placement="bottom-start"
  />
)

/// What a search looks through: the name, the alias and every wallet
/// address, so an admin can type part of a name or paste a wallet.
export const getOrganisationSearchText = (organisation: BorrowerOrganisation) =>
  [
    organisation.name,
    organisation.alias ?? "",
    ...organisation.registrations.map(({ address }) => address),
  ].join(" ")

const filterOptions = createFilterOptions<BorrowerOrganisation>({
  stringify: getOrganisationSearchText,
  trim: true,
})

/// Pick a borrowing organisation by typing: the list narrows to those whose
/// name, alias or wallet contains what is typed, and Enter takes the first.
export const BorrowerOrganisationPicker = ({
  organisations,
  value,
  onChange,
  label,
  sx,
}: {
  organisations: BorrowerOrganisation[] | undefined
  /* The chosen organisation's id, or "" for none */
  value: string
  onChange: (id: string) => void
  label: string
  sx?: SxProps<Theme>
}) => {
  const { t } = useTranslation()
  const options = organisations ?? []
  return (
    <Autocomplete
      options={options}
      value={options.find(({ id }) => id === value) ?? null}
      onChange={(_, organisation) => onChange(organisation?.id ?? "")}
      getOptionLabel={getOrganisationLabel}
      isOptionEqualToValue={(option, chosen) => option.id === chosen.id}
      filterOptions={filterOptions}
      renderOption={(props, organisation) => (
        <MenuItem {...props} key={organisation.id}>
          <BorrowerOrganisationOption organisation={organisation} />
        </MenuItem>
      )}
      renderInput={(params) => <TextField {...params} label={label} />}
      loading={!organisations}
      loadingText={t("admin.borrowerPicker.loading")}
      noOptionsText={t("admin.borrowerPicker.noMatch")}
      autoHighlight
      openOnFocus
      popupIcon={<DownArrow />}
      PopperComponent={PickerPopper}
      ListboxProps={{ style: { maxHeight: "360px" } }}
      sx={sx}
    />
  )
}
