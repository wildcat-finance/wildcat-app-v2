import { Box, Chip } from "@mui/material"
import SvgIcon from "@mui/material/SvgIcon"
import Image from "next/image"
import { match } from "ts-pattern"

import Clock from "@/assets/icons/clock_icon.svg"
import Fire from "@/assets/icons/fire_icon.png"
import Arrow from "@/assets/icons/textChipArrow_icon.svg"
import { HealthyStatusChip } from "@/components/@extended/MarketStatusChip/HealthyStatusChip"
import { COLORS } from "@/theme/colors"
import { MarketStatus } from "@/utils/marketStatus"

import { MarketStatusChipProps } from "./type"

export const MarketStatusChip = ({
  variant = "filled",
  withPeriod = true,
  status,
}: MarketStatusChipProps) => {
  const chipConfig = match(status.status)
    .with(MarketStatus.PENALTY, () => ({
      label: "Penalty",
      icon: "",
      backgroundColor: COLORS.cherub,
      fontColor: COLORS.dullRed,
    }))
    .with(MarketStatus.DELINQUENT, () => ({
      label: "Pending",
      icon: <Clock />,
      backgroundColor: COLORS.oasis,
      fontColor: variant === "text" ? COLORS.galliano : COLORS.butteredRum,
    }))
    .with(MarketStatus.TERMINATED, () => ({
      label: "Terminated",
      icon: undefined,
      backgroundColor: COLORS.whiteSmoke,
      fontColor: COLORS.santasGrey,
    }))
    .otherwise(() => ({
      label: "Penalty",
      icon: "",
      backgroundColor: COLORS.cherub,
      fontColor: COLORS.dullRed,
    }))

  const chipIcon = match(status.status)
    .with(MarketStatus.PENALTY, () => (
      <Image src={Fire} alt="Fire icon" height={12} width={12} />
    ))
    .with(MarketStatus.DELINQUENT, () => (
      <SvgIcon
        fontSize="tiny"
        sx={{ "& path": { fill: `${chipConfig.fontColor}` } }}
      >
        {chipConfig.icon}
      </SvgIcon>
    ))
    .otherwise(() => undefined)

  if (status.status === MarketStatus.HEALTHY)
    return (
      <HealthyStatusChip
        withPeriod={withPeriod}
        msLeft={status.healthyPeriod}
      />
    )

  return match(variant)
    .with("filled", () => (
      <Chip
        icon={chipIcon}
        label={chipConfig.label}
        sx={{
          backgroundColor: chipConfig.backgroundColor,
          color: chipConfig.fontColor,
        }}
      />
    ))
    .with("text", () => (
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
        {(status.status === MarketStatus.PENALTY ||
          status.status === MarketStatus.DELINQUENT) && (
          <Arrow
            fill={chipConfig.fontColor}
            style={{ position: "relative", top: "-2px" }}
          />
        )}
      </Box>
    ))
    .otherwise(() => (
      <Box
        sx={{
          backgroundColor: chipConfig.backgroundColor,
          color: chipConfig.fontColor,
        }}
      >
        {chipConfig.label}
      </Box>
    ))
}
