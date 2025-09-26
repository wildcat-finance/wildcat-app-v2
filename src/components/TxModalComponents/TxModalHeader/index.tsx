import { Box, Divider, IconButton, SvgIcon, Typography } from "@mui/material"

import Arrow from "@/assets/icons/arrowLeft_icon.svg"
import Cross from "@/assets/icons/cross_icon.svg"
import { TooltipButton } from "@/components/TooltipButton"
import { TxModalHeaderProps } from "@/components/TxModalComponents/TxModalHeader/interface"
import {
  TxModalHeaderContainer,
  TxModalHeaderDivider,
} from "@/components/TxModalComponents/TxModalHeader/style"

export const TxModalHeader = ({
  title,
  children,
  tooltip,
  divider = true,
  arrowOnClick,
  crossOnClick,
}: TxModalHeaderProps) => (
  <>
    <Box
      sx={{
        ...TxModalHeaderContainer,
        alignItems: children ? "flex-start" : "center",
        marginBottom: divider ? "0px" : "20px",
      }}
    >
      {arrowOnClick ? (
        <IconButton
          disableRipple
          onClick={arrowOnClick}
          sx={{ height: children ? "32px" : "fit-content" }}
        >
          <SvgIcon fontSize="big">
            <Arrow />
          </SvgIcon>
        </IconButton>
      ) : (
        <Box height="20px" width="20px" />
      )}

      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          marginX: "20px",
        }}
      >
        <Box display="flex" alignItems="center" gap="8px">
          <Typography variant="title3">{title}</Typography>
          {tooltip && <TooltipButton value={tooltip} size="big" />}
        </Box>

        {children}
      </Box>

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

    {divider && <Divider sx={TxModalHeaderDivider} />}
  </>
)
