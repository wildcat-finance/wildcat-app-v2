import * as React from "react"

import { Box, Typography } from "@mui/material"

import {
  InputContainer,
  InputLabelContainer,
  InputLabelSubtitle,
  InputLabelTypo,
} from "@/components/InputLabel/style"
import { InputLabelProps } from "@/components/InputLabel/type"
import { TooltipButton } from "@/components/TooltipButton"

export const InputLabel = ({
  label,
  subtitle,
  margin,
  tooltipText,
  children,
}: InputLabelProps) => (
  <Box margin={margin} sx={InputContainer}>
    <Box sx={InputLabelContainer} marginBottom={!subtitle ? "8px" : ""}>
      <Box sx={InputLabelTypo}>
        <Typography variant="text3">{label}</Typography>
      </Box>
      <TooltipButton value={tooltipText} />
    </Box>
    {subtitle && (
      <Typography variant="text4" sx={InputLabelSubtitle}>
        {subtitle}
      </Typography>
    )}
    {children}
  </Box>
)
