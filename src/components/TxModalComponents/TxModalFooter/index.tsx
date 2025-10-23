import {
  Box,
  Button,
  IconButton,
  SvgIcon,
  Typography,
  useTheme,
} from "@mui/material"
import Link from "next/link"
import { Trans } from "react-i18next"

import Check from "@/assets/icons/check_icon.svg"
import LinkIcon from "@/assets/icons/link_icon.svg"
import { MiniLoader } from "@/components/Loader"
import { useBlockExplorer } from "@/hooks/useBlockExplorer"
import { COLORS } from "@/theme/colors"

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
  secondBtnIcon,
}: TxModalFooterProps) => {
  const theme = useTheme()
  const { getAddressUrl } = useBlockExplorer()

  return (
    <>
      {link && (
        <Link
          href={getAddressUrl(link)}
          target="_blank"
          style={TxModalFooterLink}
        >
          <IconButton disableRipple>
            <SvgIcon fontSize="medium">
              <LinkIcon />
            </SvgIcon>
          </IconButton>

          <Typography variant="text3">
            <Trans i18nKey="txModal.viewOnEtherscan" />
          </Typography>
        </Link>
      )}

      {!hideButtons && (
        <Box marginTop={link ? "8px" : ""} sx={TxModalFooterContainer(theme)}>
          {(secondBtnText || secondBtnIcon) && secondBtnOnClick && (
            <Button
              variant="contained"
              size="large"
              onClick={secondBtnOnClick}
              disabled={disableSecondBtn}
              fullWidth
            >
              {secondBtnIcon && (
                <SvgIcon
                  fontSize="medium"
                  sx={{
                    marginRight: "3px",
                    "& path": {
                      fill: `${COLORS.santasGrey}`,
                    },
                  }}
                >
                  <Check />
                </SvgIcon>
              )}

              {secondBtnLoading ? <MiniLoader /> : secondBtnText}
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
}
