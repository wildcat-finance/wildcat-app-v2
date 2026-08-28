/* eslint-disable import/no-extraneous-dependencies */
import { fireEvent, render, screen } from "@testing-library/react"
import { MarketAccount, MarketVersion } from "@wildcatfi/wildcat-sdk"

import { AprModal } from "."
import { AprModalDialog } from "./style"

const previewProposeAnnualInterestBips = jest.fn(() => ({ status: "Ready" }))
const previewSetAPR = jest.fn(() => ({
  status: "Ready",
  willChangeReserveRatio: false,
}))

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode
    href: string
  }) => <a href={href}>{children}</a>,
}))

jest.mock("@/assets/icons/circledAlert_icon.svg", () => ({
  __esModule: true,
  default: () => null,
}))

jest.mock("@/components/NumberTextfield", () => ({
  NumberTextField: ({
    value,
    onChange,
    sx,
  }: {
    value: string
    onChange: React.ChangeEventHandler<HTMLInputElement>
    sx?: { width?: string; height?: string }
  }) => (
    <input
      aria-label="apr"
      value={value}
      onChange={onChange}
      data-width={sx?.width}
      data-height={sx?.height}
    />
  ),
}))

jest.mock("@/components/TxModalComponents/TxModalHeader", () => ({
  TxModalHeader: ({
    title,
    children,
  }: {
    title: React.ReactNode
    children?: React.ReactNode
  }) => (
    <header>
      <span>{title}</span>
      {children}
    </header>
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
  }: {
    mainBtnText: React.ReactNode
    secondBtnText: React.ReactNode
    mainBtnOnClick?: () => void
    secondBtnOnClick?: () => void
    disableMainBtn?: boolean
    disableSecondBtn?: boolean
  }) => (
    <footer>
      <button
        type="button"
        onClick={secondBtnOnClick}
        disabled={disableSecondBtn}
      >
        {secondBtnText}
      </button>
      <button type="button" onClick={mainBtnOnClick} disabled={disableMainBtn}>
        {mainBtnText}
      </button>
    </footer>
  ),
}))

jest.mock("@/components/@extended/ExtendedСheckbox", () => ({
  __esModule: true,
  default: ({
    checked,
    onChange,
  }: {
    checked: boolean
    onChange: React.ChangeEventHandler<HTMLInputElement>
  }) => <input type="checkbox" checked={checked} onChange={onChange} />,
}))

jest.mock("@/components/DepositAlert", () => ({
  DepositAlert: () => null,
}))

jest.mock("./components/DifferenceChip", () => ({
  DifferenceChip: () => <span data-testid="difference-chip" />,
}))

jest.mock("../FinalModals/ErrorModal", () => ({ ErrorModal: () => null }))
jest.mock("../FinalModals/LoadingModal", () => ({ LoadingModal: () => null }))
jest.mock("../FinalModals/SuccessModal", () => ({ SuccessModal: () => null }))

jest.mock("../../../hooks/useAdjustApr", () => ({
  useAdjustAPR: () => ({
    mutate: jest.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
    reset: jest.fn(),
  }),
}))

jest.mock("../../../hooks/useResetTempReserveRatio", () => ({
  useResetTempReserveRatio: () => ({
    mutate: jest.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
  }),
}))

jest.mock("@/utils/formatters", () => ({
  formatBps: (value: number) => String(value / 100),
  formatTokenWithCommas: () => "0 USDC",
  MARKET_PARAMS_DECIMALS: {
    annualInterestBips: 2,
    reserveRatioBips: 2,
  },
  TOKEN_FORMAT_DECIMALS: 5,
}))

const makePeriodicRcfAccount = () =>
  ({
    previewProposeAnnualInterestBips,
    previewSetAPR,
    market: {
      version: MarketVersion.V2,
      marketKind: "revolving",
      isClosed: false,
      isInFixedTerm: false,
      annualInterestBips: 1_000,
      reserveRatioBips: 0,
      originalReserveRatioBips: 0,
      temporaryReserveRatio: 0,
      temporaryReserveRatioExpiry: 0,
      outstandingTotalSupply: { eq: () => true },
      periodicHooksConfig: {
        pendingAprChangeProposalTimestamp: 0,
      },
      currentAprDisplayBips: {
        isRevolving: true,
        configuredAprKind: "utilization",
        configuredAprBips: 1_000,
        currentProtocolAprBips: 0,
        currentEffectiveLenderAprBips: 1_000,
      },
      getTotalDebtBreakdown: () => ({ collateralObligation: {} }),
    },
  }) as unknown as MarketAccount

describe("AprModal", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("keeps zero-lender periodic reductions in proposal mode without hiding effects", () => {
    render(<AprModal marketAccount={makePeriodicRcfAccount()} />)

    fireEvent.click(
      screen.getByRole("button", {
        name: "marketDetails.borrower.modals.apr.adjustUtilization",
      }),
    )

    const input = screen.getByLabelText("apr")
    expect(input.getAttribute("data-width")).toBe("100%")
    expect(input.getAttribute("data-height")).toBe("auto")

    fireEvent.change(input, { target: { value: "2" } })

    expect(previewProposeAnnualInterestBips).toHaveBeenCalledWith(200)
    expect(previewSetAPR).not.toHaveBeenCalled()
    expect(
      screen.getByText(
        "marketDetails.borrower.modals.apr.periodicProposalNotice",
      ),
    ).toBeTruthy()
    expect(
      screen.getByText(
        "marketDetails.borrower.modals.apr.proposalLeavesUnchanged",
      ),
    ).toBeTruthy()
    expect(
      screen.getByText(
        "marketDetails.borrower.modals.apr.collateralObligation",
      ),
    ).toBeTruthy()
    expect(screen.getByText("common.fields.reserveRatio")).toBeTruthy()
    expect(screen.queryByTestId("difference-chip")).toBeNull()

    fireEvent.click(
      screen.getByRole("button", { name: "common.buttons.confirm" }),
    )

    expect(
      screen.getByText(
        "marketDetails.borrower.modals.apr.proposedUtilizationApr",
      ),
    ).toBeTruthy()
    expect(
      screen.getByText(
        "marketDetails.borrower.modals.apr.collateralObligation",
      ),
    ).toBeTruthy()
    expect(screen.getByText("common.fields.reserveRatio")).toBeTruthy()
  })

  it("overrides the global paper minimum without widening the dialog", () => {
    expect(AprModalDialog["& .MuiDialog-paper"]).toMatchObject({
      width: "500px",
      maxWidth: "min(500px, calc(100% - 32px))",
      minWidth: "0 !important",
    })
  })
})
