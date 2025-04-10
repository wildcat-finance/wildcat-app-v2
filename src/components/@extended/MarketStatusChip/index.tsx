import { Box, Chip } from "@mui/material"
import SvgIcon from "@mui/material/SvgIcon"
import Image from "next/image"

import Clock from "@/assets/icons/clock_icon.svg"
import Fire from "@/assets/icons/fire_icon.png"
import Arrow from "@/assets/icons/textChipArrow_icon.svg"
import { HealthyStatusChip } from "@/components/@extended/MarketStatusChip/HealthyStatusChip"
import { COLORS } from "@/theme/colors"
import { MarketStatus } from "@/utils/marketStatus"

import { MarketStatusChipProps } from "./type"

export const MarketStatusChip = ({
  variant = "filled",
  status,
}: MarketStatusChipProps) => {
  let chipConfig

  switch (status.status) {
    case "Penalty": {
      chipConfig = {
        label: "Penalty",
        icon: "",
        backgroundColor: COLORS.cherub,
        fontColor: COLORS.dullRed,
      }
      break
    }
    case "Pending": {
      chipConfig = {
        label: "Pending",
        icon: <Clock />,
        backgroundColor: COLORS.oasis,
        fontColor: variant === "text" ? COLORS.galliano : COLORS.butteredRum,
      }
      break
    }
    case "Terminated": {
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
        label: "Penalty",
        icon: "",
        backgroundColor: COLORS.cherub,
        fontColor: COLORS.dullRed,
      }
    }
  }

  const chipIcon =
    // eslint-disable-next-line no-nested-ternary
    status.status === "Penalty" ? (
      <Image src={Fire} alt="Fire icon" height={12} width={12} />
    ) : chipConfig.icon === undefined ? undefined : (
      <SvgIcon
        fontSize="tiny"
        sx={{ "& path": { fill: `${chipConfig.fontColor}` } }}
      >
        {chipConfig.icon}
      </SvgIcon>
    )

  if (status.status === MarketStatus.HEALTHY)
    return <HealthyStatusChip msLeft={status.healthyPeriod} />

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
          {(status.status === "Penalty" || status.status === "Pending") && (
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
