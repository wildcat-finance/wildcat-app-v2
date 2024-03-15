import { Box, Chip } from "@mui/material"
import SvgIcon from "@mui/material/SvgIcon"
import Image from "next/image"
import { COLORS } from "@/theme/colors"

import Checked from "../../../assets/icons/check_icon.svg"
import Cross from "../../../assets/icons/cross_icon.svg"
import Clock from "../../../assets/icons/clock_icon.svg"
import Arrow from "../../../assets/icons/textChipArrow_icon.svg"
import Fire from "../../../assets/icons/fire_icon.png"

type MarketStatusChipProps = {
  variant?: "filled" | "text"
  type: "healthy" | "penalty" | "delinquent" | "terminated"
}

export const MarketStatusChip = ({
  variant = "filled",
  type,
}: MarketStatusChipProps) => {
  let chipConfig

  switch (type) {
    case "healthy": {
      chipConfig = {
        label: "Healthy",
        icon: <Checked />,
        backgroundColor: COLORS.glitter,
        fontColor: COLORS.blueRibbon,
      }
      break
    }
    case "penalty": {
      chipConfig = {
        label: "Penalty",
        icon: "",
        backgroundColor: COLORS.cherub,
        fontColor: COLORS.dullRed,
      }
      break
    }
    case "delinquent": {
      chipConfig = {
        label: "Delinquent",
        icon: <Clock />,
        backgroundColor: COLORS.oasis,
        fontColor: variant === "text" ? COLORS.galliano : COLORS.butteredRum,
      }
      break
    }
    case "terminated": {
      chipConfig = {
        label: "Terminated",
        icon: <Cross />,
        backgroundColor: COLORS.whiteSmoke,
        fontColor: COLORS.santasGrey,
      }
      break
    }
    default: {
      chipConfig = {
        label: "Healthy",
        icon: <Checked />,
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
            type === "penalty" ? (
              <Image src={Fire} alt="Fire icon" height={12} width={12} />
            ) : (
              <SvgIcon
                fontSize="tiny"
                sx={{ "& path": { fill: `${chipConfig.fontColor}` } }}
              >
                {chipConfig.icon}
              </SvgIcon>
            )
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
