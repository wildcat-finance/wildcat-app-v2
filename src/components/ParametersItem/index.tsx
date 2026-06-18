import * as React from "react"

import { Box, Tooltip, Typography } from "@mui/material"

import { LinkGroup } from "@/components/LinkComponent"
import { TooltipButton } from "@/components/TooltipButton"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { COLORS } from "@/theme/colors"

import { ParametersItemProps } from "./interface"
import {
  ParametersItemContainer,
  ParametersItemTitleContainer,
  ParametersItemValueContainer,
} from "./style"

export const ParametersItem = ({
  title,
  value,
  valueComponent,
  tooltipText,
  valueTooltipText,
  valueTitle,
  alarmState,
  copy,
  link,
}: ParametersItemProps) => {
  const isMobile = useMobileResolution()

  const valueTypography = (
    <Typography
      variant={isMobile ? "mobText3" : "text3"}
      align="right"
      color={alarmState ? COLORS.dullRed : COLORS.blackRock}
      sx={{
        maxWidth: "185px",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      {value}
    </Typography>
  )
  const valueHoverTitle =
    valueTitle ?? (value.toString().length > 26 ? value.toString() : undefined)

  return (
    <Box sx={ParametersItemContainer}>
      <Box sx={ParametersItemTitleContainer}>
        <Typography
          variant={isMobile ? "mobText3" : "text3"}
          sx={{ color: COLORS.santasGrey }}
        >
          {title}
        </Typography>
        {tooltipText && <TooltipButton value={tooltipText} />}
      </Box>

      <Box sx={ParametersItemValueContainer}>
        {valueHoverTitle ? (
          <Tooltip title={valueHoverTitle} placement="right">
            {valueTypography}
          </Tooltip>
        ) : (
          valueTypography
        )}

        {valueComponent}

        {valueTooltipText && (
          <TooltipButton value={valueTooltipText} color={COLORS.galliano} />
        )}

        <LinkGroup linkValue={link} copyValue={copy} />
      </Box>
    </Box>
  )
}
