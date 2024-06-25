import { Box, Divider, IconButton, SvgIcon, Typography } from "@mui/material"

import Arrow from "@/assets/icons/arrowLeft_icon.svg"
import Cross from "@/assets/icons/cross_icon.svg"
import { TxModalHeaderProps } from "@/components/TxModalComponents/TxModalHeader/interface"
import {
  TxModalHeaderContainer,
  TxModalHeaderDivider,
} from "@/components/TxModalComponents/TxModalHeader/style"

export const TxModalHeader = ({
  title,
  arrowOnClick,
  crossOnClick,
}: TxModalHeaderProps) => (
  <>
    <Box sx={TxModalHeaderContainer}>
      {arrowOnClick ? (
        <IconButton disableRipple onClick={arrowOnClick}>
          <SvgIcon fontSize="big">
            <Arrow />
          </SvgIcon>
        </IconButton>
      ) : (
        <Box height="20px" width="20px" />
      )}

      <Typography variant="title3">{title}</Typography>

      {crossOnClick ? (
        <IconButton disableRipple onClick={crossOnClick}>
          <SvgIcon fontSize="big">
            <Cross />
          </SvgIcon>
        </IconButton>
      ) : (
        <Box height="20px" width="20px" />
      )}
    </Box>

    <Divider sx={TxModalHeaderDivider} />
  </>
)
