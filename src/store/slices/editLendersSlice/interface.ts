import { MarketDataT } from "@/app/[locale]/borrower/edit_lenders/lendersMock"

export type TEditLenders = {
  lenderFilter: string
  marketFilter: MarketDataT[]
  step: "edit" | "confirm"
}
