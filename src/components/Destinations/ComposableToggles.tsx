import * as React from "react"

import { Box, ButtonBase, SvgIcon, Typography } from "@mui/material"
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
        boxShadow: `inset 0 0 0 1px ${
          expanded ? COLORS.hawkesBlue : COLORS.whiteLilac
        }`,
        backgroundColor: expanded ? COLORS.glitter : COLORS.athensGrey,
        "&.Mui-focusVisible": {
          outline: `2px solid ${COLORS.ultramarineBlue}`,
          outlineOffset: "-2px",
        },
        "@media (forced-colors: active)": {
          border: "1px solid ButtonText",
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

export const ComposableCardFooter = ({
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
  const active = count > 0
  const color = active ? COLORS.blueRibbon : COLORS.santasGrey

  const content = (
    <>
      <Box
        component="span"
        sx={{
          fontSize: "11px",
          lineHeight: "16px",
          fontWeight: 600,
          color,
          whiteSpace: "nowrap",
        }}
      >
        {t("destinations.cardToggle", { count })}
      </Box>
      <SvgIcon
        viewBox="0 0 20 20"
        sx={{
          fontSize: "12px",
          transform: expanded ? "rotate(180deg)" : "none",
          transition: "transform 200ms ease",
          "& path": { fill: color },
        }}
      >
        <DownArrow />
      </SvgIcon>
    </>
  )

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        padding: "4px 0",
      }}
    >
      {active ? (
        <Box
          component="button"
          type="button"
          aria-expanded={expanded}
          aria-controls={controls}
          onClick={(event: React.MouseEvent) => {
            stopRowNavigation(event)
            onToggle()
          }}
          onAuxClick={stopRowNavigation}
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: "3px",
            margin: 0,
            padding: 0,
            border: "none",
            borderRadius: "4px",
            background: "none",
            font: "inherit",
            cursor: "pointer",
            "&:focus-visible": {
              outline: `2px solid ${COLORS.ultramarineBlue}`,
              outlineOffset: "2px",
            },
          }}
        >
          {content}
        </Box>
      ) : (
        <Box
          component="span"
          sx={{ display: "inline-flex", alignItems: "center", gap: "3px" }}
        >
          {content}
        </Box>
      )}
    </Box>
  )
}
