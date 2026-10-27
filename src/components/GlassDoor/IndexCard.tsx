import * as React from "react"

import { Box } from "@mui/material"

import {
  GD,
  STATE_COLOR,
  STATE_DOT,
  StateTone,
  Verdict,
  VERDICT_STYLE,
} from "./tokens"

export type CardSize = "L" | "M" | "S"

export type IndexCardProps = {
  size: CardSize
  compact?: boolean
  name: string
  shortName?: string
  help?: string
  value?: string
  word?: string
  verdict?: Verdict
  state?: { word: string; tone: StateTone }
  /** Evidence or a second measurement, rather than explanatory copy. */
  sub?: string
  detail?: { label: string; value: string }
  comparison?: string
  chart?: React.ReactNode
  open?: boolean
  onToggle?: () => void
  id?: string
  controlsId?: string
}

export const VerdictChip = ({
  verdict,
  size,
}: {
  verdict: Verdict
  size: CardSize
}) => (
  <Box
    component="span"
    sx={{
      ...VERDICT_STYLE[verdict],
      display: "inline-flex",
      alignItems: "center",
      padding: size === "S" ? "2px 7px" : "4px 9px",
      borderRadius: "6px",
      fontSize: size === "S" ? "10px" : "11px",
      fontWeight: 600,
      lineHeight: 1.4,
      letterSpacing: "0.02em",
      whiteSpace: "nowrap",
    }}
  >
    {verdict}
  </Box>
)

const Chevron = ({ open, compact }: { open?: boolean; compact?: boolean }) => (
  <Box
    component="span"
    aria-hidden="true"
    sx={{
      display: "inline-flex",
      flex: "0 0 auto",
      alignItems: "center",
      justifyContent: "center",
      width: compact ? "18px" : "24px",
      height: compact ? "18px" : "24px",
      borderRadius: "50%",
      color: open ? GD.link : GD.text,
      background: open ? GD.accent : GD.track,
      transform: open ? "rotate(180deg)" : "none",
      transition: "transform 160ms ease",
      "@media (prefers-reduced-motion: reduce)": { transition: "none" },
    }}
  >
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path
        d="m4 6 4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </Box>
)

const Small = ({
  name,
  shortName,
  value,
  word,
  verdict,
  state,
  sub,
}: Pick<
  IndexCardProps,
  "name" | "shortName" | "value" | "word" | "verdict" | "state" | "sub"
>) => (
  <Box sx={{ minWidth: 0 }}>
    <Box
      component="span"
      sx={{
        display: "block",
        color: GD.muted,
        fontSize: "12px",
        marginBottom: "4px",
      }}
    >
      {shortName ?? name}
    </Box>
    <Box display="flex" alignItems="center" gap="6px" flexWrap="wrap">
      {state ? (
        <Box
          component="span"
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            color: STATE_COLOR[state.tone],
            fontSize: "12px",
            fontWeight: 600,
          }}
        >
          <Box
            component="span"
            aria-hidden="true"
            sx={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: STATE_DOT[state.tone],
            }}
          />
          {state.word}
        </Box>
      ) : (
        <Box
          component="span"
          sx={{
            color: GD.ink,
            fontSize: "14px",
            fontWeight: 600,
            fontVariantNumeric: "tabular-nums",
            overflowWrap: "anywhere",
          }}
        >
          {value ?? word ?? "Unavailable"}
        </Box>
      )}
      {sub ? (
        <Box component="span" sx={{ fontSize: "12px", color: GD.muted }}>
          {sub}
        </Box>
      ) : null}
      {verdict ? <VerdictChip verdict={verdict} size="S" /> : null}
    </Box>
  </Box>
)

export const IndexCard = (props: IndexCardProps) => {
  if (props.size === "S") return <Small {...props} />

  const {
    size,
    compact,
    name,
    value,
    word,
    verdict,
    state,
    sub,
    detail,
    comparison,
    chart,
    open,
    onToggle,
    id,
    controlsId,
    help,
  } = props
  const large = size === "L"
  const standardSize = {
    figure: large ? "34px" : "28px",
    word: large ? "22px" : "19px",
    padding: large ? "22px" : "20px",
    valueGap: large ? "22px" : "18px",
  }
  const figureSize = compact ? "22px" : standardSize.figure
  const wordSize = compact ? "18px" : standardSize.word
  const borderColor = compact ? GD.panelBorder : GD.border
  const valueColor = compact ? GD.accentInk : GD.ink
  const title = (
    <>
      <span>{name}</span>
      {onToggle ? <Chevron open={open} compact={compact} /> : null}
    </>
  )

  return (
    <Box
      component="article"
      sx={{
        position: "relative",
        height: "100%",
        minWidth: 0,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        padding: compact ? "12px" : standardSize.padding,
        border: `1px solid ${open ? GD.borderOpen : borderColor}`,
        borderRadius: compact ? "8px" : "16px",
        background: open ? GD.selected : GD.surface,
        transition: GD.transition,
        ...(onToggle
          ? {
              "&:hover": {
                borderColor: compact ? GD.borderOpen : GD.borderHover,
              },
              "&:focus-within": { borderColor: GD.link },
            }
          : {}),
      }}
    >
      <Box
        component={compact ? "h3" : "h4"}
        sx={{
          margin: 0,
          color: GD.text,
          fontSize: compact ? "12px" : "14px",
          lineHeight: compact ? 1.4 : 1.5,
          minHeight: compact ? "34px" : undefined,
          fontWeight: 600,
        }}
      >
        {onToggle ? (
          <Box
            component="button"
            id={id}
            type="button"
            aria-expanded={Boolean(open)}
            aria-controls={controlsId}
            aria-description={help}
            onClick={onToggle}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: compact ? "6px" : "12px",
              width: "100%",
              padding: 0,
              background: "none",
              border: 0,
              textAlign: "left",
              font: "inherit",
              color: "inherit",
              cursor: "pointer",
              outline: "none",
              "&::after": {
                content: '""',
                position: "absolute",
                inset: "-1px",
                borderRadius: compact ? "8px" : "16px",
              },
              "&:focus-visible::after": {
                outline: `2px solid ${GD.link}`,
                outlineOffset: "3px",
              },
            }}
          >
            {title}
          </Box>
        ) : (
          title
        )}
      </Box>
      <Box
        display="flex"
        alignItems="center"
        flexWrap="wrap"
        gap={compact ? "6px" : "10px"}
        sx={{
          marginTop: compact ? "6px" : standardSize.valueGap,
          marginBottom: "10px",
        }}
      >
        <Box
          component="span"
          sx={{
            color: state ? STATE_COLOR[state.tone] : valueColor,
            fontSize: state || !value ? wordSize : figureSize,
            fontWeight: 600,
            lineHeight: 1.15,
            letterSpacing: "-0.025em",
            fontVariantNumeric: "tabular-nums",
            overflowWrap: "anywhere",
          }}
        >
          {state?.word ?? value ?? word ?? "Unavailable"}
        </Box>
        {verdict ? (
          <VerdictChip verdict={verdict} size={compact ? "S" : size} />
        ) : null}
      </Box>
      {chart ? (
        // With an evidence line the chart sits on it, so charts align across a row.
        <Box
          sx={{
            marginTop: detail ? "auto" : "18px",
            paddingTop: detail ? "4px" : 0,
            marginBottom: detail ? "12px" : 0,
            pointerEvents: "none",
          }}
        >
          {chart}
        </Box>
      ) : null}
      {detail ? (
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            flexWrap: "wrap",
            gap: "4px 8px",
            marginTop: chart ? 0 : "auto",
            paddingTop: "8px",
            borderTop: `1px solid ${GD.panelBorder}`,
            fontSize: "12px",
            lineHeight: 1.4,
          }}
        >
          <Box component="span" sx={{ color: GD.muted }}>
            {detail.label}
          </Box>
          <Box
            component="span"
            sx={{
              color: GD.text,
              fontVariantNumeric: "tabular-nums",
              overflowWrap: "anywhere",
            }}
          >
            {detail.value}
          </Box>
        </Box>
      ) : null}
      {sub ? (
        <Box
          component="p"
          sx={{ margin: 0, fontSize: "13px", lineHeight: 1.5, color: GD.text }}
        >
          {sub}
        </Box>
      ) : null}
      {comparison ? (
        <Box
          component="p"
          sx={{
            margin: "auto 0 0",
            paddingTop: "18px",
            fontSize: "12px",
            lineHeight: 1.5,
            color: GD.muted,
          }}
        >
          {comparison}
        </Box>
      ) : null}
    </Box>
  )
}
