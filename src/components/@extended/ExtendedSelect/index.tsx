import { Box, FormControl, InputLabel, MenuItem, Select } from "@mui/material"
import SvgIcon from "@mui/material/SvgIcon"

import {
  FormControlContainer,
  SearchIcon,
  SelectContainer,
} from "@/components/@extended/ExtendedSelect/style"
import { ExtendedSelectProps } from "@/components/@extended/ExtendedSelect/type"

import Icon from "../../../assets/icons/search_icon.svg"

export const ExtendedSelect = ({
  label,
  options,
  small,
  selectSX,
  optionSX,
}: ExtendedSelectProps) => {
  switch (small) {
    case false: {
      return (
        <FormControl>
          <InputLabel>{label}</InputLabel>
          <Select sx={selectSX}>
            {options.map((option) => (
              <MenuItem key={option.id} value={option.value} sx={optionSX}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )
    }
    case true: {
      return (
        <Box>
          <FormControl sx={FormControlContainer}>
            <InputLabel sx={SelectContainer}>{label}</InputLabel>
            <SvgIcon fontSize="small" sx={SearchIcon}>
              <Icon />
            </SvgIcon>
            <Select size="small">
              {options.map((option) => (
                <MenuItem key={option.id} value={option.value} sx={optionSX}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )
    }
    default: {
      return (
        <FormControl>
          <InputLabel>{label}</InputLabel>
          <Select sx={selectSX}>
            {options.map((option) => (
              <MenuItem key={option.id} value={option.value} sx={optionSX}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )
    }
  }
}
