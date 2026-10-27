import * as React from "react"
import { useId, useRef, useState } from "react"

import { Box } from "@mui/material"

import { IndexCard, IndexCardProps } from "./IndexCard"
import { GD } from "./tokens"

export type ComparisonChip = {
  label: string
  text: string
  chart?: React.ReactNode
}
export type Tell = { scope: "market" | "borrower" | "both"; text: string }

export type PanelContent = {
  /** Source references are retained in the model, not displayed as UI labels. */
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

const body = { fontSize: "14px", lineHeight: 1.65, color: GD.text, margin: 0 }
const heading = {
  fontSize: "14px",
  fontWeight: 600,
  color: GD.ink,
  margin: "0 0 12px",
}
const focus = {
  "&:focus-visible": { outline: `2px solid ${GD.link}`, outlineOffset: "3px" },
}

export const IndexPanel = ({
  name,
  content,
  id,
  labelledBy,
  onClose,
}: {
  name: string
  content: PanelContent
  id?: string
  labelledBy?: string
  onClose?: () => void
}) => {
  const [chip, setChip] = useState(0)
  const comparisonId = useId()
  const selected = content.chips[chip] ?? content.chips[0]
  return (
    <Box
      id={id}
      role="region"
      aria-label={labelledBy ? undefined : `${name} details`}
      aria-labelledby={labelledBy}
      onKeyDown={(event) => {
        if (event.key === "Escape" && onClose) {
          event.preventDefault()
          onClose()
        }
      }}
      sx={{
        border: `1px solid ${GD.borderOpen}`,
        borderRadius: "16px",
        background: GD.surface,
        padding: "22px",
        minWidth: 0,
      }}
    >
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        gap="16px"
        marginBottom="24px"
      >
        <Box component="h4" sx={{ ...heading, fontSize: "18px", margin: 0 }}>
          {name}
        </Box>
        {onClose ? (
          <Box
            component="button"
            type="button"
            onClick={onClose}
            aria-label={`Close ${name} details`}
            sx={{
              ...focus,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "36px",
              height: "36px",
              flex: "0 0 auto",
              border: 0,
              borderRadius: "50%",
              background: GD.track,
              color: GD.text,
              cursor: "pointer",
              "&:hover": { background: GD.accent },
            }}
          >
            <svg
              aria-hidden="true"
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
            >
              <path
                d="m5 5 8 8m0-8-8 8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </Box>
        ) : null}
      </Box>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr)",
          gap: "28px",
          "@container (min-width: 760px)": {
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
            gap: "32px",
          },
        }}
      >
        <Box
          sx={{
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            gap: "24px",
          }}
        >
          {content.chart ? <Box>{content.chart}</Box> : null}
          {content.numbers?.length ? (
            <Box component="dl" sx={{ margin: 0 }}>
              {content.numbers.map(([label, value]) => (
                <Box
                  key={label}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
                    gap: "16px",
                    padding: "10px 0",
                    borderBottom: `1px solid ${GD.border}`,
                    fontSize: "13px",
                    lineHeight: 1.5,
                  }}
                >
                  <Box component="dt" sx={{ color: GD.muted }}>
                    {label}
                  </Box>
                  <Box
                    component="dd"
                    sx={{
                      margin: 0,
                      textAlign: "right",
                      color: GD.ink,
                      fontWeight: 500,
                      fontVariantNumeric: "tabular-nums",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {value}
                  </Box>
                </Box>
              ))}
            </Box>
          ) : null}
          {content.chips.length ? (
            <Box>
              <Box
                role="group"
                aria-label={`Compare ${name}`}
                display="flex"
                gap="6px"
                flexWrap="wrap"
              >
                {content.chips.map((item, index) => (
                  <Box
                    key={item.label}
                    component="button"
                    type="button"
                    aria-pressed={index === chip}
                    aria-controls={comparisonId}
                    onClick={() => setChip(index)}
                    sx={{
                      ...focus,
                      font: "inherit",
                      fontSize: "12px",
                      fontWeight: 500,
                      padding: "9px 12px",
                      borderRadius: "8px",
                      cursor: "pointer",
                      border: `1px solid ${
                        index === chip ? GD.borderOpen : GD.border
                      }`,
                      background: index === chip ? GD.accent : GD.surface,
                      color: index === chip ? GD.accentInk : GD.text,
                      transition: GD.transition,
                    }}
                  >
                    {item.label}
                  </Box>
                ))}
              </Box>
              <Box
                id={comparisonId}
                aria-live="polite"
                component="p"
                sx={{ ...body, marginTop: "12px" }}
              >
                {selected?.text}
              </Box>
              {selected?.chart ? (
                <Box sx={{ marginTop: "14px" }}>{selected.chart}</Box>
              ) : null}
            </Box>
          ) : null}
        </Box>
        <Box
          sx={{
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            gap: "24px",
          }}
        >
          {content.formula.length ? (
            <Box component="section">
              <Box component="h5" sx={heading}>
                Calculation
              </Box>
              <Box
                component="ol"
                sx={{
                  ...body,
                  paddingLeft: "20px",
                  "& > li + li": { marginTop: "8px" },
                }}
              >
                {content.formula.map((step) => (
                  <Box
                    component="li"
                    key={step}
                    sx={{
                      fontVariantNumeric: "tabular-nums",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {step}
                  </Box>
                ))}
              </Box>
            </Box>
          ) : null}
          <Box component="p" sx={body}>
            {content.meaning}
          </Box>
          <Box
            component="section"
            sx={{ borderTop: `1px solid ${GD.border}`, paddingTop: "20px" }}
          >
            <Box component="h5" sx={heading}>
              Limitations
            </Box>
            <Box component="p" sx={body}>
              {content.doesNotTell}
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}

export type RowCard = {
  key: string
  card: Omit<IndexCardProps, "size" | "open" | "onToggle">
  panel?: PanelContent
}

/** The panel follows its card's visual row at every container width. */
export const CardRow = ({
  size,
  cards,
  compact = false,
  columns = 5,
}: {
  size: "L" | "M"
  cards: RowCard[]
  compact?: boolean
  columns?: 5 | 6
}) => {
  const [openKey, setOpenKey] = useState<string>()
  const rowId = useId()
  const root = useRef<HTMLDivElement>(null)
  const close = (buttonId: string) => {
    setOpenKey(undefined)
    root.current
      ?.querySelector<HTMLButtonElement>(`[id="${buttonId}"]`)
      ?.focus()
  }
  return (
    <Box
      ref={root}
      onKeyDown={(event) => {
        if (event.key === "Escape" && openKey && !event.defaultPrevented) {
          event.preventDefault()
          close(`${rowId}-${openKey}-button`)
        }
      }}
      sx={{ containerType: "inline-size", minWidth: 0 }}
    >
      <Box
        sx={{
          display: "grid",
          gap: compact ? "10px" : "16px",
          gridTemplateColumns: "minmax(0, 1fr)",
          [`@container (min-width: ${compact ? 320 : 560}px)`]: {
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          },
          ...(compact
            ? {
                "@container (min-width: 600px)": {
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                },
                "@container (min-width: 960px)": {
                  gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                },
              }
            : {}),
          ...(!compact && size === "L"
            ? {
                "@container (min-width: 880px)": {
                  gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
                },
              }
            : {}),
        }}
      >
        {cards.map((item, index) => {
          const buttonId = `${rowId}-${item.key}-button`
          const panelId = `${rowId}-${item.key}-panel`
          const open = item.key === openKey
          return (
            <React.Fragment key={item.key}>
              <Box
                sx={{
                  order: index * 2,
                  minWidth: 0,
                  ...(!compact && size === "L"
                    ? {
                        "@container (min-width: 880px)": {
                          gridColumn:
                            cards.length % 3 === 2 && index >= cards.length - 2
                              ? "span 3"
                              : "span 2",
                        },
                      }
                    : {}),
                }}
              >
                <IndexCard
                  {...item.card}
                  size={size}
                  compact={compact}
                  id={buttonId}
                  controlsId={item.panel && open ? panelId : undefined}
                  open={open}
                  onToggle={
                    item.panel
                      ? () =>
                          setOpenKey((current) =>
                            current === item.key ? undefined : item.key,
                          )
                      : undefined
                  }
                />
              </Box>
              {open && item.panel ? (
                <Box
                  sx={{
                    gridColumn: "1 / -1",
                    minWidth: 0,
                    order: index * 2 + 1,
                    [`@container (min-width: ${compact ? 320 : 560}px)`]: {
                      order: (Math.floor(index / 2) + 1) * 4 - 1,
                    },
                    ...(compact
                      ? {
                          "@container (min-width: 600px)": {
                            order: (Math.floor(index / 3) + 1) * 6 - 1,
                          },
                          "@container (min-width: 960px)": {
                            order:
                              (Math.floor(index / columns) + 1) * columns * 2 -
                              1,
                          },
                        }
                      : {}),
                    ...(!compact && size === "L"
                      ? {
                          "@container (min-width: 880px)": {
                            order: (Math.floor(index / 3) + 1) * 6 - 1,
                          },
                        }
                      : {}),
                  }}
                >
                  <IndexPanel
                    id={panelId}
                    labelledBy={buttonId}
                    name={item.card.name}
                    content={item.panel}
                    onClose={() => close(buttonId)}
                  />
                </Box>
              ) : null}
            </React.Fragment>
          )
        })}
      </Box>
    </Box>
  )
}
