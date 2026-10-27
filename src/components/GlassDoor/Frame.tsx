import * as React from "react"

import { Box, Button, Skeleton } from "@mui/material"

import { SnapshotBadge } from "@/components/SnapshotBadge"

import { Publication } from "./api"
import { GD } from "./tokens"

export const SectionTitle = ({
  children,
  compact = false,
}: {
  children: React.ReactNode
  compact?: boolean
}) => (
  <Box
    component="h3"
    sx={{
      margin: 0,
      fontSize: compact ? "15px" : "18px",
      lineHeight: 1.4,
      fontWeight: 600,
      color: GD.ink,
    }}
  >
    {children}
  </Box>
)

export const PublicationBadge = ({
  publication,
  labels = [],
}: {
  publication: Publication
  labels?: string[]
}) => (
  <SnapshotBadge
    blockNumber={publication.cut?.block ?? null}
    timestamp={publication.cut?.timestamp ?? null}
    details={[
      publication.kind === "DayClose" ? "Day close" : "Intraday snapshot",
      ...labels,
    ]}
  />
)

export const AnalyticsFrame = ({
  title,
  publication,
  labels,
  children,
}: {
  title: string
  publication?: Publication
  labels?: string[]
  children: React.ReactNode
}) => (
  <Box
    sx={{
      containerType: "inline-size",
      minWidth: 0,
      display: "flex",
      flexDirection: "column",
      gap: "12px",
    }}
  >
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "8px 20px",
      }}
    >
      <Box
        component="h2"
        sx={{
          margin: 0,
          fontSize: "17px",
          lineHeight: 1.4,
          fontWeight: 600,
          color: GD.text,
        }}
      >
        {title}
      </Box>
      {publication && (
        <PublicationBadge publication={publication} labels={labels} />
      )}
    </Box>
    {children}
  </Box>
)

export const Notice = ({
  children,
  onRetry,
  compact = false,
}: {
  children: React.ReactNode
  onRetry?: () => void
  compact?: boolean
}) => (
  <Box
    role="status"
    sx={{
      border: `1px solid ${compact ? GD.panelBorder : GD.border}`,
      borderRadius: compact ? "8px" : "16px",
      padding: compact ? "12px" : "24px",
      fontSize: compact ? "12px" : "14px",
      lineHeight: 1.6,
      color: GD.text,
      background: GD.surface,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: "16px",
    }}
  >
    <Box>{children}</Box>
    {onRetry && (
      <Button onClick={onRetry} variant="outlined" size="small">
        Retry
      </Button>
    )}
  </Box>
)

export const AnalyticsSkeleton = ({
  cards = 5,
  compact = false,
}: {
  cards?: number
  compact?: boolean
}) => (
  <Box
    role="status"
    aria-label="Loading analytics"
    aria-busy="true"
    sx={{ containerType: "inline-size" }}
  >
    <Skeleton
      height={20}
      sx={{
        width: "min(320px, 100%)",
        bgcolor: GD.trackInBox,
        marginBottom: compact ? "10px" : "20px",
      }}
    />
    <Box
      sx={{
        display: "grid",
        gap: compact ? "10px" : "16px",
        gridTemplateColumns: "1fr",
        [`@container (min-width: ${compact ? 320 : 560}px)`]: {
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        },
        ...(compact
          ? {
              "@container (min-width: 600px)": {
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              },
            }
          : {}),
        [`@container (min-width: ${compact ? 960 : 900}px)`]: {
          gridTemplateColumns: `repeat(${
            compact ? Math.min(cards, 6) : 3
          }, minmax(0, 1fr))`,
        },
      }}
    >
      {Array.from({ length: cards }, (_, index) => (
        <Skeleton
          key={index}
          variant="rounded"
          height={compact ? 120 : 196}
          sx={{
            bgcolor: GD.trackInBox,
            borderRadius: compact ? "8px" : "20px",
          }}
        />
      ))}
    </Box>
  </Box>
)
