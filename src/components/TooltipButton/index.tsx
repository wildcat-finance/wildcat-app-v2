import * as React from "react"
import { useEffect } from "react"

import { ClickAwayListener, Tooltip } from "@mui/material"
import SvgIcon from "@mui/material/SvgIcon"

import Question from "@/assets/icons/circledQuestion_icon.svg"
import { TooltipButtonProps } from "@/components/TooltipButton/interface"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { COLORS } from "@/theme/colors"

export const TooltipButton = ({
  value,
  size = "small",
  color = COLORS.greySuit,
}: TooltipButtonProps) => {
  const isMobile = useMobileResolution()
  const [open, setOpen] = React.useState(false)

  const handleTooltipClose = () => {
    setOpen(false)
  }

  const handleTooltipOpen = () => {
    setOpen(true)
  }

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>

    if (isMobile && open) {
      timer = setTimeout(() => {
        setOpen(false)
      }, 10000)
    }

    return () => {
      clearTimeout(timer)
    }
  }, [isMobile, open])

  if (isMobile)
    return (
      <ClickAwayListener onClickAway={handleTooltipClose}>
        <div style={{ display: "flex" }}>
          <Tooltip
            onClose={handleTooltipClose}
            open={open}
            disableFocusListener
            disableHoverListener
            disableTouchListener
            title={value}
            slotProps={{
              popper: {
                disablePortal: true,
              },
            }}
          >
            <SvgIcon
              onClick={handleTooltipOpen}
              fontSize={size}
              sx={{
                "& path": { fill: `${color}` },
              }}
            >
              <Question />
            </SvgIcon>
          </Tooltip>
        </div>
      </ClickAwayListener>
    )

  return (
    <Tooltip title={value} placement="right">
      <SvgIcon
        fontSize={size}
        sx={{
          "& path": { fill: `${color}` },
        }}
      >
        <Question />
      </SvgIcon>
    </Tooltip>
  )
}
