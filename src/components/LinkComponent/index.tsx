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
import { match } from "ts-pattern"

import Copy from "@/assets/icons/copy_icon.svg"
import LinkIcon from "@/assets/icons/link_icon.svg"

import { LinkGroupProps } from "./interface"
import { ButtonsContainer, ButtonStyle } from "./style"

export const LinkGroup = ({
  type = "withCopy",
  copyValue,
  linkValue,
  groupSX,
  iconSize,
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
  const iconSx = { fontSize: iconSize ?? "16px" }

  return match(type)
    .with("withCopy", () => (
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
              <SvgIcon sx={iconSx}>
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
              <SvgIcon sx={iconSx}>
                <LinkIcon />
              </SvgIcon>
            </IconButton>
          </Link>
        )}
      </Box>
    ))
    .with("etherscan", () => (
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

            <Typography variant="text3">{t("link.viewOnEtherscan")}</Typography>
          </Link>
        )}
      </Box>
    ))
    .otherwise(() => (
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
    ))
}
