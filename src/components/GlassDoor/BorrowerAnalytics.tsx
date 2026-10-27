import * as React from "react"

import { Box } from "@mui/material"
import Link from "next/link"

import { ROUTES } from "@/routes"

import {
  BorrowerAnalytics as BorrowerData,
  BorrowerMarketRow,
  useBorrowerAnalytics,
} from "./api"
import { troubleOverTime } from "./borrowerCards"
import { borrowerOverview } from "./borrowerOverview"
import { Rail } from "./charts"
import { count, display, longDate, percent, score, tokens } from "./format"
import {
  AnalyticsSkeleton,
  AnalyticsFrame,
  Notice,
  SectionTitle,
} from "./Frame"
import { reader } from "./helpers"
import { CardRow } from "./IndexPanel"
import { GD, STATE_COLOR, StateTone } from "./tokens"

export const marketState = (
  row: BorrowerMarketRow,
): { word: string; tone: StateTone } => {
  if (row.state !== "Ok")
    return {
      word: row.state === "Preparing" ? "Preparing" : "Under review",
      tone: "neutral",
    }
  if (row.values.M77 === "Closed") return { word: "Closed", tone: "neutral" }
  if (row.values.M85 === 1) return { word: "Penalty active", tone: "bad" }
  if (row.values.M21 === 1) return { word: "Cash short", tone: "warn" }
  if (row.values.M21 === 0 && row.values.M85 === 0)
    return { word: "In order", tone: "good" }
  return { word: "Unavailable", tone: "neutral" }
}

const HEADERS = [
  "Market",
  "Cash available",
  "Exits on time",
  "Status",
  "Owed",
  "APR",
]

const MarketRow = ({
  row,
  chainId,
}: {
  row: BorrowerMarketRow
  chainId: number
}) => {
  const { n, s } = reader(row.values)
  const deadlines = n("M30")
  const grade = n("M18")
  const exits = n("M32")
  const owed = n("M07")
  const apr = n("M11")
  const state = marketState(row)
  const available = row.state === "Ok"
  let availability: React.ReactNode = "Unavailable"
  if (available && grade !== undefined) {
    // The small form of the rail: 56 px, no labels; the figure follows it.
    availability = (
      <Box
        component="span"
        sx={{ display: "inline-flex", alignItems: "center", gap: "10px" }}
      >
        <Rail
          size="cell"
          value={grade}
          label={`Cash available ${percent(grade)}`}
          ids={["M18"]}
        />
        <Box component="span" sx={{ minWidth: "5ch" }}>
          {n("H02") === 0 ? "Never late" : `${score(grade)}%`}
        </Box>
      </Box>
    )
  }
  let exitRecord = "Unavailable"
  if (available && deadlines === 0) exitRecord = "No exit history"
  else if (available && deadlines !== undefined && exits !== undefined) {
    exitRecord = `${percent(exits)} of ${count(deadlines)}`
  }
  const cells: React.ReactNode[] = [
    <Box
      component={Link}
      key="name"
      href={`${ROUTES.lender.market}/${row.address}?chainId=${chainId}`}
      title={row.name ?? row.address}
      sx={{
        color: GD.ink,
        textDecoration: "none",
        fontWeight: 600,
        overflowWrap: "anywhere",
        "&:hover": { color: GD.link },
        "&:focus-visible": {
          outline: `2px solid ${GD.link}`,
          outlineOffset: "4px",
        },
      }}
    >
      {row.symbol ?? `${row.address.slice(0, 6)}…${row.address.slice(-4)}`}
    </Box>,
    availability,
    exitRecord,
    <Box
      component="span"
      key="state"
      sx={{ color: STATE_COLOR[state.tone], fontWeight: 500 }}
    >
      {state.word}
    </Box>,
    available && owed !== undefined && s("M02")
      ? `${tokens(owed)} ${s("M02")}`
      : "Unavailable",
    available && apr !== undefined ? percent(apr) : "Unavailable",
  ]
  return (
    <Box component="tr">
      {cells.map((cell, index) => (
        <Box
          component={index === 0 ? "th" : "td"}
          scope={index === 0 ? "row" : undefined}
          key={HEADERS[index]}
        >
          <Box component="span" aria-hidden className="mobile-label">
            {HEADERS[index]}
          </Box>
          <Box component="span">{cell}</Box>
        </Box>
      ))}
    </Box>
  )
}

const MarketsTable = ({ borrower }: { borrower: BorrowerData }) => (
  <Box sx={{ containerType: "inline-size", position: "relative" }}>
    <Box
      component="table"
      aria-label="Borrower markets"
      sx={{
        width: "100%",
        borderCollapse: "collapse",
        fontSize: "12px",
        lineHeight: 1.5,
        color: GD.text,
        fontVariantNumeric: "tabular-nums",
        "& th, & td": {
          padding: "9px 10px",
          borderBottom: `1px solid ${GD.panelBorder}`,
          textAlign: "right",
          verticalAlign: "middle",
        },
        "& th:first-of-type": { textAlign: "left" },
        "& td": { overflowWrap: "anywhere" },
        "& thead th": {
          background: GD.trackInBox,
          fontWeight: 500,
          fontSize: "12px",
          whiteSpace: "nowrap",
        },
        "& thead th:first-of-type": { borderRadius: "4px 0 0 0" },
        "& thead th:last-of-type": { borderRadius: "0 4px 0 0" },
        "& tbody th": { width: "18%" },
        "& tbody tr:last-of-type th, & tbody tr:last-of-type td": {
          borderBottom: 0,
        },
        "& .mobile-label": { display: "none" },
        "@container (max-width: 739px)": {
          "&, & tbody": { display: "block" },
          "& thead": {
            position: "absolute",
            width: 1,
            height: 1,
            maxWidth: 1,
            left: 0,
            overflow: "hidden",
            clipPath: "inset(50%)",
          },
          "& tbody": {
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
            gap: "10px",
          },
          "& tbody tr": {
            display: "block",
            border: `1px solid ${GD.panelBorder}`,
            borderRadius: "8px",
            padding: "10px",
          },
          "& tbody th, & tbody td": {
            width: "auto",
            display: "flex",
            justifyContent: "space-between",
            gap: "8px",
            textAlign: "right",
            padding: "4px 0",
            border: 0,
          },
          "& tbody th": {
            textAlign: "left",
            fontSize: "13px",
            marginBottom: "4px",
          },
          "& .mobile-label": {
            display: "inline",
            textAlign: "left",
            flexShrink: 0,
            fontWeight: 400,
          },
          "& tbody th .mobile-label": { display: "none" },
        },
      }}
    >
      <Box component="thead">
        <Box component="tr">
          {HEADERS.map((label) => (
            <Box key={label} component="th" scope="col">
              {label}
            </Box>
          ))}
        </Box>
      </Box>
      <Box component="tbody">
        {borrower.markets.map((row) => (
          <MarketRow
            key={row.address}
            row={row}
            chainId={borrower.borrower.chainId}
          />
        ))}
      </Box>
    </Box>
  </Box>
)

const panelStyle = {
  minWidth: 0,
  padding: "14px",
  border: `1px solid ${GD.panelBorder}`,
  borderRadius: "8px",
  background: GD.surface,
  display: "flex",
  flexDirection: "column",
  gap: "12px",
}

export const BorrowerAnalyticsView = ({
  borrower,
}: {
  borrower: BorrowerData
}) => {
  const { n, s } = reader(borrower.values)
  const { summary } = borrowerOverview(borrower)
  const trouble = troubleOverTime(borrower, true)
  const since = s("S02")
  const facts = [
    ["Funded markets", display(n("S01"), count)],
    ["Market-days", display(n("MARKET_DAYS"), count)],
    [
      "First market",
      since && Number.isFinite(Date.parse(since))
        ? longDate(Date.parse(since) / 1_000)
        : "Unavailable",
    ],
  ]
  let content = (
    <>
      {borrower.partial && (
        <Notice compact>
          Totals exclude markets whose data is unavailable.
        </Notice>
      )}
      <CardRow size="L" compact columns={6} cards={summary} />
      <Box component="section" sx={panelStyle}>
        <SectionTitle compact>Markets</SectionTitle>
        {borrower.markets.length ? (
          <MarketsTable borrower={borrower} />
        ) : (
          <Notice compact>No market records available.</Notice>
        )}
      </Box>
      <Box
        sx={{
          display: "grid",
          gap: "10px",
          gridTemplateColumns: "minmax(0, 1fr)",
          "@container (min-width: 740px)": {
            gridTemplateColumns: trouble.concentration
              ? "minmax(0, 1.6fr) minmax(0, 1fr)"
              : "minmax(0, 1fr)",
          },
        }}
      >
        {trouble.concentration && (
          <Box component="section" sx={panelStyle}>
            <SectionTitle compact>Cash short by market</SectionTitle>
            {trouble.concentration}
          </Box>
        )}
        <Box component="section" sx={panelStyle}>
          <SectionTitle compact>
            {trouble.direction ? "Book cash available" : "Book facts"}
          </SectionTitle>
          {trouble.direction}
          <Box
            component="dl"
            sx={{
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              ...(trouble.direction
                ? {
                    borderTop: `1px solid ${GD.panelBorder}`,
                    paddingTop: "12px",
                  }
                : {}),
            }}
          >
            {facts.map(([label, value]) => (
              <Box
                key={label}
                sx={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr) auto",
                  gap: "12px",
                  fontSize: "12px",
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
                    color: GD.text,
                    textAlign: "right",
                    fontVariantNumeric: "tabular-nums",
                    overflowWrap: "anywhere",
                  }}
                >
                  {value}
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </>
  )
  if (borrower.state === "Preparing") {
    content = <Notice compact>Borrower analytics are being prepared.</Notice>
  } else if (
    borrower.state === "UnderReview" ||
    Object.keys(borrower.values).length === 0
  ) {
    content = <Notice compact>Borrower analytics are under review.</Notice>
  }
  return (
    <AnalyticsFrame
      title="Borrower analytics"
      publication={borrower.publication}
      labels={borrower.partial ? ["Partial record"] : []}
    >
      {content}
    </AnalyticsFrame>
  )
}

export const BorrowerAnalytics = ({
  chainId,
  address,
}: {
  chainId?: number
  address?: string
}) => {
  const borrower = useBorrowerAnalytics(chainId, address)
  let content: React.ReactNode
  if (!chainId || !address || borrower.isLoading) {
    content = <AnalyticsSkeleton cards={6} compact />
  } else if (borrower.isError || !borrower.data) {
    content = (
      <Notice
        compact
        onRetry={() => {
          borrower.refetch()
        }}
      >
        Analytics could not be loaded.
      </Notice>
    )
  } else if (borrower.data.status === "preparing") {
    content = <Notice compact>Borrower analytics are being prepared.</Notice>
  } else if (borrower.data.status === "unavailable") {
    content = (
      <Notice compact>
        Borrower analytics are unavailable on this network.
      </Notice>
    )
  } else {
    return <BorrowerAnalyticsView borrower={borrower.data.data} />
  }
  return <AnalyticsFrame title="Borrower analytics">{content}</AnalyticsFrame>
}
