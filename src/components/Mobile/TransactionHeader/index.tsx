import {
  Box,
  IconButton,
  LinearProgress,
  SvgIcon,
  Typography,
} from "@mui/material"

import Arrow from "@/assets/icons/arrowLeft_icon.svg"
import Cross from "@/assets/icons/cross_icon.svg"
import { COLORS } from "@/theme/colors"

export type TransactionHeaderProps = {
  label: string
  progress: number
  arrowOnClick: (() => void) | null
  crossOnClick: (() => void) | null
}

export const TransactionHeader = ({
  label,
  progress,
  arrowOnClick,
  crossOnClick,
}: TransactionHeaderProps) => (
  <Box>
    <Box
      sx={{
        borderRadius: "14px",
        padding: "24px 20px 20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
      }}
    >
      {arrowOnClick ? (
        <IconButton onClick={arrowOnClick}>
          <SvgIcon
            sx={{
              fontSize: "20px",
              "& path": { fill: `${COLORS.black}` },
            }}
          >
            <Arrow />
          </SvgIcon>
        </IconButton>
      ) : (
        <Box height="20px" width="20px" />
      )}

      <Typography
        variant="text1"
        sx={{
          fontSize: "16px",
          lineHeight: "28px",
        }}
      >
        {label}
      </Typography>

      {crossOnClick ? (
        <IconButton onClick={crossOnClick}>
          <SvgIcon
            sx={{
              fontSize: "20px",
              "& path": { fill: `${COLORS.greySuit}` },
            }}
          >
            <Cross />
          </SvgIcon>
        </IconButton>
      ) : (
        <Box height="20px" width="20px" />
      )}
    </Box>

    <LinearProgress
      variant="determinate"
      value={progress}
      sx={{
        height: "2px",
        backgroundColor: COLORS.whiteLilac,
        "& .MuiLinearProgress-bar1Determinate": {
          backgroundColor: COLORS.ultramarineBlue,
        },
      }}
    />
  </Box>
)
