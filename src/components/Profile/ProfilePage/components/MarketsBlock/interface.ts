import { Market } from "@wildcatfi/wildcat-sdk"

import {
  MobileMarketSortDir,
  MobileMarketSortField,
} from "@/components/Mobile/MobileMarketList"

export type MarketsBlockProps = {
  markets?: Market[]
  isLoading?: boolean
  mobileSort?: { field: MobileMarketSortField; dir: MobileMarketSortDir }
}
