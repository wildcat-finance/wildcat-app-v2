import * as React from "react"

import { Box, SvgIcon, Tooltip, Typography } from "@mui/material"

import Question from "@/assets/icons/circledQuestion_icon.svg"
import { LinkGroup } from "@/components/LinkComponent"
import { TooltipButton } from "@/components/TooltipButton"
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
  tooltipText,
  valueTooltipText,
  alarmState,
  copy,
  link,
}: ParametersItemProps) => {
  const renderValue = () => {
    if (
      typeof value === "string" ||
      (typeof value === "number" && value.toString().length > 26)
    ) {
      return (
        <Tooltip title={value} placement="right">
          <Typography
            variant="text3"
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
        </Tooltip>
      )
    }
    return value
  }

  return (
    <Box sx={ParametersItemContainer}>
      <Box sx={ParametersItemTitleContainer}>
        <Typography variant="text3" sx={{ color: COLORS.santasGrey }}>
          {title}
        </Typography>
        {tooltipText && <TooltipButton value={tooltipText} />}
      </Box>

      <Box sx={ParametersItemValueContainer}>
        {renderValue()}
        {valueTooltipText && (
          <Tooltip title={valueTooltipText} placement="right">
            <SvgIcon
              fontSize="small"
              sx={{
                "& path": { fill: `${COLORS.galliano}` },
              }}
            >
              <Question />
            </SvgIcon>
          </Tooltip>
        )}
        <LinkGroup linkValue={link} copyValue={copy} />
      </Box>
    </Box>
  )
}
