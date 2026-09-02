/* eslint-disable import/no-extraneous-dependencies */
import { fireEvent, render, screen } from "@testing-library/react"
import {
  WrapperDeploymentStatus,
  type Market,
  type TokenWrapper,
} from "@wildcatfi/wildcat-sdk"

import { WrapDebtToken as BorrowerWrapDebtToken } from "@/app/[locale]/borrower/market/[address]/components/WrapDebtToken"
import { WrapDebtToken as LenderWrapDebtToken } from "@/app/[locale]/lender/market/[address]/components/WrapDebtToken"

const createWrapperMock = jest.fn()
const dispatchMock = jest.fn()
const toastRequestMock = jest.fn()
const useCreateWrapperMock = jest.fn()

jest.mock("@/components/Toasts", () => ({
  toastRequest: (...args: unknown[]) => toastRequestMock(...args),
}))

jest.mock("@/components/WrapDebtToken/NoWrapperState", () => ({
  NoWrapperState: ({
    canCreateWrapper,
    onCreateWrapper,
    statusMessage,
  }: {
    canCreateWrapper: boolean
    onCreateWrapper?: () => void
    statusMessage?: string
  }) => (
    <div>
      {statusMessage}
      {canCreateWrapper && (
        <button type="button" onClick={onCreateWrapper}>
          Deploy wrapper
        </button>
      )}
    </div>
  ),
}))

jest.mock("@/components/WrapDebtToken/WrapperSection", () => ({
  WrapperSection: () => <div>Wrapper details</div>,
}))

jest.mock("@/components/WrapDebtToken/WrapperSkeleton", () => ({
  WrapperSkeleton: () => <div>Loading wrapper</div>,
}))

jest.mock("@/hooks/useNetworkGate", () => ({
  useNetworkGate: () => ({
    isWrongNetwork: false,
    isSelectionMismatch: false,
  }),
}))

jest.mock("@/hooks/wrapper/useCreateWrapper", () => ({
  useCreateWrapper: (...args: unknown[]) => useCreateWrapperMock(...args),
}))

jest.mock("@/store/hooks", () => ({
  useAppDispatch: () => dispatchMock,
}))

jest.mock(
  "@/store/slices/wrapDebtTokenFlowSlice/wrapDebtTokenFlowSlice",
  () => ({
    setIsMobileOpenedState: (payload: boolean) => ({
      type: "wrapper/setIsMobileOpenedState",
      payload,
    }),
  }),
)

const market = {
  address: "0x2222222222222222222222222222222222222222",
  chainId: 11155111,
} as Market

const wrapperProps = {
  market,
  wrapper: undefined,
  hasWrapper: false,
  hasFactory: true,
  isWrapperLookupLoading: false,
  isWrapperLoading: false,
  isWrapperError: false,
}

describe("wrapper deployment market views", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    createWrapperMock.mockResolvedValue({ address: "0xwrapper" })
    useCreateWrapperMock.mockReturnValue({
      canCreateWrapper: true,
      transfersDisabled: false,
      deploymentStatus: WrapperDeploymentStatus.Ready,
      isCheckingDeploymentCapability: false,
      isDeploymentCapabilityError: false,
      createWrapper: createWrapperMock,
      isCreatingWrapper: false,
    })
  })

  it("offers the lender deployment flow from the borrower market view", () => {
    render(<BorrowerWrapDebtToken {...wrapperProps} />)

    fireEvent.click(screen.getByRole("button", { name: "Deploy wrapper" }))

    expect(useCreateWrapperMock).toHaveBeenCalledWith({
      market,
      hasFactory: true,
      isDifferentChain: false,
    })
    expect(createWrapperMock).toHaveBeenCalledTimes(1)
    expect(toastRequestMock).toHaveBeenCalledWith(expect.any(Promise), {
      pending: "Deploying wrapper...",
      success: "Wrapper deployed",
      error: "Failed to deploy wrapper",
    })
  })

  it("does not role-gate deployment from the lender market view", () => {
    render(
      <LenderWrapDebtToken
        {...wrapperProps}
        isAuthorizedLender={false}
        isDifferentChain={false}
      />,
    )

    expect(screen.getByRole("button", { name: "Deploy wrapper" })).toBeTruthy()
    expect(
      screen.queryByText("Only authorized lenders can access the wrapper."),
    ).toBeNull()
  })

  it("hides deployment when transfers are disabled", () => {
    useCreateWrapperMock.mockReturnValue({
      canCreateWrapper: false,
      transfersDisabled: true,
      createWrapper: createWrapperMock,
      isCreatingWrapper: false,
    })

    render(<BorrowerWrapDebtToken {...wrapperProps} />)

    expect(screen.queryByRole("button", { name: "Deploy wrapper" })).toBeNull()
    expect(
      screen.getByText(
        "Wrappers are not available when market transfers are disabled.",
      ),
    ).toBeTruthy()
  })

  it("hides deployment for an unsupported market factory", () => {
    useCreateWrapperMock.mockReturnValue({
      canCreateWrapper: false,
      transfersDisabled: false,
      deploymentStatus: WrapperDeploymentStatus.UnsupportedFactory,
      isCheckingDeploymentCapability: false,
      isDeploymentCapabilityError: false,
      createWrapper: createWrapperMock,
      isCreatingWrapper: false,
    })

    render(<BorrowerWrapDebtToken {...wrapperProps} />)

    expect(screen.queryByRole("button", { name: "Deploy wrapper" })).toBeNull()
    expect(
      screen.getByText("Wrapper deployment is not available for this market."),
    ).toBeTruthy()
  })

  it("keeps both views on the shared post-deployment section", () => {
    const wrapper = {
      address: "0x3333333333333333333333333333333333333333",
    } as TokenWrapper
    const deployedWrapperProps = {
      ...wrapperProps,
      wrapper,
      hasWrapper: true,
    }
    const { unmount } = render(
      <BorrowerWrapDebtToken {...deployedWrapperProps} />,
    )
    expect(screen.getByText("Wrapper details")).toBeTruthy()
    unmount()

    render(
      <LenderWrapDebtToken
        {...deployedWrapperProps}
        isAuthorizedLender
        isDifferentChain={false}
      />,
    )
    expect(screen.getByText("Wrapper details")).toBeTruthy()
  })
})
