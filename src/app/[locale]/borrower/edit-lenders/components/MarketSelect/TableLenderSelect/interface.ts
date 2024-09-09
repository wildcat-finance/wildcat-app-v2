import { Dispatch, SetStateAction } from "react"

import { MarketDataT } from "@/app/[locale]/borrower/edit-lenders/lendersMock"

import { LenderTableT, MarketTableT } from "../../../interface"

export type TableLenderSelectProps = {
  borrowerMarkets: MarketDataT[]
  lenderMarkets: MarketTableT[]
  lenderAddress: string
  setLendersRows: Dispatch<SetStateAction<LenderTableT[]>>
  handleAddAllMarkets: (
    event: React.ChangeEvent<HTMLInputElement>,
    lenderAddress: string,
    existingMarkets: MarketTableT[],
  ) => void
  disabled: boolean
}
