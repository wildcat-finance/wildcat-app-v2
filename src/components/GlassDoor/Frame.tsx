import * as React from "react"

import { Box, Skeleton } from "@mui/material"

import { Publication } from "./api"
import { block, longDate } from "./format"
import { GD } from "./tokens"

// Page furniture shared by Market and Borrower Analytics: the one block every
// figure comes from, publication state labels, notices and skeletons.

const DELAYED_AFTER_MS = 30 * 60 * 1_000

export const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <Box
    component="h3"
    sx={{ margin: "8px 0 0", fontSize: "13px", fontWeight: 600, color: GD.ink }}
  >
    {children}
  </Box>
)

const Label = ({ children }: { children: React.ReactNode }) => (
  <Box
    component="span"
    sx={{
      fontSize: "10px",
      fontWeight: 600,
      letterSpacing: "0.05em",
      textTransform: "uppercase",
      color: GD.muted,
      border: `1px solid ${GD.border}`,
      borderRadius: "10px",
      padding: "1px 8px",
    }}
  >
    {children}
  </Box>
)

/**
 * "Snapshot block 26,279,403 · 27 October 2026" plus state labels, under the
 * host page's Analytics heading.
 */
export const SnapshotLine = ({
  publication,
  labels = [],
}: {
  publication: Publication
  labels?: string[]
}) => {
  const delayed =
    publication.publishedAt !== null &&
    Date.now() - Date.parse(publication.publishedAt) > DELAYED_AFTER_MS
  return (
    <Box display="flex" alignItems="center" flexWrap="wrap" gap="8px">
      <Box component="span" sx={{ fontSize: "12px", color: GD.text }}>
        {publication.cut
          ? `Snapshot block ${block(publication.cut.block)} · ${longDate(
              publication.cut.timestamp,
            )}`
          : "Latest snapshot"}
      </Box>
      {publication.kind === "DayClose" ? <Label>day close</Label> : null}
      {delayed ? <Label>delayed</Label> : null}
      {labels.map((label) => (
        <Label key={label}>{label}</Label>
      ))}
    </Box>
  )
}

export const Notice = ({ children }: { children: React.ReactNode }) => (
  <Box
    sx={{
      border: `1px solid ${GD.border}`,
      borderRadius: "12px",
      padding: "12px 16px",
      fontSize: "13px",
      color: GD.text,
      background: GD.surface,
    }}
  >
    {children}
  </Box>
)

export const AnalyticsSkeleton = ({ cards = 5 }: { cards?: number }) => (
  <Box display="flex" flexDirection="column" gap="12px">
    <Skeleton height="20px" width="320px" sx={{ bgcolor: GD.trackInBox }} />
    <Box
      sx={{
        display: "grid",
        gap: "12px",
        gridTemplateColumns: "repeat(auto-fill, minmax(176px, 1fr))",
      }}
    >
      {Array.from({ length: cards }, (_, index) => (
        <Skeleton
          key={index}
          variant="rounded"
          height="132px"
          sx={{ bgcolor: GD.trackInBox, borderRadius: "20px" }}
        />
      ))}
    </Box>
  </Box>
)
