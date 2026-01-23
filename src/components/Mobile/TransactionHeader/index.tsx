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
  subLabel?: string
  progress?: number
  arrowOnClick: (() => void) | null
  crossOnClick: (() => void) | null
}

export const TransactionHeader = ({
  label,
  subLabel,
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

      <Box
        sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}
      >
        {subLabel && (
          <Typography variant="mobText3" color={COLORS.manate}>
            {subLabel}
          </Typography>
        )}

        <Typography variant="mobText1">{label}</Typography>
      </Box>

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

    {progress && (
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
    )}
  </Box>
)
