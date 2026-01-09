import { Box, FormControlLabel, Typography } from "@mui/material"
import { FieldValues, useController } from "react-hook-form"

import {
  InputLabelContainer,
  InputLabelSubtitle,
  InputLabelTypo,
} from "@/components/InputLabel/style"
import { StyledSwitch } from "@/components/StyledSwitch/input"
import { TooltipButton } from "@/components/TooltipButton"

import { ExtendedSwitchProps } from "./type"

export const ExtendedSwitch = <TFieldValues extends FieldValues = FieldValues>({
  name,
  control,
  label,
  tooltip,
  subtitle,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  value: _,
  ...rest
}: ExtendedSwitchProps<TFieldValues>) => {
  const { field: fullField } = useController({ name, control })
  const { value, ...field } = fullField

  return (
    <FormControlLabel
      label={
        <Box>
          <Box sx={InputLabelContainer} marginBottom="2px">
            <Box sx={InputLabelTypo}>
              <Typography variant="text3">{label}</Typography>
            </Box>
            <TooltipButton value={tooltip} />
          </Box>
          <Typography marginTop="0px" variant="text4" sx={InputLabelSubtitle}>
            {subtitle}
          </Typography>
        </Box>
      }
      control={
        <StyledSwitch
          checked={value as boolean | undefined}
          {...field}
          {...rest}
        />
      }
    />
  )
}
