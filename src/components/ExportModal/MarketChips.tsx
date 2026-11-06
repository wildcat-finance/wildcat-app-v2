import { useCallback, useLayoutEffect, useRef, useState } from "react"

import { Box, Typography } from "@mui/material"

import { LendersMarketChip } from "@/components/LendersMarketChip"
import { COLORS } from "@/theme/colors"

export type MarketChipItem = { id: string; label: string }

const CHIP_GAP = 4
const INPUT_MIN_WIDTH = 32

const MoreChip = ({ count, title }: { count: number; title?: string }) => (
  <Box
    title={title}
    sx={{
      height: "20px",
      flexShrink: 0,
      display: "flex",
      alignItems: "center",
      padding: "0 8px",
      borderRadius: "20px",
      backgroundColor: COLORS.whiteSmoke,
      userSelect: "none",
    }}
  >
    <Typography variant="text3" color={COLORS.blackRock} whiteSpace="nowrap">
      +{count}
    </Typography>
  </Box>
)

export const MarketChips = ({
  items,
  disabled,
  onDelete,
}: {
  items: MarketChipItem[]
  disabled?: boolean
  onDelete: (id: string) => void
}) => {
  const rowRef = useRef<HTMLDivElement | null>(null)
  const measureRef = useRef<HTMLDivElement | null>(null)
  const moreRef = useRef<HTMLDivElement | null>(null)
  const [visibleCount, setVisibleCount] = useState(items.length)

  const recompute = useCallback(() => {
    const row = rowRef.current
    const measure = measureRef.current
    const inputRoot = row?.closest<HTMLElement>(".MuiAutocomplete-inputRoot")
    if (!row || !measure || !inputRoot) return

    const style = window.getComputedStyle(inputRoot)
    const available =
      inputRoot.clientWidth -
      parseFloat(style.paddingLeft) -
      parseFloat(style.paddingRight) -
      INPUT_MIN_WIDTH
    if (available <= 0) return

    const widths = Array.from(
      measure.querySelectorAll<HTMLElement>('[data-chip="true"]'),
    ).map((chip) => chip.offsetWidth)
    const moreWidth = (moreRef.current?.offsetWidth ?? 32) + CHIP_GAP

    const total = widths.reduce((sum, width) => sum + width + CHIP_GAP, 0)
    if (total <= available) {
      setVisibleCount(widths.length)
      return
    }

    let used = 0
    let count = 0
    for (let i = 0; i < widths.length; i += 1) {
      if (used + widths[i] + CHIP_GAP + moreWidth > available) break
      used += widths[i] + CHIP_GAP
      count = i + 1
    }
    setVisibleCount(count)
  }, [])

  useLayoutEffect(() => {
    recompute()
  }, [items, recompute])

  useLayoutEffect(() => {
    const inputRoot = rowRef.current?.closest<HTMLElement>(
      ".MuiAutocomplete-inputRoot",
    )
    if (!inputRoot || typeof ResizeObserver === "undefined") return undefined
    const observer = new ResizeObserver(() => recompute())
    observer.observe(inputRoot)
    return () => observer.disconnect()
  }, [recompute])

  const visible = items.slice(0, visibleCount)
  const hidden = items.slice(visibleCount)

  return (
    <>
      <Box
        ref={rowRef}
        sx={{
          display: "flex",
          flex: "0 1 auto",
          minWidth: 0,
          gap: `${CHIP_GAP}px`,
          alignItems: "center",
          overflow: "hidden",
          marginRight: `${CHIP_GAP}px`,
        }}
      >
        {visible.map((item) => (
          <Box key={item.id} flexShrink={0}>
            <LendersMarketChip
              type="old"
              marketName={item.label}
              width="fit-content"
              withButton
              disabled={disabled}
              onClick={() => onDelete(item.id)}
            />
          </Box>
        ))}
        {hidden.length > 0 && (
          <MoreChip
            count={hidden.length}
            title={hidden.map((item) => item.label).join(", ")}
          />
        )}
      </Box>
      <Box
        ref={measureRef}
        aria-hidden
        sx={{
          position: "absolute",
          visibility: "hidden",
          pointerEvents: "none",
          width: 0,
          height: 0,
          overflow: "hidden",
          display: "flex",
        }}
      >
        {items.map((item) => (
          <Box key={item.id} data-chip="true" flexShrink={0}>
            <LendersMarketChip
              type="old"
              marketName={item.label}
              width="fit-content"
              withButton
            />
          </Box>
        ))}
        <Box ref={moreRef} flexShrink={0}>
          <MoreChip count={Math.max(items.length, 10)} />
        </Box>
      </Box>
    </>
  )
}
