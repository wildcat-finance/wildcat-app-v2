import { Box, FormControl, InputLabel, Select } from "@mui/material"
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
  children,
  small,
}: ExtendedSelectProps) => {
  switch (small) {
    case false: {
      return (
        <FormControl>
          <InputLabel>{label}</InputLabel>
          <Select>{children}</Select>
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
            <Select size="small">{children}</Select>
          </FormControl>
        </Box>
      )
    }
    default: {
      return (
        <FormControl>
          <InputLabel>{label}</InputLabel>
          <Select>{children}</Select>
        </FormControl>
      )
    }
  }
}
