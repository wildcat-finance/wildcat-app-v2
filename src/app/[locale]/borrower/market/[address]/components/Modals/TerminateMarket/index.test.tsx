/* eslint-disable import/no-extraneous-dependencies */
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import {
  HooksKind,
  LenderRole,
  Market,
  MarketAccount,
  MarketVersion,
  RAY,
  SupportedChainId,
  Token,
  TokenAmount,
} from "@wildcatfi/wildcat-sdk"

import { TerminateMarket } from "."

const approveMock = jest.fn().mockResolvedValue(undefined)

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

jest.mock("../../../hooks/useTerminateMarket", () => ({
  useTerminateMarket: () => ({
    mutateAsync: jest.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
  }),
}))

jest.mock("../../../hooks/useGetApproval", () => ({
  useApprove: () => ({ mutateAsync: approveMock, isPending: false }),
}))

jest.mock("../../../hooks/useGetWithdrawals", () => ({
  useGetWithdrawals: () => ({ data: [] }),
}))

jest.mock("../../../hooks/useProcessUnpaidWithdrawalBatch", () => ({
  useProcessUnpaidWithdrawalBatch: () => ({
    mutateAsync: jest.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
  }),
}))

jest.mock("@/hooks/useBlockExplorer", () => ({
  useBlockExplorer: () => ({ getTxUrl: () => "" }),
}))

jest.mock("@/assets/icons/cross_icon.svg", () => ({
  __esModule: true,
  default: () => null,
}))

jest.mock("@/components/LinkComponent", () => ({ LinkGroup: () => null }))
jest.mock("../FinalModals/ErrorModal", () => ({ ErrorModal: () => null }))
jest.mock("../FinalModals/LoadingModal", () => ({ LoadingModal: () => null }))
jest.mock("../FinalModals/SuccessModal", () => ({ SuccessModal: () => null }))

jest.mock("@/components/TxModalComponents/TxModalHeader", () => ({
  TxModalHeader: ({ arrowOnClick }: { arrowOnClick: () => void }) => (
    <button type="button" onClick={arrowOnClick}>
      Close
    </button>
  ),
}))

jest.mock("@/components/TxModalComponents/TxModalFooter", () => ({
  TxModalFooter: ({
    mainBtnText,
    secondBtnText,
    mainBtnOnClick,
    secondBtnOnClick,
    disableMainBtn,
    disableSecondBtn,
    hideButtons,
  }: {
    mainBtnText: string
    secondBtnText?: string
    mainBtnOnClick?: () => void
    secondBtnOnClick?: () => void
    disableMainBtn?: boolean
    disableSecondBtn?: boolean
    hideButtons?: boolean
  }) =>
    hideButtons ? null : (
      <footer>
        <button
          type="button"
          onClick={mainBtnOnClick}
          disabled={disableMainBtn}
        >
          {mainBtnText}
        </button>
        {secondBtnText && (
          <button
            type="button"
            onClick={secondBtnOnClick}
            disabled={disableSecondBtn}
          >
            {secondBtnText}
          </button>
        )}
      </footer>
    ),
}))

jest.mock("@/utils/formatters", () => ({
  formatTokenWithCommas: (
    amount: TokenAmount,
    options?: { withSymbol?: boolean },
  ) => amount.format(6, options?.withSymbol),
}))

const makeAccount = (hasDebt = true) => {
  const provider = {
    call: async () => {
      throw new Error("Unexpected RPC call")
    },
  }
  const asset = new Token(
    SupportedChainId.Sepolia,
    "0x0000000000000000000000000000000000000001",
    "Asset",
    "AST",
    6,
    false,
    provider,
  )
  const receipt = new Token(
    SupportedChainId.Sepolia,
    "0x0000000000000000000000000000000000000002",
    "Receipt",
    "RCT",
    6,
    false,
    provider,
  )
  const market = {
    chainId: SupportedChainId.Sepolia,
    borrower: "0x0000000000000000000000000000000000000003",
    version: MarketVersion.V2,
    hooksConfig: { kind: HooksKind.OpenTerm },
    isInFixedTerm: false,
    isClosed: false,
    underlyingToken: asset,
    marketToken: receipt,
    totalSupply: receipt.parseAmount(hasDebt ? "100" : "0"),
    outstandingTotalSupply: receipt.parseAmount(hasDebt ? "100" : "0"),
    outstandingDebt: asset.parseAmount(hasDebt ? "50" : "0"),
    totalDebts: asset.parseAmount(hasDebt ? "100" : "0"),
    totalAssets: asset.parseAmount(hasDebt ? "50" : "0"),
    normalizedPendingWithdrawals: asset.getAmount(0),
    normalizedUnclaimedWithdrawals: asset.getAmount(0),
    lastAccruedProtocolFees: asset.getAmount(0),
    effectiveBorrowerAPR: RAY / 10n,
    unpaidWithdrawalBatchExpiries: [],
  } as unknown as Market
  return new MarketAccount({
    market,
    account: market.borrower,
    role: LenderRole.DepositAndWithdraw,
    isKnownLender: true,
    scaledMarketBalance: 0n,
    marketBalance: receipt.getAmount(0),
    underlyingBalance: asset.parseAmount("1000"),
    underlyingApproval: 0n,
  })
}

const openModal = () =>
  fireEvent.click(
    screen.getByRole("button", {
      name: "marketDetails.borrower.modals.terminate.terminateMarket",
    }),
  )

describe("TerminateMarket", () => {
  beforeEach(() => jest.clearAllMocks())

  it.each([false, true])(
    "does not evaluate a hidden termination flow when isClosed=%s",
    (isClosed) => {
      const account = makeAccount()
      account.market.isClosed = isClosed
      const preview = jest.spyOn(account, "previewCloseMarket")
      render(<TerminateMarket marketAccount={account} />)

      expect(preview).not.toHaveBeenCalled()
      expect(screen.queryByRole("dialog")).toBeNull()
    },
  )

  it("shows remaining loan and approves underlying units with the installed SDK", async () => {
    const account = makeAccount()
    render(<TerminateMarket marketAccount={account} />)
    openModal()

    expect(screen.getByRole("dialog")).not.toBeNull()
    expect(screen.getByText("Remaining Loan").parentElement?.textContent).toBe(
      "Remaining Loan100 AST",
    )
    fireEvent.click(
      screen.getByRole("button", { name: "common.buttons.approve" }),
    )
    await waitFor(() => expect(approveMock).toHaveBeenCalledTimes(1))
    const [amount] = approveMock.mock.calls[0]
    expect(amount.token).toBe(account.market.underlyingToken)
    expect(amount.raw).toBe(50_002_283n)
  })

  it("uses current debt on each open and stops previewing after close", () => {
    const cleared = makeAccount(false)
    const view = render(<TerminateMarket marketAccount={cleared} />)
    openModal()
    expect(
      screen.getByText("marketDetails.borrower.modals.terminate.areYouSure"),
    ).not.toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Close" }))

    const account = makeAccount()
    const preview = jest.spyOn(account, "previewCloseMarket")
    view.rerender(<TerminateMarket marketAccount={account} />)
    expect(preview).not.toHaveBeenCalled()
    openModal()
    expect(screen.getByText("Remaining Loan")).not.toBeNull()

    preview.mockClear()
    fireEvent.click(screen.getByRole("button", { name: "Close" }))
    view.rerender(<TerminateMarket marketAccount={account} />)
    expect(preview).not.toHaveBeenCalled()
    expect(screen.queryByRole("dialog")).toBeNull()
  })
})
