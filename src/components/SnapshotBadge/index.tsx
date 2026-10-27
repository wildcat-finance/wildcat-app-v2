"use client"

import * as React from "react"
import { useState } from "react"

import { Box, ClickAwayListener, SvgIcon, Tooltip } from "@mui/material"

import StackIcon from "@/assets/icons/stack_icon.svg"
import { COLORS } from "@/theme/colors"

export type SnapshotBadgeProps = {
  blockNumber: number | null
  /** Unix seconds at the snapshot block, not the browser's current time. */
  timestamp: number | null
  details?: readonly string[]
}

/** Shared snapshot identity; colour does not imply that the data is live. */
export const SnapshotBadge = ({
  blockNumber,
  timestamp,
  details = [],
}: SnapshotBadgeProps) => {
  const [open, setOpen] = useState(false)
  const hasBlock =
    blockNumber !== null &&
    Number.isSafeInteger(blockNumber) &&
    blockNumber >= 0
  const date = timestamp === null ? null : new Date(timestamp * 1_000)
  const validDate = date && Number.isFinite(date.getTime()) ? date : null
  const label = hasBlock
    ? `Block ${blockNumber.toLocaleString("en-US")}`
    : "Snapshot unavailable"
  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <Tooltip
        describeChild
        open={open}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
        disableTouchListener
        placement="bottom-end"
        title={
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: "5px",
              fontSize: "12px",
              lineHeight: 1.5,
            }}
          >
            {validDate ? (
              <time dateTime={validDate.toISOString()}>
                As of{" "}
                {validDate.toLocaleString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "UTC",
                })}{" "}
                UTC
              </time>
            ) : (
              <span>Snapshot time unavailable</span>
            )}
            {[...new Set(details)].map((detail) => (
              <span key={detail}>{detail}</span>
            ))}
          </Box>
        }
        slotProps={{
          tooltip: { sx: { maxWidth: "min(320px, calc(100vw - 32px))" } },
        }}
      >
        <Box
          component="button"
          type="button"
          aria-label={hasBlock ? `Snapshot at ${label.toLowerCase()}` : label}
          aria-expanded={open}
          onClick={() => setOpen(true)}
          sx={{
            display: "inline-flex",
            alignItems: "center",
            alignSelf: "flex-start",
            gap: "6px",
            width: "fit-content",
            maxWidth: "100%",
            minHeight: "28px",
            padding: "4px 8px",
            border: `1px solid ${hasBlock ? COLORS.hawkesBlue : COLORS.iron}`,
            borderRadius: "6px",
            background: hasBlock ? COLORS.glitter : COLORS.athensGrey,
            color: COLORS.blackRock,
            fontFamily: "inherit",
            fontSize: "12px",
            fontWeight: 600,
            lineHeight: 1.5,
            fontVariantNumeric: "tabular-nums",
            cursor: "pointer",
            "&:hover": { borderColor: COLORS.cornflowerBlue },
            "&:focus-visible": {
              outline: `2px solid ${COLORS.blueRibbon}`,
              outlineOffset: "3px",
            },
          }}
        >
          <SvgIcon aria-hidden sx={{ fontSize: "14px", flexShrink: 0 }}>
            <StackIcon />
          </SvgIcon>
          <span>{label}</span>
        </Box>
      </Tooltip>
    </ClickAwayListener>
  )
}
