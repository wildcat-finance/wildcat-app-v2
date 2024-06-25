import {
  Box,
  Button,
  IconButton,
  Link,
  SvgIcon,
  Typography,
} from "@mui/material"

import LinkIcon from "@/assets/icons/link_icon.svg"
import { EtherscanBaseUrl } from "@/config/network"

import { TxModalFooterProps } from "./interface"
import { TxModalFooterContainer, TxModalFooterLink } from "./style"

export const TxModalFooter = ({
  mainBtnText,
  mainBtnOnClick,
  disableMainBtn,
  secondBtnText,
  secondBtnOnClick,
  secondBtnLoading,
  disableSecondBtn,
  link,
  hideButtons,
}: TxModalFooterProps) => (
  <>
    {link && (
      <Link
        href={`${EtherscanBaseUrl}/address/${link}`}
        target="_blank"
        style={TxModalFooterLink}
      >
        <IconButton disableRipple>
          <SvgIcon fontSize="medium">
            <LinkIcon />
          </SvgIcon>
        </IconButton>

        <Typography variant="text3">View on Ethescan</Typography>
      </Link>
    )}

    {!hideButtons && (
      <Box marginTop={link ? "8px" : ""} sx={TxModalFooterContainer}>
        {(secondBtnText || secondBtnOnClick) && (
          <Button
            variant="contained"
            size="large"
            onClick={secondBtnOnClick}
            disabled={disableSecondBtn}
            fullWidth
          >
            {secondBtnLoading ? "Loading..." : secondBtnText}
          </Button>
        )}

        <Button
          variant="contained"
          size="large"
          onClick={mainBtnOnClick}
          disabled={disableMainBtn}
          fullWidth
        >
          {mainBtnText}
        </Button>
      </Box>
    )}
  </>
)
