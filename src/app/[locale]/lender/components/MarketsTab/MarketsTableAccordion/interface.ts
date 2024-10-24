import { ReactNode } from "react"

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
  assetFilter?: { name: string; address: string }[]
  nameFilter?: string

  children: ReactNode
}
