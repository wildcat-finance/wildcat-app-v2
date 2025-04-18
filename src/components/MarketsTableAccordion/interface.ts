import { ReactNode } from "react"

import { SmallFilterSelectItem } from "@/components/SmallFilterSelect"
import { MarketStatus } from "@/utils/marketStatus"

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
