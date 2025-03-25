import { useState } from "react"

import {
  Box,
  ClickAwayListener,
  IconButton,
  SvgIcon,
  Tooltip,
  Typography,
} from "@mui/material"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { useCopyToClipboard } from "react-use"

import Copy from "@/assets/icons/copy_icon.svg"
import LinkIcon from "@/assets/icons/link_icon.svg"

import { LinkGroupProps } from "./interface"
import { ButtonsContainer, ButtonStyle } from "./style"

export const LinkGroup = ({
  type = "withCopy",
  copyValue,
  linkValue,
  groupSX,
}: LinkGroupProps) => {
  const { t } = useTranslation()
  const [state, copyToClipboard] = useCopyToClipboard()
  const [open, setOpen] = useState(false)
  const handleTooltipOpen = () => {
    setOpen(true)
    setTimeout(() => {
      setOpen(false)
    }, 700)
  }

  const handleCopy = (value: string) => {
    copyToClipboard(value)
  }

  switch (type) {
    case "withCopy": {
      return (
        <Box sx={{ ...ButtonsContainer, ...groupSX }}>
          {copyValue && (
            <Tooltip
              arrow={false}
              placement="right"
              open={open}
              disableFocusListener
              disableHoverListener
              disableTouchListener
              title="Copied"
              slotProps={{
                popper: {
                  disablePortal: true,
                },
              }}
            >
              <IconButton
                disableRipple
                sx={ButtonStyle}
                onClick={() => {
                  handleCopy(copyValue)
                  handleTooltipOpen()
                }}
              >
                <SvgIcon fontSize="medium">
                  <Copy />
                </SvgIcon>
              </IconButton>
            </Tooltip>
          )}

          {linkValue && (
            <Link
              href={linkValue}
              target="_blank"
              style={{ display: "flex", justifyContent: "center" }}
            >
              <IconButton disableRipple sx={ButtonStyle}>
                <SvgIcon fontSize="medium">
                  <LinkIcon />
                </SvgIcon>
              </IconButton>
            </Link>
          )}
        </Box>
      )
    }
    case "etherscan": {
      return (
        <Box sx={groupSX}>
          {linkValue && (
            <Link
              href={linkValue}
              target="_blank"
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "6px",
                textDecoration: "none",
              }}
            >
              <SvgIcon>
                <LinkIcon />
              </SvgIcon>

              <Typography variant="text3">
                {t("link.viewOnEtherscan")}
              </Typography>
            </Link>
          )}
        </Box>
      )
    }
    default: {
      return (
        <Box sx={ButtonsContainer}>
          {copyValue && (
            <IconButton
              disableRipple
              sx={ButtonStyle}
              onClick={() => handleCopy(copyValue)}
            >
              <SvgIcon fontSize="medium">
                <Copy />
              </SvgIcon>
            </IconButton>
          )}

          {linkValue && (
            <Link
              href={linkValue}
              target="_blank"
              style={{ display: "flex", justifyContent: "center" }}
            >
              <IconButton disableRipple sx={ButtonStyle}>
                <SvgIcon fontSize="medium">
                  <LinkIcon />
                </SvgIcon>
              </IconButton>
            </Link>
          )}
        </Box>
      )
    }
  }
}
