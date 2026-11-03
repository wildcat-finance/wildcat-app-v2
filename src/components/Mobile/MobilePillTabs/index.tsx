import * as React from "react"

import { Box, ButtonBase, Typography } from "@mui/material"
import Link from "next/link"

import { COLORS } from "@/theme/colors"

export type MobilePillTabItem = {
  value: string
  label: string
  count?: number
  href?: string
}

export type MobilePillTabsProps = {
  items: MobilePillTabItem[]
  value: string
  onChange?: (value: string) => void
  tone: "neutral" | "accent"
  hideCounts?: boolean
  ariaLabel?: string
}

const ACCENT_ACTIVE_BG = "#E4EBFE80"

const TONE_STYLES = {
  neutral: {
    activeBg: COLORS.whiteSmoke,
    activeLabel: COLORS.blackRock,
    activeCount: COLORS.manate,
  },
  accent: {
    activeBg: ACCENT_ACTIVE_BG,
    activeLabel: COLORS.ultramarineBlue,
    activeCount: COLORS.cornflowerBlue,
  },
} as const

export const MobilePillTabs = ({
  items,
  value,
  onChange,
  tone,
  hideCounts = false,
  ariaLabel,
}: MobilePillTabsProps) => {
  const rowRef = React.useRef<HTMLDivElement>(null)
  const pillRefs = React.useRef(new Map<string, HTMLElement>())
  const toneStyles = TONE_STYLES[tone]
  const isNav = items.some((item) => item.href)

  React.useEffect(() => {
    const row = rowRef.current
    const pill = pillRefs.current.get(value)
    if (!row || !pill) return
    const start = pill.offsetLeft
    const end = start + pill.offsetWidth
    if (start < row.scrollLeft) {
      row.scrollLeft = start
    } else if (end > row.scrollLeft + row.clientWidth) {
      row.scrollLeft = end - row.clientWidth
    }
  }, [value, hideCounts])

  const setPillRef = (itemValue: string) => (node: HTMLElement | null) => {
    if (node) pillRefs.current.set(itemValue, node)
    else pillRefs.current.delete(itemValue)
  }

  return (
    <Box
      ref={rowRef}
      component={isNav ? "nav" : "div"}
      role={isNav ? undefined : "group"}
      aria-label={ariaLabel}
      sx={{
        position: "relative",
        minHeight: "28px",
        display: "flex",
        alignItems: "center",
        flexWrap: "nowrap",
        gap: "6px",
        overflowX: "auto",
        scrollbarWidth: "none",
        "&::-webkit-scrollbar": { display: "none" },
      }}
    >
      {items.map((item) => {
        const isActive = item.value === value
        const showCount = !hideCounts && !!item.count

        const pillSx = {
          flexShrink: 0,
          height: "28px",
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: "4px 10px",
          borderRadius: "10px",
          backgroundColor: isActive ? toneStyles.activeBg : "transparent",
          fontFamily: "inherit",
          textDecoration: "none",
          whiteSpace: "nowrap",
          "&:hover": {
            backgroundColor: isActive ? toneStyles.activeBg : COLORS.hintOfRed,
          },
          "&.Mui-focusVisible": {
            outline: `2px solid ${COLORS.ultramarineBlue}`,
            outlineOffset: "-2px",
          },
        }

        const content = (
          <>
            <Typography
              component="span"
              variant={isActive ? "mobText3SemiBold" : "mobText3"}
              sx={{
                color: isActive ? toneStyles.activeLabel : COLORS.blackRock,
              }}
            >
              {item.label}
            </Typography>
            {showCount && (
              <Typography
                component="span"
                variant="mobText3"
                sx={{
                  color: isActive ? toneStyles.activeCount : COLORS.manate,
                }}
              >
                {item.count}
              </Typography>
            )}
          </>
        )

        if (item.href) {
          return (
            <ButtonBase
              key={item.value}
              ref={setPillRef(item.value)}
              disableRipple
              component={Link}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              onClick={(event: React.MouseEvent) => {
                if (isActive) {
                  event.preventDefault()
                  return
                }
                onChange?.(item.value)
              }}
              sx={pillSx}
            >
              {content}
            </ButtonBase>
          )
        }

        return (
          <ButtonBase
            key={item.value}
            ref={setPillRef(item.value)}
            disableRipple
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange?.(item.value)}
            sx={pillSx}
          >
            {content}
          </ButtonBase>
        )
      })}
    </Box>
  )
}
