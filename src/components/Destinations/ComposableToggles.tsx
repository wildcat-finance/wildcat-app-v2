import * as React from "react"

import { ButtonBase, SvgIcon, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import ChevronSmallUp from "@/assets/icons/chevronSmallUp_icon.svg"
import DownArrow from "@/assets/icons/downArrow20_icon.svg"
import { COLORS } from "@/theme/colors"

const stopRowNavigation = (event: React.SyntheticEvent) => {
  event.preventDefault()
  event.stopPropagation()
}

export const ComposableChip = ({
  count,
  expanded,
  onToggle,
  controls,
}: {
  count: number
  expanded: boolean
  onToggle: () => void
  controls?: string
}) => {
  const { t } = useTranslation()
  const color = expanded ? COLORS.ultramarineBlue : COLORS.blackRock

  return (
    <ButtonBase
      aria-expanded={expanded}
      aria-controls={controls}
      onClick={(event) => {
        stopRowNavigation(event)
        onToggle()
      }}
      onMouseDown={(event) => event.stopPropagation()}
      onAuxClick={stopRowNavigation}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") event.stopPropagation()
      }}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: "2px",
        padding: "0 4px 0 8px",
        borderRadius: "12px",
        border: `1px solid ${expanded ? COLORS.hawkesBlue : COLORS.whiteLilac}`,
        backgroundColor: expanded ? COLORS.glitter : COLORS.athensGrey,
        "&.Mui-focusVisible": {
          outline: `2px solid ${COLORS.ultramarineBlue}`,
          outlineOffset: "-2px",
        },
      }}
    >
      <Typography
        sx={{
          fontSize: "13px",
          lineHeight: "20px",
          fontWeight: 500,
          color,
          whiteSpace: "nowrap",
        }}
      >
        {t("destinations.chip", { count })}
      </Typography>
      <SvgIcon
        viewBox="0 0 16 16"
        sx={{
          fontSize: "16px",
          margin: "2px",
          opacity: expanded ? 1 : 0.49,
          transform: expanded ? "none" : "rotate(180deg)",
          "& path": { fill: color },
        }}
      >
        <ChevronSmallUp />
      </SvgIcon>
    </ButtonBase>
  )
}

export const ComposableCardToggle = ({
  count,
  expanded,
  onToggle,
  controls,
}: {
  count: number
  expanded: boolean
  onToggle: () => void
  controls?: string
}) => {
  const { t } = useTranslation()
  const color = count > 0 ? COLORS.blueRibbon : COLORS.santasGrey

  return (
    <ButtonBase
      disabled={count === 0}
      aria-expanded={expanded}
      aria-controls={controls}
      onClick={(event) => {
        stopRowNavigation(event)
        onToggle()
      }}
      onAuxClick={stopRowNavigation}
      sx={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "3px",
        padding: "4px 0",
        borderRadius: "8px",
        "&.Mui-focusVisible": {
          outline: `2px solid ${COLORS.ultramarineBlue}`,
          outlineOffset: "-2px",
        },
      }}
    >
      <Typography
        sx={{
          fontSize: "11px",
          lineHeight: "16px",
          fontWeight: 600,
          color,
          whiteSpace: "nowrap",
        }}
      >
        {t("destinations.cardToggle", { count })}
      </Typography>
      <SvgIcon
        viewBox="0 0 20 20"
        sx={{
          fontSize: "12px",
          transform: expanded ? "rotate(180deg)" : "none",
          "& path": { fill: color },
        }}
      >
        <DownArrow />
      </SvgIcon>
    </ButtonBase>
  )
}
