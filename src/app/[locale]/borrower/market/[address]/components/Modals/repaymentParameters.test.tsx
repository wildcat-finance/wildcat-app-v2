/* eslint-disable import/no-extraneous-dependencies */
import { fireEvent, render, screen } from "@testing-library/react"
import {
  HooksKind,
  LenderRole,
  Market,
  MarketAccount,
  MarketVersion,
  SignerOrProvider,
  Token,
} from "@wildcatfi/wildcat-sdk"

import { dayjs } from "@/utils/dayjs"

import { CapacityModal } from "./CapacityModal"
import { MaturityModal } from "./MaturityModal"
import { MinimumDepositModal } from "./MinimumDepositModal"

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
jest.mock("@/components/NumberTextfield", () => ({
  NumberTextField: ({
    value,
    onChange,
    helperText,
  }: {
    value: string
    onChange: React.ChangeEventHandler<HTMLInputElement>
    helperText?: string
  }) => (
    <>
      <input aria-label="amount" value={value} onChange={onChange} />
      <span>{helperText}</span>
    </>
  ),
}))
jest.mock("@mui/x-date-pickers", () => ({
  DesktopDatePicker: ({
    onChange,
    slotProps,
  }: {
    onChange: (value: ReturnType<typeof dayjs>) => void
    slotProps: { textField: { helperText?: string } }
  }) => (
    <>
      <input
        aria-label="maturity"
        onChange={(event) => onChange(dayjs(event.target.value))}
      />
      <span>{slotProps.textField.helperText}</span>
    </>
  ),
}))
jest.mock("@/components/TxModalComponents/TxModalHeader", () => ({
  TxModalHeader: () => null,
}))
jest.mock("@/components/TxModalComponents/TxModalFooter", () => ({
  TxModalFooter: ({
    mainBtnOnClick,
    disableMainBtn,
  }: {
    mainBtnOnClick: () => void
    disableMainBtn: boolean
  }) => (
    <button type="button" onClick={mainBtnOnClick} disabled={disableMainBtn}>
      Confirm
    </button>
  ),
}))
jest.mock("./FinalModals/ErrorModal", () => ({ ErrorModal: () => null }))
jest.mock("./FinalModals/LoadingModal", () => ({ LoadingModal: () => null }))
jest.mock("./FinalModals/SuccessModal", () => ({ SuccessModal: () => null }))
jest.mock("../../hooks/useCapacity", () => ({
  useSetMaxTotalSupply: () => ({ mutate: jest.fn() }),
}))
jest.mock("../../hooks/useSetMinimumDeposit", () => ({
  useSetMinimumDeposit: () => ({ mutate: jest.fn() }),
}))
jest.mock("../../hooks/useSetFixedTermEndTime", () => ({
  useSetFixedTermEndTime: () => ({ mutate: jest.fn() }),
}))

const REPAYMENT_DATE = 1_800_000_000
const TEMPLATE = "0xa3FE06137cc893E19C2E4764a4A7b001E988ba2B"
const PREDECESSOR = "0x510d7aBf9534CFf6D2f760f005c703bD6f0CB14a"

const makeAccount = () => {
  const address = "0x1111111111111111111111111111111111111111"
  const token = new Token(
    11155111,
    address,
    "Asset",
    "AST",
    6,
    false,
    {} as SignerOrProvider,
  )
  const market = Object.assign(Object.create(Market.prototype), {
    chainId: 11155111,
    version: MarketVersion.V2,
    borrower: address,
    marketToken: token,
    underlyingToken: token,
    maxTotalSupply: token.parseAmount("1000"),
    hooksTemplateAddress: TEMPLATE,
    repaymentDate: REPAYMENT_DATE,
    lastInterestAccruedTimestamp: REPAYMENT_DATE - 1,
    isClosed: false,
    hooksConfig: {
      kind: HooksKind.FixedTerm,
      fixedTermEndTime: REPAYMENT_DATE,
      allowTermReduction: true,
      minimumDeposit: token.getAmount(0),
      flags: { useOnDeposit: true },
    },
  }) as Market
  return new MarketAccount({
    market,
    account: address,
    role: LenderRole.Null,
    marketBalance: token.getAmount(0),
    underlyingBalance: token.getAmount(0),
    scaledMarketBalance: BigInt(0),
    underlyingApproval: BigInt(0),
  })
}

const cases = [
  {
    name: "capacity",
    Modal: CapacityModal,
    button: "marketDetails.borrower.buttons.capacity",
    input: "amount",
    value: "100",
  },
  {
    name: "zero minimum deposit",
    Modal: MinimumDepositModal,
    button: "marketDetails.borrower.adjustMinimumDeposit",
    input: "amount",
    value: "0",
  },
  {
    name: "maturity",
    Modal: MaturityModal,
    button: "marketDetails.borrower.adjustMaturity",
    input: "maturity",
    value: "2027-01-10",
  },
]

describe("repayment parameter dialogs", () => {
  it.each(cases)(
    "rechecks $name when repayment starts with the form open",
    ({ Modal, button, input, value }) => {
      const account = makeAccount()
      const { rerender } = render(<Modal marketAccount={account} />)
      fireEvent.click(screen.getByRole("button", { name: button }))
      fireEvent.change(screen.getByLabelText(input), { target: { value } })
      expect(
        (screen.getByRole("button", { name: "Confirm" }) as HTMLButtonElement)
          .disabled,
      ).toBe(false)
      account.market.lastInterestAccruedTimestamp = REPAYMENT_DATE
      rerender(<Modal marketAccount={account} />)
      expect(
        (screen.getByRole("button", { name: "Confirm" }) as HTMLButtonElement)
          .disabled,
      ).toBe(true)
      expect(
        screen.getByText(/cannot be changed after the repayment date/),
      ).toBeTruthy()
    },
  )

  it.each(cases)(
    "keeps predecessor $name editable",
    ({ Modal, button, input, value }) => {
      const account = makeAccount()
      account.market.lastInterestAccruedTimestamp = REPAYMENT_DATE
      account.market.hooksTemplateAddress = PREDECESSOR
      render(<Modal marketAccount={account} />)
      expect(
        (screen.getByRole("button", { name: button }) as HTMLButtonElement)
          .disabled,
      ).toBe(false)
      fireEvent.click(screen.getByRole("button", { name: button }))
      fireEvent.change(screen.getByLabelText(input), { target: { value } })
      expect(
        (screen.getByRole("button", { name: "Confirm" }) as HTMLButtonElement)
          .disabled,
      ).toBe(false)
    },
  )
})
