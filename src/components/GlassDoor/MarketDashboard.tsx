import * as React from "react"
import { useId, useRef, useState } from "react"

import { Box } from "@mui/material"
import Link from "next/link"

import { ROUTES } from "@/routes"

import type { BorrowerAnalytics, MarketAnalytics, Publication } from "./api"
import { CountedSquares, RangeStrip } from "./charts"
import { count, display, percent } from "./format"
import { AnalyticsFrame } from "./Frame"
import { reader } from "./helpers"
import { CardRow, IndexPanel } from "./IndexPanel"
import { marketOverview } from "./marketOverview"
import { GD } from "./tokens"

const panelStyle = {
  minWidth: 0,
  padding: "14px",
  border: `1px solid ${GD.panelBorder}`,
  borderRadius: "8px",
  background: GD.surface,
}
const headingStyle = {
  margin: 0,
  fontSize: "15px",
  lineHeight: 1.4,
  fontWeight: 600,
  color: GD.text,
}
const buttonStyle = {
  padding: 0,
  border: 0,
  borderRadius: "3px",
  background: "none",
  font: "inherit",
  color: "inherit",
  textAlign: "left",
  cursor: "pointer",
  "&:hover": { color: GD.accentInk },
  "&:focus-visible": { outline: `2px solid ${GD.link}`, outlineOffset: "3px" },
}

export const MarketAnalyticsFrame = ({
  publication,
  closed,
  children,
}: {
  publication?: Publication
  closed?: boolean
  children: React.ReactNode
}) => (
  <AnalyticsFrame
    title="Market analytics"
    publication={publication}
    labels={closed ? ["Closed · history frozen"] : []}
  >
    {children}
  </AnalyticsFrame>
)

export const MarketDashboard = ({
  market,
  borrower,
  comparisonUnavailable,
}: {
  market: MarketAnalytics
  borrower?: BorrowerAnalytics
  comparisonUnavailable?: boolean
}) => {
  const { summary, funding, facts, details } = marketOverview(market, borrower)
  const [openKey, setOpenKey] = useState<string>()
  const opener = useRef<HTMLButtonElement | null>(null)
  const detailId = useId()
  const open = [...summary, ...details].find((item) => item.key === openKey)
  const close = () => {
    setOpenKey(undefined)
    opener.current?.focus()
  }
  const toggle = (key: string, button: HTMLButtonElement) => {
    opener.current = button
    setOpenKey((current) => (current === key ? undefined : key))
  }
  const disclosure = (key: string) => ({
    "aria-expanded": openKey === key,
    "aria-controls": openKey === key ? detailId : undefined,
    onClick: (event: React.MouseEvent<HTMLButtonElement>) =>
      toggle(key, event.currentTarget),
  })
  const { total } = funding
  const borrowerAddress = market.flags.borrower
  const book = borrower ? reader(borrower.values) : undefined
  const noBookHistory = book?.n("MARKET_DAYS") === 0
  const rangeLow = noBookHistory ? undefined : book?.n("S06")
  const rangeHigh = noBookHistory ? undefined : book?.n("S07")
  const { n } = reader(market.values)
  const bookCash = noBookHistory ? undefined : book?.n("S05")
  const marketCash =
    n("H01") !== undefined && n("H01")! > 0 ? n("M18") : undefined
  let comparisonMessage = "Borrower comparison unavailable."
  if (borrower?.partial) {
    comparisonMessage =
      "Borrower totals exclude markets whose data is unavailable."
  } else if (comparisonUnavailable) {
    comparisonMessage =
      "Borrower comparisons are unavailable for this snapshot."
  }
  const comparison = [
    ["Book cash available", display(bookCash, percent)],
    ["This market", display(marketCash, percent)],
    [
      "Book range",
      rangeLow !== undefined && rangeHigh !== undefined
        ? `${percent(rangeLow)}–${percent(rangeHigh)}`
        : "Unavailable",
    ],
  ]
  return (
    <>
      <CardRow size="L" compact cards={summary} />
      <Box
        onKeyDown={(event) => {
          if (event.key === "Escape" && openKey && !event.defaultPrevented) {
            event.preventDefault()
            close()
          }
        }}
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          minWidth: 0,
        }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr)",
            gap: "10px",
            "@container (min-width: 680px)": {
              gridTemplateColumns: "minmax(0, 1.6fr) minmax(0, 1fr)",
            },
          }}
        >
          <Box
            component="section"
            aria-label="Withdrawal funding"
            sx={panelStyle}
          >
            <Box component="h3" sx={{ ...headingStyle, marginBottom: "16px" }}>
              <Box
                component="button"
                type="button"
                sx={buttonStyle}
                {...disclosure("2.3")}
              >
                Withdrawal funding{" "}
                <Box
                  component="span"
                  aria-hidden
                  sx={{ color: GD.muted, fontSize: "12px" }}
                >
                  {openKey === "2.3" ? "⌃" : "⌄"}
                </Box>
              </Box>
            </Box>
            {total !== undefined && total > 0 && funding.groups.length > 0 && (
              // One square per payout deadline, in the ledger's colours.
              <Box sx={{ marginBottom: "14px" }}>
                <CountedSquares
                  legend={false}
                  groups={funding.groups.map((group) => ({
                    count: group.value,
                    color: group.color,
                    label: `${group.label} ${count(group.value)}`,
                  }))}
                  ids={["M30", "M31", "D18"]}
                />
              </Box>
            )}
            <Box
              component="dl"
              sx={{ margin: 0, fontSize: "12px", lineHeight: 1.5 }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "12px",
                  paddingBottom: "8px",
                  borderBottom: `1px solid ${GD.panelBorder}`,
                }}
              >
                <Box component="dt" sx={{ color: GD.muted }}>
                  Total deadlines
                </Box>
                <Box
                  component="dd"
                  sx={{ margin: 0, fontVariantNumeric: "tabular-nums" }}
                >
                  {display(total, count)}
                </Box>
              </Box>
              {funding.groups.map((group) => (
                <Box
                  key={group.label}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1fr) auto 54px",
                    alignItems: "baseline",
                    gap: "8px",
                    marginTop: "8px",
                  }}
                >
                  <Box component="dt" sx={{ color: GD.text }}>
                    <Box
                      component="span"
                      aria-hidden
                      sx={{
                        display: "inline-block",
                        width: "7px",
                        height: "7px",
                        borderRadius: "2px",
                        background: group.color,
                        marginRight: "7px",
                      }}
                    />
                    {group.label}
                  </Box>
                  <Box
                    component="dd"
                    sx={{
                      margin: 0,
                      fontVariantNumeric: "tabular-nums",
                      textAlign: "right",
                    }}
                  >
                    {count(group.value)}
                  </Box>
                  <Box
                    component="dd"
                    sx={{
                      margin: 0,
                      color: GD.muted,
                      fontVariantNumeric: "tabular-nums",
                      textAlign: "right",
                    }}
                  >
                    {total ? percent((group.value / total) * 100) : "—"}
                  </Box>
                </Box>
              ))}
            </Box>
            {total === 0 && (
              <Box
                sx={{ fontSize: "12px", color: GD.muted, marginTop: "12px" }}
              >
                No exit history yet
              </Box>
            )}
          </Box>
          <Box component="section" aria-label="Market facts" sx={panelStyle}>
            <Box component="h3" sx={{ ...headingStyle, marginBottom: "12px" }}>
              Market facts
            </Box>
            <Box
              component="dl"
              sx={{
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: "7px",
              }}
            >
              {facts.map((fact) => (
                <Box
                  key={fact.label}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1fr) auto",
                    alignItems: "baseline",
                    gap: "12px",
                    fontSize: "12px",
                    lineHeight: 1.5,
                  }}
                >
                  <Box component="dt" sx={{ color: GD.muted }}>
                    {fact.detailKey ? (
                      <Box
                        component="button"
                        type="button"
                        sx={buttonStyle}
                        {...disclosure(fact.detailKey)}
                      >
                        {fact.label}{" "}
                        <Box
                          component="span"
                          aria-hidden
                          sx={{ fontSize: "10px" }}
                        >
                          ⌄
                        </Box>
                      </Box>
                    ) : (
                      fact.label
                    )}
                  </Box>
                  <Box
                    component="dd"
                    sx={{
                      margin: 0,
                      color: GD.text,
                      fontWeight: 500,
                      textAlign: "right",
                      fontVariantNumeric: "tabular-nums",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {fact.value}
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
        {open?.panel && (
          <IndexPanel
            id={detailId}
            name={open.card.name}
            content={open.panel}
            onClose={close}
          />
        )}
      </Box>
      {borrowerAddress && (
        <Box
          component="section"
          aria-label="Borrower comparison"
          sx={panelStyle}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "8px",
              marginBottom: "10px",
            }}
          >
            <Box component="h3" sx={headingStyle}>
              Borrower comparison
            </Box>
            <Box
              component={Link}
              href={`${ROUTES.lender.profile}/${borrowerAddress}?chainId=${market.market.chainId}#analytics`}
              sx={{
                ...buttonStyle,
                color: GD.accentInk,
                fontSize: "12px",
                textDecoration: "none",
                "&:hover": { textDecoration: "underline" },
              }}
            >
              Borrower profile →
            </Box>
          </Box>
          {borrower && !borrower.partial ? (
            <>
              <Box
                component="dl"
                sx={{
                  margin: 0,
                  display: "grid",
                  gap: "12px",
                  gridTemplateColumns: "minmax(0, 1fr)",
                  "@container (min-width: 500px)": {
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  },
                }}
              >
                {comparison.map(([label, value], index) => (
                  <Box
                    key={label}
                    sx={{
                      minWidth: 0,
                      ...(index > 0
                        ? {
                            borderTop: `1px solid ${GD.panelBorder}`,
                            paddingTop: "10px",
                            "@container (min-width: 500px)": {
                              borderTop: 0,
                              paddingTop: 0,
                              borderLeft: `1px solid ${GD.panelBorder}`,
                              paddingLeft: "16px",
                            },
                          }
                        : {}),
                    }}
                  >
                    <Box
                      component="dt"
                      sx={{
                        fontSize: "12px",
                        lineHeight: 1.5,
                        color: GD.muted,
                      }}
                    >
                      {label}
                    </Box>
                    <Box
                      component="dd"
                      sx={{
                        margin: "4px 0 0",
                        color: GD.accentInk,
                        fontSize: "20px",
                        fontWeight: 600,
                        lineHeight: 1.3,
                        fontVariantNumeric: "tabular-nums",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {value}
                    </Box>
                  </Box>
                ))}
              </Box>
              {rangeLow !== undefined &&
                rangeHigh !== undefined &&
                bookCash !== undefined &&
                marketCash !== undefined && (
                  <Box
                    sx={{
                      marginTop: "16px",
                      paddingTop: "14px",
                      borderTop: `1px solid ${GD.panelBorder}`,
                    }}
                  >
                    <RangeStrip
                      low={rangeLow}
                      high={rangeHigh}
                      book={bookCash}
                      current={marketCash}
                      ids={["S05", "S06", "S07", "M18"]}
                    />
                  </Box>
                )}
            </>
          ) : (
            <Box
              role="status"
              sx={{ fontSize: "12px", lineHeight: 1.5, color: GD.muted }}
            >
              {comparisonMessage}
            </Box>
          )}
        </Box>
      )}
    </>
  )
}
