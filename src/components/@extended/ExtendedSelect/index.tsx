import {
  Badge,
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from "@mui/material"
import SvgIcon from "@mui/material/SvgIcon"
import { FieldValues, useController } from "react-hook-form"
import { match } from "ts-pattern"

import Icon from "@/assets/icons/search_icon.svg"
import {
  FormControlContainer,
  SearchIcon,
  SelectContainer,
} from "@/components/@extended/ExtendedSelect/style"
import { ExtendedSelectProps } from "@/components/@extended/ExtendedSelect/type"

export const ExtendedSelect = <TFieldValues extends FieldValues = FieldValues>({
  label,
  options,
  small,
  selectSX,
  optionSX,
  badgeSX,
  name,
  control,
  ...rest
}: ExtendedSelectProps<TFieldValues>) => {
  const { field } = useController({ name, control })

  return match(small)
    .with(false || undefined, () => (
      <FormControl>
        <InputLabel>{label}</InputLabel>
        <Select sx={selectSX} {...rest} {...field}>
          {options.map((option) => (
            <MenuItem key={option.id} value={option.value} sx={optionSX}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    ))
    .with(true, () => (
      <Box>
        <FormControl sx={FormControlContainer}>
          <InputLabel sx={SelectContainer}>{label}</InputLabel>
          <SvgIcon fontSize="small" sx={SearchIcon}>
            <Icon />
          </SvgIcon>
          <Select size="small" sx={selectSX} {...rest} {...field}>
            {options.map((option) => (
              <MenuItem key={option.id} value={option.value} sx={optionSX}>
                <Typography variant="text4">{option.label}</Typography>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    ))
    .otherwise(() => null)
}
