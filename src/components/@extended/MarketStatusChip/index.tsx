import { Box, Chip } from "@mui/material"
import SvgIcon from "@mui/material/SvgIcon"
import Image from "next/image"

import { MarketStatusChipProps } from "@/components/@extended/MarketStatusChip/type"
import { COLORS } from "@/theme/colors"

import Clock from "../../../assets/icons/clock_icon.svg"
import Fire from "../../../assets/icons/fire_icon.png"
import Arrow from "../../../assets/icons/textChipArrow_icon.svg"

export const MarketStatusChip = ({
  variant = "filled",
  status,
}: MarketStatusChipProps) => {
  let chipConfig

  switch (status) {
    case "healthy": {
      chipConfig = {
        label: "Healthy",
        icon: undefined,
        backgroundColor: COLORS.glitter,
        fontColor: COLORS.ultramarineBlue,
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
        icon: undefined,
        backgroundColor: COLORS.whiteSmoke,
        fontColor: COLORS.santasGrey,
      }
      break
    }
    default: {
      chipConfig = {
        label: "Healthy",
        icon: undefined,
        backgroundColor: COLORS.glitter,
        fontColor: COLORS.ultramarineBlue,
      }
    }
  }

  const chipIcon =
    // eslint-disable-next-line no-nested-ternary
    status === "penalty" ? (
      <Image src={Fire} alt="Fire icon" height={12} width={12} />
    ) : chipConfig.icon === undefined ? undefined : (
      <SvgIcon
        fontSize="tiny"
        sx={{ "& path": { fill: `${chipConfig.fontColor}` } }}
      >
        {chipConfig.icon}
      </SvgIcon>
    )

  switch (variant) {
    case "filled": {
      return (
        <Chip
          icon={chipIcon}
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
          {(status === "penalty" || status === "delinquent") && (
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
