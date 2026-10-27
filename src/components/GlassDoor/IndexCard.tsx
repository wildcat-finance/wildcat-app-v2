import * as React from "react"

import { Box, Tooltip } from "@mui/material"

import { TooltipButton } from "@/components/TooltipButton"

import {
  GD,
  STATE_COLOR,
  STATE_DOT,
  StateTone,
  Verdict,
  VERDICT_STYLE,
} from "./tokens"

// One card for every index, at three sizes (design language v1, part 2).
// Reading order never changes: name, value, verdict, sub line, comparison.
// Large and medium expand into a panel shared by their row; small is an
// inline chip whose comparison moves into its tooltip.

export type CardSize = "L" | "M" | "S"

export type IndexCardProps = {
  size: CardSize
  name: string
  /** A shorter name for the small size ("Exits"). */
  shortName?: string
  /** Plain-language definition with the protocol term, for the help dot. */
  help?: string
  /** The formatted figure. Omit it to show `word` instead. */
  value?: string
  /** A blank as a word ("never late"), set in the value position. */
  word?: string
  verdict?: Verdict
  /** Right-now cards show a coloured state word instead of a value. */
  state?: { word: string; tone: StateTone }
  /** The second lens or the denominator. */
  sub?: string
  /** The comparison with its population. */
  comparison?: string
  /** A compact chart for the face (medium only). */
  chart?: React.ReactNode
  open?: boolean
  onToggle?: () => void
}

const CHIP_SIZE = {
  L: { fontSize: "10px", padding: "2px 8px", borderRadius: "10px" },
  M: { fontSize: "9.5px", padding: "2px 7px", borderRadius: "10px" },
  S: { fontSize: "9px", padding: "1px 6px", borderRadius: "8px" },
} as const

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
      ...CHIP_SIZE[size],
      ...VERDICT_STYLE[verdict],
      fontWeight: 700,
      letterSpacing: "0.05em",
      lineHeight: 1.4,
      whiteSpace: "nowrap",
      display: "inline-block",
    }}
  >
    {verdict}
  </Box>
)

const Chevron = ({ open }: { open?: boolean }) => (
  <Box
    component="span"
    aria-hidden
    sx={{
      fontSize: "11px",
      color: GD.muted,
      transform: open ? "rotate(180deg)" : "none",
      transition: "transform 160ms",
      lineHeight: 1,
    }}
  >
    ⌄
  </Box>
)

const chrome = (size: CardSize, open?: boolean, interactive?: boolean) => ({
  background: GD.surface,
  border: `1px solid ${open ? GD.borderOpen : GD.border}`,
  borderRadius: size === "S" ? "12px" : "20px",
  padding: { L: "16px 18px", M: "14px 16px", S: "8px 12px" }[size],
  transition: GD.transition,
  textAlign: "left" as const,
  width: "100%",
  font: "inherit",
  color: "inherit",
  cursor: interactive ? "pointer" : "default",
  ...(interactive && !open
    ? { "&:hover": { borderColor: GD.borderHover } }
    : {}),
  "&:focus-visible": { outline: `2px solid ${GD.link}`, outlineOffset: "2px" },
})

const VALUE_SIZE = {
  L: { figure: "28px", word: "20px" },
  M: { figure: "20px", word: "14px" },
} as const

const LargeOrMedium = (props: Omit<IndexCardProps, "shortName">) => {
  const {
    size,
    name,
    help,
    value,
    word,
    verdict,
    state,
    sub,
    comparison,
    chart,
    open,
    onToggle,
  } = props
  const large = size === "L"
  const valueSize = VALUE_SIZE[large ? "L" : "M"][value ? "figure" : "word"]
  const valueWeight = value || state ? 700 : 600
  const subLine = large ? sub : [sub, comparison].filter(Boolean).join(" · ")
  return (
    <Box
      component={onToggle ? "button" : "div"}
      type={onToggle ? "button" : undefined}
      aria-expanded={onToggle ? Boolean(open) : undefined}
      onClick={onToggle}
      sx={{
        ...chrome(size, open, Boolean(onToggle)),
        display: "flex",
        flexDirection: "column",
        gap: large ? "6px" : "4px",
        height: "100%",
      }}
    >
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        gap="6px"
      >
        <Box
          component="span"
          sx={{ fontSize: "11px", fontWeight: 600, color: GD.text }}
        >
          {name}
        </Box>
        {large && help ? (
          <Box component="span" onClick={(event) => event.stopPropagation()}>
            <TooltipButton value={help} />
          </Box>
        ) : null}
        {!large && onToggle ? <Chevron open={open} /> : null}
      </Box>

      <Box
        display="flex"
        alignItems="baseline"
        flexWrap="wrap"
        columnGap="8px"
        rowGap="2px"
      >
        {state ? (
          <Box
            component="span"
            sx={{
              fontSize: large ? "15px" : "13px",
              fontWeight: 700,
              color: STATE_COLOR[state.tone],
              letterSpacing: "0.02em",
            }}
          >
            {state.word}
          </Box>
        ) : (
          <Box
            component="span"
            sx={{
              fontSize: valueSize,
              fontWeight: valueWeight,
              color: GD.ink,
              lineHeight: 1.15,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {value ?? word}
          </Box>
        )}
        {verdict ? <VerdictChip verdict={verdict} size={size} /> : null}
      </Box>

      {subLine ? (
        <Box
          component="span"
          sx={{ fontSize: "11px", color: GD.text, lineHeight: 1.45 }}
        >
          {subLine}
        </Box>
      ) : null}
      {large && comparison ? (
        <Box
          component="span"
          sx={{ fontSize: "11px", color: GD.muted, lineHeight: 1.45 }}
        >
          {comparison}
        </Box>
      ) : null}
      {!large && chart ? <Box marginTop="4px">{chart}</Box> : null}
    </Box>
  )
}

type SmallProps = Pick<
  IndexCardProps,
  | "name"
  | "shortName"
  | "help"
  | "value"
  | "word"
  | "verdict"
  | "state"
  | "sub"
  | "comparison"
>

const Small = (props: SmallProps) => {
  const {
    name,
    shortName,
    value,
    word,
    verdict,
    state,
    sub,
    comparison,
    help,
  } = props
  const tooltip = [help, comparison].filter(Boolean).join(" · ")
  const chip = (
    <Box
      sx={{
        ...chrome("S"),
        display: "inline-flex",
        alignItems: "baseline",
        gap: "8px",
        width: "auto",
        whiteSpace: "nowrap",
      }}
    >
      <Box component="span" sx={{ fontSize: "11px", color: GD.text }}>
        {shortName ?? name}
      </Box>
      {state ? (
        <Box
          component="span"
          display="inline-flex"
          alignItems="center"
          gap="6px"
        >
          <Box
            component="span"
            sx={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: STATE_DOT[state.tone],
              alignSelf: "center",
            }}
          />
          <Box
            component="span"
            sx={{
              fontSize: "11px",
              fontWeight: 700,
              color: STATE_COLOR[state.tone],
            }}
          >
            {state.word}
          </Box>
        </Box>
      ) : (
        <Box
          component="span"
          sx={{
            fontSize: value ? "13px" : "11px",
            fontWeight: value ? 700 : 600,
            color: GD.ink,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value ?? word}
        </Box>
      )}
      {sub ? (
        <Box component="span" sx={{ fontSize: "11px", color: GD.muted }}>
          {sub}
        </Box>
      ) : null}
      {verdict ? <VerdictChip verdict={verdict} size="S" /> : null}
    </Box>
  )
  return tooltip ? (
    <Tooltip title={tooltip} placement="top">
      {chip}
    </Tooltip>
  ) : (
    chip
  )
}

export const IndexCard = (props: IndexCardProps) =>
  props.size === "S" ? <Small {...props} /> : <LargeOrMedium {...props} />
