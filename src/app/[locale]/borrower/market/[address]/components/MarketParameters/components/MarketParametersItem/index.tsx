import * as React from "react"

import { Box, IconButton, SvgIcon, Tooltip, Typography } from "@mui/material"
import Link from "next/link"

import Question from "@/assets/icons/circledQuestion_icon.svg"
import Copy from "@/assets/icons/copy_icon.svg"
import LinkIcon from "@/assets/icons/link_icon.svg"
import { AddressButtons } from "@/components/Header/HeaderButton/ProfileDialog/style"
import { TooltipButton } from "@/components/TooltipButton"
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
  handleCopy,
  link,
}: MarketParametersItemProps) => (
  <Box sx={MarketParametersItemContainer}>
    <Box sx={MarketParametersItemTitleContainer}>
      <Typography variant="text3" sx={{ color: COLORS.santasGrey }}>
        {title}
      </Typography>
      {tooltipText && <TooltipButton value={tooltipText} />}
    </Box>

    <Box sx={MarketParametersItemValueContainer}>
      <Typography
        variant="text3"
        align="right"
        color={alarmState ? COLORS.dullRed : COLORS.blackRock}
      >
        {value}
      </Typography>

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

      {handleCopy && (
        <IconButton disableRipple sx={AddressButtons} onClick={handleCopy}>
          <SvgIcon fontSize="medium">
            <Copy />
          </SvgIcon>
        </IconButton>
      )}
      {link && (
        <Link
          href={link}
          target="_blank"
          style={{ display: "flex", justifyContent: "center" }}
        >
          <IconButton disableRipple sx={AddressButtons}>
            <SvgIcon fontSize="medium">
              <LinkIcon />
            </SvgIcon>
          </IconButton>
        </Link>
      )}
    </Box>
  </Box>
)
