/* eslint-disable import/no-extraneous-dependencies, @typescript-eslint/no-explicit-any */
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { MarketAccount } from "@wildcatfi/wildcat-sdk"

import { RepayModal } from "."

type FakeAmount = {
  raw: bigint
  token: { getAmount: (raw: bigint | number) => FakeAmount }
  eq: (other: FakeAmount | bigint | number) => boolean
  gt: (other: FakeAmount | bigint | number) => boolean
  gte: (other: FakeAmount | bigint | number) => boolean
  lt: (other: FakeAmount | bigint | number) => boolean
  sub: (other: FakeAmount | bigint | number) => FakeAmount
}

const approveMock = jest.fn()
const repayMock = jest.fn()

jest.mock("@safe-global/safe-apps-react-sdk", () => ({
  useSafeAppsSDK: () => ({ connected: false }),
}))

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

jest.mock(
  "@/app/[locale]/borrower/market/[address]/hooks/useGetApproval",
  () => ({
    useApprove: () => ({ mutateAsync: approveMock, isPending: false }),
  }),
)

jest.mock("@/app/[locale]/borrower/market/[address]/hooks/useRepay", () => ({
  useRepay: () => ({
    mutate: repayMock,
    isPending: false,
    isSuccess: false,
    isError: false,
  }),
}))

jest.mock("@/hooks/useBlockExplorer", () => ({
  useBlockExplorer: () => ({ getTxUrl: () => "" }),
}))

jest.mock("@/components/NumberTextfield", () => ({
  NumberTextField: ({ value, onChange, disabled }: any) => (
    <input
      aria-label="repay input"
      value={value}
      onChange={onChange}
      disabled={disabled}
    />
  ),
}))

jest.mock("@/components/TextfieldAdornments/TextfieldButton", () => ({
  TextfieldButton: () => null,
}))

jest.mock("@/components/TxModalComponents/TxModalHeader", () => ({
  TxModalHeader: () => null,
}))

jest.mock("@/components/TxModalComponents/TxModalFooter", () => ({
  TxModalFooter: ({
    mainBtnText,
    secondBtnText,
    mainBtnOnClick,
    secondBtnOnClick,
    disableMainBtn,
    disableSecondBtn,
  }: any) => (
    <div>
      <button type="button" onClick={mainBtnOnClick} disabled={disableMainBtn}>
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
    </div>
  ),
}))

jest.mock("@/components/LinkComponent", () => ({ LinkGroup: () => null }))
jest.mock("@/assets/icons/arrowLeft_icon.svg", () => ({
  __esModule: true,
  default: () => null,
}))
jest.mock("@/utils/constants", () => ({ isUSDTLikeToken: () => false }))
jest.mock("@/utils/errors", () => ({ SDK_ERRORS_MAPPING: { repay: {} } }))
jest.mock("@/utils/formatters", () => ({
  formatTokenWithCommas: (value: FakeAmount) => value.raw.toString(),
}))

jest.mock(
  "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/ErrorModal",
  () => ({ ErrorModal: () => null }),
)
jest.mock(
  "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/LoadingModal",
  () => ({ LoadingModal: () => null }),
)
jest.mock(
  "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/SuccessModal",
  () => ({ SuccessModal: () => null }),
)

const rawOf = (value: FakeAmount | bigint | number) =>
  typeof value === "object" ? value.raw : BigInt(value)

const makeAmount = (raw: bigint | number): FakeAmount => {
  const value = BigInt(raw)
  return {
    raw: value,
    token: { getAmount: makeAmount },
    eq: (other) => value === rawOf(other),
    gt: (other) => value > rawOf(other),
    gte: (other) => value >= rawOf(other),
    lt: (other) => value < rawOf(other),
    sub: (other) => makeAmount(value - rawOf(other)),
  }
}

describe("RepayModal", () => {
  it("repays the exact repay-by-days quote that was approved", async () => {
    let quote = 100n
    let allowance = 0n

    approveMock.mockImplementation(async (amount: FakeAmount) => {
      allowance = amount.raw
    })

    const market = {
      address: "0x2222222222222222222222222222222222222222",
      isClosed: false,
      outstandingDebt: makeAmount(1_000n),
      totalDebts: makeAmount(1_000n),
      secondsBeforeDelinquency: 0,
      underlyingToken: {
        address: "0x3333333333333333333333333333333333333333",
        symbol: "USDC",
        decimals: 6,
        parseAmount: (value: string) =>
          makeAmount(BigInt(Math.floor(Number(value) || 0))),
        getAmount: makeAmount,
      },
      repayRequiredForDuration: (seconds: number) =>
        makeAmount(seconds > 0 ? quote : 0n),
    }
    const marketAccount = {
      market,
      underlyingApproval: 0n,
      underlyingBalance: makeAmount(10_000n),
      previewRepay: (amount: FakeAmount) => ({
        status: allowance >= amount.raw ? "Ready" : "InsufficientAllowance",
      }),
      isApprovedFor: (amount: FakeAmount) => allowance >= amount.raw,
    } as unknown as MarketAccount

    const view = render(
      <RepayModal marketAccount={marketAccount} disableRepayBtn={false} />,
    )

    fireEvent.click(
      screen.getByRole("button", {
        name: "marketDetails.borrower.modals.repay.repay",
      }),
    )
    fireEvent.click(
      screen.getByRole("tab", { name: "marketDetails.borrower.days" }),
    )
    fireEvent.change(screen.getByLabelText("repay input"), {
      target: { value: "2" },
    })
    fireEvent.click(
      screen.getByRole("button", {
        name: "marketDetails.borrower.modals.repay.approve",
      }),
    )

    await waitFor(() => expect(approveMock).toHaveBeenCalledTimes(1))
    expect((approveMock.mock.calls[0][0] as FakeAmount).raw).toBe(100n)

    quote = 101n
    view.rerender(
      <RepayModal marketAccount={marketAccount} disableRepayBtn={false} />,
    )
    fireEvent.click(screen.getByRole("button", { name: "Repay" }))

    expect(repayMock).toHaveBeenCalledTimes(1)
    expect((repayMock.mock.calls[0][0] as FakeAmount).raw).toBe(100n)
  })
})
