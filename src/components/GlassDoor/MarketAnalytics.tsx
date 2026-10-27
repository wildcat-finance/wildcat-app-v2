import * as React from "react"

import { Box } from "@mui/material"
import Link from "next/link"

import { ROUTES } from "@/routes"

import {
  BorrowerAnalytics,
  MarketAnalytics as MarketData,
  useBorrowerAnalytics,
  useMarketAnalytics,
} from "./api"
import { borrowerNow } from "./borrowerCards"
import { BLANK, count, of, percent, score } from "./format"
import { AnalyticsSkeleton, Notice, SectionTitle, SnapshotLine } from "./Frame"
import { reader } from "./helpers"
import { CardRow, RowCard } from "./IndexPanel"
import { marketCards } from "./marketCards"
import { GD } from "./tokens"

// Market Analytics (education package §6, cut to cheat sheet v4): the five
// record and state cards, where this market sits in its borrower's book, the
// operator row and four supporting cards. Every figure is from one block.

/** The borrower's book in one medium row, linking to Borrower Analytics. */
function operatorRow(borrower: BorrowerAnalytics): RowCard[] {
  const { n } = reader(borrower.values)
  const deadlines = n("S14") ?? 0
  const completed = n("S30") ?? 0
  const now = borrowerNow(borrower)
  return [
    {
      key: "book",
      card: {
        name: "Book in order",
        value: n("S05") === undefined ? undefined : score(n("S05")!),
        word: n("S05") === undefined ? BLANK.neverLate : undefined,
        sub:
          n("D21") === undefined
            ? undefined
            : `contract kept ${score(n("D21")!)}`,
        comparison: borrower.comparisons.S05
          ? `median ${score(borrower.comparisons.S05.median)}`
          : undefined,
      },
    },
    {
      key: "book-exits",
      card: {
        name: "Book exits paid on time",
        value: deadlines ? percent(n("S16") ?? 0) : undefined,
        word: deadlines ? undefined : BLANK.noExits,
        sub: deadlines ? of(deadlines, "deadline") : undefined,
      },
    },
    {
      key: "book-now",
      card: {
        name: "Right now, all markets",
        state: now.state,
        sub: now.sub,
      },
    },
    {
      key: "completed",
      card: {
        name: "Completed facilities",
        value: completed ? count(completed) : undefined,
        word: completed ? undefined : BLANK.noneCompleted,
        sub: completed
          ? `${count(n("S33") ?? 0)} of ${count(completed)} verified`
          : "everything still running",
      },
    },
  ]
}

const Banner = ({
  market,
  position,
}: {
  market: MarketData
  position: NonNullable<ReturnType<typeof marketCards>["position"]>
}) => (
  <Box
    sx={{
      borderRadius: "12px",
      background: GD.trackInBox,
      padding: "10px 16px",
      fontSize: "13px",
      color: GD.text,
    }}
  >
    This is the borrower&apos;s {position.word} market of{" "}
    {count(position.count)} on In order: {score(Number(market.values.M18))}{" "}
    against their range of {score(position.min)} to {score(position.max)}.
  </Box>
)

const Body = ({
  market,
  borrower,
}: {
  market: MarketData
  borrower?: BorrowerAnalytics
}) => {
  const withheld = Object.keys(market.values).length === 0
  if (withheld) {
    return (
      <Box display="flex" flexDirection="column" gap="16px">
        <SnapshotLine
          publication={market.publication}
          labels={["under review"]}
        />
        <Notice>
          This market&apos;s figures are under review and are not shown at this
          block.
          {market.reason ? ` ${market.reason}.` : ""}
        </Notice>
      </Box>
    )
  }
  const { rowA, supporting, position } = marketCards(market, borrower)
  const labels = [
    ...(market.state === "UnderReview" ? ["under review"] : []),
    ...(market.values.M77 === "Closed" ? ["closed · figures final"] : []),
  ]
  const borrowerAddress = market.flags.borrower
  return (
    <Box display="flex" flexDirection="column" gap="16px">
      <SnapshotLine publication={market.publication} labels={labels} />
      {market.state === "UnderReview" && market.reason ? (
        <Notice>Under review: {market.reason}.</Notice>
      ) : null}

      <CardRow size="L" cards={rowA} />

      {position ? <Banner market={market} position={position} /> : null}

      {borrower ? (
        <Box display="flex" flexDirection="column" gap="10px">
          <Box
            display="flex"
            alignItems="baseline"
            justifyContent="space-between"
          >
            <SectionTitle>The operator</SectionTitle>
            {borrowerAddress ? (
              <Link
                href={`${ROUTES.lender.profile}/${borrowerAddress}`}
                style={{
                  fontSize: "12px",
                  color: GD.link,
                  textDecoration: "none",
                }}
              >
                Borrower analytics
              </Link>
            ) : null}
          </Box>
          <CardRow size="M" cards={operatorRow(borrower)} />
        </Box>
      ) : null}

      <Box display="flex" flexDirection="column" gap="10px">
        <SectionTitle>Supporting evidence</SectionTitle>
        <CardRow size="M" cards={supporting} />
      </Box>
    </Box>
  )
}

export const MarketAnalytics = ({
  chainId,
  address,
  borrowerAddress,
}: {
  chainId?: number
  address?: string
  borrowerAddress?: string
}) => {
  const market = useMarketAnalytics(chainId, address)
  const borrower = useBorrowerAnalytics(chainId, borrowerAddress)

  if (market.isLoading) return <AnalyticsSkeleton />
  if (market.isError || !market.data) {
    return (
      <Notice>Analytics could not be loaded. Please try again later.</Notice>
    )
  }
  if (market.data.status === "preparing") {
    return <Notice>Analytics for this market are being prepared.</Notice>
  }
  if (market.data.status === "unavailable") {
    return <Notice>Analytics are not available for this market.</Notice>
  }
  return (
    <Body
      market={market.data.data}
      borrower={borrower.data?.status === "ok" ? borrower.data.data : undefined}
    />
  )
}
