import * as React from "react"

import { Box, SvgIcon, Tooltip, Typography } from "@mui/material"

import Question from "@/assets/icons/circledQuestion_icon.svg"
import { LinkGroup } from "@/components/LinkComponent"
import { TooltipButton } from "@/components/TooltipButton"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { COLORS } from "@/theme/colors"

import { MarketParametersItemProps } from "./interface"
import {
  MarketParametersItemContainer,
  MarketParametersItemTitleContainer,
  MarketParametersItemValueContainer,
} from "./style"

export const MarketParametersItem = ({
  title,
  value,
  tooltipText,
  valueTooltipText,
  alarmState,
  copy,
  link,
}: MarketParametersItemProps) => {
  const isMobile = useMobileResolution()

  return (
    <Box sx={MarketParametersItemContainer}>
      <Box sx={MarketParametersItemTitleContainer}>
        <Typography
          variant={isMobile ? "mobText3" : "text3"}
          sx={{ color: COLORS.santasGrey }}
        >
          {title}
        </Typography>
        {tooltipText && <TooltipButton value={tooltipText} />}
      </Box>

      <Box sx={MarketParametersItemValueContainer}>
        {value.toString().length > 26 ? (
          <Tooltip title={value} placement="right">
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
          </Tooltip>
        ) : (
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
        )}

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
