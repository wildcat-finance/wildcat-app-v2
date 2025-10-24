import { BorrowerProfile } from "@/app/api/profiles/interface"

export type OverallSectionProps = Partial<BorrowerProfile> & {
  marketsAmount?: number
  totalBorrowedAmount?: string
  defaults?: string
  isMarketPage?: boolean
}
