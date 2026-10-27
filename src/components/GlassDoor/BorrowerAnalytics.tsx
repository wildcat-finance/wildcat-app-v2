import * as React from "react"

import { Box } from "@mui/material"
import Link from "next/link"

import { ROUTES } from "@/routes"

import {
  BorrowerAnalytics as BorrowerData,
  BorrowerMarketRow,
  useBorrowerAnalytics,
} from "./api"
import { borrowerCards, troubleOverTime } from "./borrowerCards"
import { BLANK, count, longDate, percent, score, tokens } from "./format"
import { AnalyticsSkeleton, Notice, SectionTitle, SnapshotLine } from "./Frame"
import { reader } from "./helpers"
import { IndexCard } from "./IndexCard"
import { CardRow } from "./IndexPanel"
import { GD, StateTone } from "./tokens"

// Borrower Analytics (education package §6, cut to cheat sheet v4): header
// facts, five book cards, one row per market as small chips, and trouble
// over time as rates rather than lifetime totals.

const marketState = (
  row: BorrowerMarketRow,
): { word: string; tone: StateTone } => {
  if (row.values.M77 === "Closed") return { word: "CLOSED", tone: "neutral" }
  if (row.values.M85 === 1) return { word: "PAST GRACE", tone: "bad" }
  if (row.values.M21 === 1) return { word: "LATE", tone: "warn" }
  return { word: "IN ORDER", tone: "good" }
}

const MarketRow = ({
  row,
  chainId,
}: {
  row: BorrowerMarketRow
  chainId: number
}) => {
  const { n, s } = reader(row.values)
  const deadlines = n("M30") ?? 0
  const asset = s("M02") ?? ""
  const neverLate = n("H02") === 0
  return (
    <Box
      component="li"
      sx={{
        display: "grid",
        gridTemplateColumns:
          "minmax(160px, 1.2fr) repeat(auto-fill, minmax(150px, max-content))",
        alignItems: "center",
        gap: "8px",
        padding: "10px 0",
        borderTop: `1px solid ${GD.border}`,
      }}
    >
      <Link
        href={`${ROUTES.lender.market}/${row.address}?chainId=${chainId}`}
        style={{ textDecoration: "none", color: GD.ink }}
      >
        <Box component="span" sx={{ fontSize: "13px", fontWeight: 600 }}>
          {row.symbol ?? row.address.slice(0, 10)}
        </Box>
        {row.name ? (
          <Box
            component="span"
            sx={{ display: "block", fontSize: "11px", color: GD.muted }}
          >
            {row.name}
          </Box>
        ) : null}
      </Link>
      {row.state !== "Ok" ? (
        <Box component="span" sx={{ fontSize: "11px", color: GD.muted }}>
          {row.state === "Preparing" ? "being prepared" : "under review"}
        </Box>
      ) : (
        <>
          <IndexCard
            size="S"
            name="In order"
            value={
              neverLate || n("M18") === undefined ? undefined : score(n("M18")!)
            }
            word={neverLate ? BLANK.neverLate : undefined}
          />
          <IndexCard
            size="S"
            name="Exits"
            value={deadlines ? percent(n("M32") ?? 0) : undefined}
            word={deadlines ? undefined : BLANK.noExits}
            sub={deadlines ? `of ${count(deadlines)}` : undefined}
          />
          <IndexCard size="S" name="Right now" state={marketState(row)} />
          <IndexCard
            size="S"
            name="Owed"
            value={`${tokens(n("M07") ?? 0)} ${asset}`}
          />
          <IndexCard size="S" name="APR" value={percent(n("M11") ?? 0)} />
        </>
      )}
    </Box>
  )
}

const Body = ({ borrower }: { borrower: BorrowerData }) => {
  const withheld = Object.keys(borrower.values).length === 0
  if (withheld) {
    return (
      <Box display="flex" flexDirection="column" gap="16px">
        <SnapshotLine
          publication={borrower.publication}
          labels={["under review"]}
        />
        <Notice>
          This borrower&apos;s figures are under review and are not shown at
          this block.
          {borrower.reason ? ` ${borrower.reason}.` : ""}
        </Notice>
      </Box>
    )
  }
  const { n, s } = reader(borrower.values)
  const { rowA } = borrowerCards(borrower)
  const trouble = troubleOverTime(borrower)
  const facts = [
    `${count(n("S01") ?? 0)} markets`,
    s("S02") ? `since ${longDate(Date.parse(s("S02")!) / 1_000)}` : undefined,
    `${count(n("MARKET_DAYS") ?? 0)} market-days on record`,
    n("S06") !== undefined && n("S07") !== undefined
      ? `markets run ${score(n("S06")!)} to ${score(n("S07")!)}`
      : undefined,
  ].filter(Boolean)
  return (
    <Box display="flex" flexDirection="column" gap="16px">
      <SnapshotLine
        publication={borrower.publication}
        labels={borrower.partial ? ["partial: some markets not included"] : []}
      />
      <Box component="p" sx={{ margin: 0, fontSize: "13px", color: GD.text }}>
        {facts.join(" · ")}
      </Box>

      <CardRow size="L" cards={rowA} />

      <Box display="flex" flexDirection="column" gap="4px">
        <SectionTitle>Markets</SectionTitle>
        <Box component="ul" sx={{ listStyle: "none", margin: 0, padding: 0 }}>
          {borrower.markets.map((row) => (
            <MarketRow
              key={row.address}
              row={row}
              chainId={borrower.borrower.chainId}
            />
          ))}
        </Box>
      </Box>

      {trouble.concentration || trouble.direction ? (
        <Box display="flex" flexDirection="column" gap="10px">
          <SectionTitle>Trouble over time</SectionTitle>
          <Box
            component="p"
            sx={{ margin: 0, fontSize: "12px", color: GD.muted }}
          >
            Rates, not lifetime totals, so a market&apos;s age does not read as
            guilt.
          </Box>
          <Box
            sx={{
              display: "grid",
              gap: "16px",
              gridTemplateColumns: { xs: "1fr", md: "2fr 1fr" },
              border: `1px solid ${GD.border}`,
              borderRadius: "20px",
              padding: "16px 18px",
            }}
          >
            {trouble.concentration ?? <Box />}
            {trouble.direction}
          </Box>
        </Box>
      ) : null}
    </Box>
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
  if (borrower.isLoading) return <AnalyticsSkeleton />
  if (borrower.isError || !borrower.data) {
    return (
      <Notice>Analytics could not be loaded. Please try again later.</Notice>
    )
  }
  if (borrower.data.status === "preparing") {
    return <Notice>Analytics for this borrower are being prepared.</Notice>
  }
  if (borrower.data.status === "unavailable") {
    return (
      <Notice>
        Analytics are not available for this borrower on this network.
      </Notice>
    )
  }
  return <Body borrower={borrower.data.data} />
}
