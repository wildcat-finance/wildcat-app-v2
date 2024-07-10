import { Box, IconButton, SvgIcon, Typography } from "@mui/material"
import Link from "next/link"
import { useCopyToClipboard } from "react-use"

import Copy from "@/assets/icons/copy_icon.svg"
import LinkIcon from "@/assets/icons/link_icon.svg"

import { LinkGroupProps } from "./interface"
import { ButtonsContainer, ButtonStyle } from "./style"

export const LinkGroup = ({
  type = "withCopy",
  copyValue,
  linkValue,
}: LinkGroupProps) => {
  const [state, copyToClipboard] = useCopyToClipboard()

  const handleCopy = (value: string) => {
    copyToClipboard(value)
  }

  switch (type) {
    case "withCopy": {
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
    case "etherscan": {
      return (
        // eslint-disable-next-line react/jsx-no-useless-fragment
        <Box>
          {linkValue && (
            <Link
              href={linkValue}
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <SvgIcon>
                <LinkIcon />
              </SvgIcon>

              <Typography variant="text3">View on Ethescan</Typography>
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
