import {
  getPositionMarketStatus,
  PortfolioHealthTerm,
} from "@/app/[locale]/lender/profile/components/LenderProfileOverviewTab/ProfileHealthTable/interface"
import { LenderInterestBreakdownEntry } from "@/app/[locale]/lender/profile/hooks/types"

// One market the lender holds a position in, rendered as a card. Mirrors the
// PortfolioHealthRow data model, plus the per-market interest breakdown used by
// the expanded "Interest status / Interest source" section.
export type MarketCardData = {
  id: string
  marketId: string
  name: string
  borrower: string
  borrowerName: string | undefined
  status: ReturnType<typeof getPositionMarketStatus>
  term: PortfolioHealthTerm
  asset: string
  balance: number
  deposited: number
  interest: number
  apr: number
  breakdown: LenderInterestBreakdownEntry | undefined
}
