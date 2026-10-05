/* eslint-disable import/no-extraneous-dependencies */
import { fireEvent, render, screen, within } from "@testing-library/react"
import {
  MarketAccount,
  RecoverUnderlyingStatus,
  Token,
  SignerOrProvider,
} from "@wildcatfi/wildcat-sdk"

import { RecoverUnderlyingModal } from "./index"

const mutate = jest.fn()
const quote = {
  data: undefined as unknown,
  isError: false,
  isFetching: false,
  refetch: jest.fn(),
}
jest.mock("../../../hooks/useRecoverUnderlying", () => ({
  useRecoverUnderlying: () => ({
    mutate,
    reset: jest.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
  }),
  useRecoverUnderlyingQuote: () => quote,
}))
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
jest.mock("@/components/TxModalComponents/TxModalHeader", () => ({
  TxModalHeader: () => null,
}))
jest.mock("@/components/TxModalComponents/TxModalFooter", () => ({
  TxModalFooter: (props: {
    mainBtnText: string
    mainBtnOnClick: () => void
    disableMainBtn: boolean
  }) => (
    <button
      type="button"
      disabled={props.disableMainBtn}
      onClick={props.mainBtnOnClick}
    >
      {props.mainBtnText}
    </button>
  ),
}))
jest.mock("../FinalModals/LoadingModal", () => ({ LoadingModal: () => null }))
jest.mock("../FinalModals/ErrorModal", () => ({ ErrorModal: () => null }))
jest.mock("../FinalModals/SuccessModal", () => ({ SuccessModal: () => null }))

const token = new Token(
  11155111,
  "0x1111111111111111111111111111111111111111",
  "Asset",
  "AST",
  6,
  false,
  {} as SignerOrProvider,
)
const account = {
  isBorrower: true,
  market: { repaymentDate: 0, isClosed: true, underlyingToken: token },
} as MarketAccount

describe("surplus recovery confirmation", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    quote.data = {
      status: RecoverUnderlyingStatus.Ready,
      amount: token.parseAmount("1.000001"),
    }
    quote.isError = false
    quote.isFetching = false
  })

  it.each(["stale", "refreshing", "empty"])(
    "blocks confirmation when the quote is %s",
    (state) => {
      quote.isError = state === "stale"
      quote.isFetching = state === "refreshing"
      if (state === "empty")
        quote.data = {
          status: RecoverUnderlyingStatus.NoRecoverableUnderlying,
          amount: token.getAmount(0),
        }
      render(<RecoverUnderlyingModal marketAccount={account} />)
      fireEvent.click(
        screen.getByRole("button", { name: "marketDetails.recovery.button" }),
      )
      const confirm = within(screen.getByRole("dialog")).getByRole("button", {
        name: "marketDetails.recovery.button",
      }) as HTMLButtonElement
      expect(confirm.disabled).toBe(true)
      fireEvent.click(confirm)
      expect(mutate).not.toHaveBeenCalled()
    },
  )

  it("shows the full token precision and only submits after review", () => {
    render(<RecoverUnderlyingModal marketAccount={account} />)
    fireEvent.click(
      screen.getByRole("button", { name: "marketDetails.recovery.button" }),
    )
    expect(screen.getByText("1.000001 AST")).toBeTruthy()
    expect(mutate).not.toHaveBeenCalled()
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "marketDetails.recovery.button",
      }),
    )
    expect(mutate).toHaveBeenCalledTimes(1)
  })

  it.each(["legacy", "nonborrower"])(
    "does not offer recovery for %s",
    (kind) => {
      const otherAccount = {
        ...account,
        isBorrower: kind !== "nonborrower",
        market: {
          ...account.market,
          repaymentDate: kind === "legacy" ? undefined : 0,
        },
      } as MarketAccount
      render(<RecoverUnderlyingModal marketAccount={otherAccount} />)
      expect(screen.queryByRole("button")).toBeNull()
    },
  )
})
