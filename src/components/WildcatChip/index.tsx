import { Box, Chip } from "@mui/material"
import SvgIcon from "@mui/material/SvgIcon"
import { COLORS } from "../../theme/colors"

import Checked from "../../assets/icons/check24_icon.svg"
import Arrow from "../../assets/icons/textChipArrow_icon.svg"

type WildcatChipProps = {
  variant?: "filled" | "text"
  type: "healthy" | "penalty" | "delinquent" | "terminated"
}

export const WildcatChip = ({ variant = "filled", type }: WildcatChipProps) => {
  let chipConfig

  switch (type) {
    case "healthy": {
      chipConfig = {
        label: "Healthy",
        icon: <Checked fill={COLORS.blueRibbon} />,
        backgroundColor: COLORS.glitter,
        fontColor: COLORS.blueRibbon,
      }
      break
    }
    case "penalty": {
      chipConfig = {
        label: "Penalty",
        icon: <Checked fill={COLORS.dullRed} />,
        backgroundColor: COLORS.cherub,
        fontColor: COLORS.dullRed,
      }
      break
    }
    case "delinquent": {
      chipConfig = {
        label: "Delinquent",
        icon: (
          <Checked
            fill={variant === "text" ? COLORS.galliano : COLORS.butteredRum}
          />
        ),
        backgroundColor: COLORS.oasis,
        fontColor: variant === "text" ? COLORS.galliano : COLORS.butteredRum,
      }
      break
    }
    case "terminated": {
      chipConfig = {
        label: "Terminated",
        icon: <Checked fill={COLORS.santasGrey} />,
        backgroundColor: COLORS.whiteSmoke,
        fontColor: COLORS.santasGrey,
      }
      break
    }
    default: {
      chipConfig = {
        label: "Healthy",
        icon: <Checked fill={COLORS.blueRibbon} />,
        backgroundColor: COLORS.glitter,
        fontColor: COLORS.blueRibbon,
      }
    }
  }

  switch (variant) {
    case "filled": {
      return (
        <Chip
          icon={
            <SvgIcon fontSize="huge">
              {chipConfig.icon}
            </SvgIcon>
          }
          label={chipConfig.label}
          sx={{
            backgroundColor: chipConfig.backgroundColor,
            color: chipConfig.fontColor,
          }}
        />
      )
    }
    case "text": {
      return (
        <Box
          sx={{
            display: "flex",
            columnGap: "4px",
            alignItems: "center",
          }}
        >
          <Chip
            variant="outlined"
            label={chipConfig.label}
            sx={{
              color: chipConfig.fontColor,
            }}
          />
          {(type === "penalty" || type === "delinquent") && (
            <Arrow
              fill={chipConfig.fontColor}
              style={{ position: "relative", top: "-2px" }}
            />
          )}
        </Box>
      )
    }
    default: {
      return (
        <Box
          sx={{
            backgroundColor: chipConfig.backgroundColor,
            color: chipConfig.fontColor,
          }}
        >
          {chipConfig.label}
        </Box>
      )
    }
  }
}
