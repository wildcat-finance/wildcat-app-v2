import * as React from "react"
import { useState } from "react"

import { Box } from "@mui/material"

import { IndexCard, IndexCardProps } from "./IndexCard"
import { GD } from "./tokens"

// The expanded card: the calculation with this market's real numbers, the
// numbers themselves, comparison presets, what it means, what it tells you
// and what it does not. The order never changes.

export type ComparisonChip = {
  label: string
  text: string
}

export type Tell = { scope: "market" | "borrower" | "both"; text: string }

export type PanelContent = {
  /** Metric ids drawn on this card, for the panel header. */
  ids: string[]
  question: string
  formula: string[]
  numbers?: [string, string][]
  chart?: React.ReactNode
  chips: ComparisonChip[]
  meaning: string
  tells: Tell[]
  doesNotTell: string
}

const Label = ({ children }: { children: React.ReactNode }) => (
  <Box
    component="h4"
    sx={{
      margin: "0 0 6px",
      fontSize: "10px",
      fontWeight: 600,
      letterSpacing: "0.05em",
      textTransform: "uppercase",
      color: GD.muted,
    }}
  >
    {children}
  </Box>
)

const Section = ({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) => (
  <Box component="section">
    <Label>{label}</Label>
    {children}
  </Box>
)

const body = { fontSize: "13px", lineHeight: 1.55, color: GD.text, margin: 0 }

export const IndexPanel = ({
  name,
  content,
}: {
  name: string
  content: PanelContent
}) => {
  const [chip, setChip] = useState(0)
  const selected = content.chips[chip]
  return (
    <Box
      role="region"
      aria-label={`${name}: details`}
      sx={{
        border: `1px solid ${GD.border}`,
        borderRadius: "20px",
        background: GD.surface,
        padding: "18px 22px 20px",
        display: "flex",
        flexDirection: "column",
        gap: "18px",
        maxWidth: "880px",
      }}
    >
      <Box>
        <Label>{[name, ...content.ids].join(" · ")}</Label>
        <Box
          component="p"
          sx={{ ...body, fontSize: "15px", fontWeight: 600, color: GD.ink }}
        >
          {content.question}
        </Box>
      </Box>

      <Section label="Calculation">
        <Box component="ol" sx={{ ...body, paddingLeft: "20px" }}>
          {content.formula.map((step) => (
            <Box
              component="li"
              key={step}
              sx={{ fontVariantNumeric: "tabular-nums" }}
            >
              {step}
            </Box>
          ))}
        </Box>
      </Section>

      {content.numbers?.length || content.chart ? (
        <Section label="The numbers">
          {content.numbers?.length ? (
            <Box
              component="dl"
              sx={{
                ...body,
                display: "grid",
                gridTemplateColumns: "minmax(160px, max-content) 1fr",
                columnGap: "24px",
                rowGap: "2px",
              }}
            >
              {content.numbers.map(([key, value]) => (
                <React.Fragment key={key}>
                  <Box component="dt" sx={{ color: GD.muted }}>
                    {key}
                  </Box>
                  <Box
                    component="dd"
                    sx={{
                      margin: 0,
                      color: GD.ink,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {value}
                  </Box>
                </React.Fragment>
              ))}
            </Box>
          ) : null}
          {content.chart ? <Box marginTop="12px">{content.chart}</Box> : null}
        </Section>
      ) : null}

      {content.chips.length ? (
        <Section label="Compare">
          <Box display="flex" gap="6px" flexWrap="wrap" role="tablist">
            {content.chips.map((item, index) => (
              <Box
                key={item.label}
                component="button"
                type="button"
                role="tab"
                aria-selected={index === chip}
                onClick={() => setChip(index)}
                sx={{
                  font: "inherit",
                  fontSize: "11px",
                  fontWeight: 600,
                  padding: "4px 12px",
                  borderRadius: "10px",
                  cursor: "pointer",
                  border: `1px solid ${index === chip ? GD.ink : GD.border}`,
                  background: index === chip ? GD.ink : GD.surface,
                  color: index === chip ? GD.surface : GD.text,
                  transition: GD.transition,
                }}
              >
                {item.label}
              </Box>
            ))}
          </Box>
          {selected ? (
            <Box component="p" sx={{ ...body, marginTop: "8px" }}>
              {selected.text}
            </Box>
          ) : null}
        </Section>
      ) : null}

      <Section label="What it means">
        <Box component="p" sx={body}>
          {content.meaning}
        </Box>
      </Section>

      <Section label="What it tells you">
        <Box component="ul" sx={{ ...body, paddingLeft: 0, listStyle: "none" }}>
          {content.tells.map((tell) => (
            <Box
              component="li"
              key={tell.text}
              sx={{ display: "flex", gap: "8px" }}
            >
              <Box
                component="span"
                sx={{
                  flex: "0 0 auto",
                  fontSize: "10px",
                  lineHeight: "20px",
                  color: GD.muted,
                  minWidth: "64px",
                }}
              >
                [{tell.scope}]
              </Box>
              <span>{tell.text}</span>
            </Box>
          ))}
        </Box>
      </Section>

      <Section label="What it does not tell you">
        <Box component="p" sx={body}>
          {content.doesNotTell}
        </Box>
      </Section>
    </Box>
  )
}

export type RowCard = {
  key: string
  card: Omit<IndexCardProps, "size" | "open" | "onToggle">
  panel?: PanelContent
}

/**
 * A row of large (five across at 1280) or medium (four across) cards that
 * share one expanded panel under the row.
 */
export const CardRow = ({
  size,
  cards,
}: {
  size: "L" | "M"
  cards: RowCard[]
}) => {
  const [openKey, setOpenKey] = useState<string>()
  const open = cards.find((item) => item.key === openKey)
  return (
    <Box display="flex" flexDirection="column" gap="12px">
      <Box
        sx={{
          display: "grid",
          gap: "12px",
          gridTemplateColumns: `repeat(auto-fill, minmax(${
            size === "L" ? 176 : 200
          }px, 1fr))`,
        }}
      >
        {cards.map((item) => (
          <IndexCard
            key={item.key}
            size={size}
            {...item.card}
            open={item.key === openKey}
            onToggle={
              item.panel
                ? () =>
                    setOpenKey((current) =>
                      current === item.key ? undefined : item.key,
                    )
                : undefined
            }
          />
        ))}
      </Box>
      {open?.panel ? (
        <IndexPanel key={open.key} name={open.card.name} content={open.panel} />
      ) : null}
    </Box>
  )
}
