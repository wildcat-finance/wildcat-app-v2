import { ReactNode } from "react"

import { MarketStatus } from "@/utils/marketStatus"
import { SmallFilterSelectItem } from "@/components/SmallFilterSelect"

export type MarketsTableAccordionProps = {
  isOpen?: boolean
  isLoading: boolean

  label: string
  marketsLength?: number
  type?: string
  noMarketsTitle?: string
  noMarketsSubtitle?: string

  showNoFilteredMarkets?: boolean
  statusFilter?: MarketStatus[]
  assetFilter?: SmallFilterSelectItem[]
  nameFilter?: string

  children: ReactNode
}
