import { useState } from "react"

import gd from "@/components/GlassDoor/analytics.module.css"
import { BorrowerAnalytics, MarketAnalytics } from "@/components/GlassDoor/api"
import { BorrowerAnalyticsView } from "@/components/GlassDoor/BorrowerAnalytics"
import { CardSpec } from "@/components/GlassDoor/card"
import { sameSnapshot } from "@/components/GlassDoor/MarketAnalytics"
import { MarketDashboard } from "@/components/GlassDoor/MarketDashboard"

import { CardSet } from "./MetricItem"
import s from "./review.module.css"
import { ReviewConfiguration } from "./reviewState"
import { CARD_GROUPS, chosenTreatment, ReviewScope } from "./treatmentData"
import { CardPreview } from "./treatments"

export const PagePreview = ({
  market,
  borrower,
  borrowerName,
  typeLabels,
  cards,
  review,
  scope = "market",
  onScope,
  marketReason = "Market analytics are unavailable at this snapshot.",
  borrowerReason = "Borrower analytics are unavailable at this snapshot.",
  onBack,
}: {
  market?: MarketAnalytics
  borrower?: BorrowerAnalytics
  borrowerName: string
  typeLabels?: string[]
  cards: CardSet
  review: ReviewConfiguration
  scope?: ReviewScope
  onScope?: (scope: ReviewScope) => void
  marketReason?: string
  borrowerReason?: string
  onBack: () => void
}) => {
  const [phone, setPhone] = useState(false)
  const renderCards = (specs: CardSpec[], label: string, columns: number) => (
    <div
      className={`${gd.grid} ${columns === 4 ? gd.grid4 : ""}`}
      role="group"
      aria-label={label}
    >
      {specs.map((spec) => (
        <CardPreview
          key={spec.id}
          spec={spec}
          datum={cards.treatments?.[spec.id]}
          code={chosenTreatment(review.picks, spec.id)}
          comparison={review.comparisons[spec.id] !== false}
        />
      ))}
    </div>
  )
  const ready = scope === "market" ? Boolean(market) : Boolean(borrower)
  return (
    <section aria-label={`Chosen ${scope} page`}>
      <div className={s.workspaceHead}>
        <h1>Page preview</h1>
        <button className={s.button} onClick={onBack}>
          Back to cards
        </button>
      </div>
      <div className={s.workspaceTools}>
        {onScope ? (
          <div className={s.segmented} role="group" aria-label="Preview page">
            {CARD_GROUPS.map((group) => (
              <button
                key={group.key}
                aria-pressed={scope === group.key}
                onClick={() => onScope(group.key)}
              >
                {group.label}
              </button>
            ))}
          </div>
        ) : null}
        <div className={s.segmented} role="group" aria-label="Preview size">
          <button aria-pressed={!phone} onClick={() => setPhone(false)}>
            Desktop
          </button>
          <button aria-pressed={phone} onClick={() => setPhone(true)}>
            Phone
          </button>
        </div>
      </div>
      {ready ? (
        <div className={`${s.productPreview} ${phone ? s.phonePreview : ""}`}>
          {scope === "market" && market ? (
            <MarketDashboard
              market={market}
              borrower={
                borrower && sameSnapshot(market, borrower)
                  ? borrower
                  : undefined
              }
              borrowerName={borrowerName}
              typeLabels={typeLabels}
              renderCards={renderCards}
            />
          ) : null}
          {scope === "borrower" && borrower ? (
            <BorrowerAnalyticsView
              borrower={borrower}
              renderCards={renderCards}
            />
          ) : null}
        </div>
      ) : (
        <p role="status">
          {scope === "market" ? marketReason : borrowerReason}
        </p>
      )}
    </section>
  )
}
