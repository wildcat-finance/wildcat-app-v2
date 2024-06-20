import * as React from "react"

import { Tooltip } from "@mui/material"
import SvgIcon from "@mui/material/SvgIcon"

import Question from "@/assets/icons/circledQuestion_icon.svg"
import { COLORS } from "@/theme/colors"

export const TooltipButton = ({ value }: { value: string | undefined }) => (
  <Tooltip title={value} placement="right">
    <SvgIcon
      fontSize="small"
      sx={{
        "& path": { fill: `${COLORS.greySuit}` },
      }}
    >
      <Question />
    </SvgIcon>
  </Tooltip>
)
