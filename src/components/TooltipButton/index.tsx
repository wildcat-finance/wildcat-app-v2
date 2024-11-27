import * as React from "react"

import { Tooltip } from "@mui/material"
import SvgIcon from "@mui/material/SvgIcon"

import Question from "@/assets/icons/circledQuestion_icon.svg"
import { TooltipButtonProps } from "@/components/TooltipButton/interface"
import { COLORS } from "@/theme/colors"

export const TooltipButton = ({
  value,
  size = "small",
}: TooltipButtonProps) => (
  <Tooltip title={value} placement="right">
    <SvgIcon
      fontSize={size}
      sx={{
        "& path": { fill: `${COLORS.greySuit}` },
      }}
    >
      <Question />
    </SvgIcon>
  </Tooltip>
)
