/* eslint-disable import/no-extraneous-dependencies */
import { PropsWithChildren } from "react"

import "@testing-library/jest-dom"
import { render, screen } from "@testing-library/react"
import {
  Market,
  MarketAccount,
  MarketVersion,
  Token,
} from "@wildcatfi/wildcat-sdk"
import { providers } from "ethers"

import { MarketTransactions } from "."
import { MarketTransactionsProps } from "./interface"

let mockDefaultStatus: boolean | undefined

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
jest.mock("@/store/hooks", () => ({ useAppDispatch: () => jest.fn() }))
jest.mock("@/hooks/useDefaultedMarkets", () => ({
  useDefaultedMarkets: () => ({
    isDefaulted: () => mockDefaultStatus,
    defaultedMarketsOfBorrower: () => [],
  }),
}))
jest.mock(
  "@/app/[locale]/borrower/hooks/getMaketsHooks/useGetBorrowerMarkets",
  () => ({
    useGetBorrowerMarkets: () => ({}),
  }),
)
jest.mock("@/components/MarketMoreMenu", () => ({
  MarketMoreMenu: () => null,
}))
jest.mock("@/components/TransactionBlock", () => ({
  TransactionBlock: ({ children }: PropsWithChildren) => children,
}))
jest.mock("../MarketDefaultNotice", () => ({
  MarketDefaultNotice: () => null,
}))
jest.mock("../Modals/AprModal", () => ({ AprModal: () => null }))
jest.mock("../Modals/CapacityModal", () => ({ CapacityModal: () => null }))
jest.mock("../Modals/MaturityModal", () => ({ MaturityModal: () => null }))
jest.mock("../Modals/MinimumDepositModal", () => ({
  MinimumDepositModal: () => null,
}))
jest.mock("../Modals/BorrowModal", () => ({
  BorrowModal: ({ disableBorrowBtn }: { disableBorrowBtn: boolean }) => (
    <button disabled={disableBorrowBtn}>Borrow</button>
  ),
}))
jest.mock("../Modals/RepayModal", () => ({
  RepayModal: ({ disableRepayBtn }: { disableRepayBtn: boolean }) => (
    <button disabled={disableRepayBtn}>Repay</button>
  ),
}))

it.each([undefined, true])(
  "blocks borrowing but allows repayment when default status is %s",
  (defaultStatus) => {
    mockDefaultStatus = defaultStatus
    const token = new Token(
      1,
      "0x0000000000000000000000000000000000000001",
      "Test USD",
      "USD",
      6,
      false,
      new providers.JsonRpcProvider(),
    )
    const market = {
      address: "0x0000000000000000000000000000000000000002",
      borrower: "0x0000000000000000000000000000000000000003",
      chainId: 1,
      version: MarketVersion.V1,
      underlyingToken: token,
      outstandingDebt: token.parseAmount("100"),
      borrowableAssets: token.parseAmount("10"),
      isClosed: false,
      reserveRatioBips: 0,
      originalReserveRatioBips: 0,
    } as Market
    const tree = () => (
      <MarketTransactions
        market={market}
        marketAccount={{ market } as MarketAccount}
        withdrawals={{} as MarketTransactionsProps["withdrawals"]}
        holdTheMarket={false}
      />
    )
    const { rerender } = render(tree())
    expect(screen.getByRole("button", { name: "Borrow" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Repay" })).toBeEnabled()

    if (defaultStatus === undefined) {
      mockDefaultStatus = false
      rerender(tree())
      expect(screen.getByRole("button", { name: "Borrow" })).toBeEnabled()
    }
  },
)
