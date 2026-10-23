/* eslint-disable import/no-extraneous-dependencies */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { Market } from "@wildcatfi/wildcat-sdk"

import { WrapDebtToken as BorrowerWrapper } from "@/app/[locale]/borrower/market/[address]/components/WrapDebtToken"
import { WrapDebtToken as LenderWrapper } from "@/app/[locale]/lender/market/[address]/components/WrapDebtToken"

jest.mock("viem", () => ({
  getAddress: (value: string) => value,
  isAddress: (value: string) => /^0x[a-fA-F0-9]{40}$/.test(value),
}))

jest.mock("@/components/WrapDebtToken/NoWrapperState", () => ({
  NoWrapperState: ({ canCreateWrapper }: { canCreateWrapper: boolean }) => (
    <div data-testid="no-wrapper">
      {canCreateWrapper && <button type="button">Create wrapper</button>}
    </div>
  ),
}))
jest.mock("@/components/WrapDebtToken/WrapperSection", () => ({
  WrapperSection: () => <div>Wrapper actions</div>,
}))
jest.mock("@/components/WrapDebtToken/WrapperSkeleton", () => ({
  WrapperSkeleton: () => <div>Loading wrapper</div>,
}))
jest.mock("@/components/Toasts", () => ({ toastRequest: jest.fn() }))
jest.mock("@/hooks/useNetworkGate", () => ({
  useNetworkGate: () => ({ isWrongNetwork: false, isSelectionMismatch: false }),
}))
jest.mock("@/hooks/useCurrentNetwork", () => ({
  useCurrentNetwork: () => ({ targetChainId: 1 }),
}))
jest.mock("@/hooks/useEthersSigner", () => ({
  useEthersProvider: () => ({ signer: { _isSigner: true } }),
}))
jest.mock("@safe-global/safe-apps-react-sdk", () => ({
  useSafeAppsSDK: () => ({ connected: false }),
}))
jest.mock("@/store/hooks", () => ({ useAppDispatch: () => jest.fn() }))

describe.each([
  ["borrower", BorrowerWrapper],
  ["lender", LenderWrapper],
] as const)("%s wrapper lookup state", (_, Component) => {
  let client: QueryClient
  beforeEach(() => {
    client = new QueryClient()
  })
  afterEach(() => {
    cleanup()
    client.clear()
  })

  const props = {
    market: {
      chainId: 1,
      address: "0x0000000000000000000000000000000000000001",
    } as Market,
    wrapper: undefined,
    hasWrapper: false,
    hasFactory: true,
    isWrapperLoading: false,
    isWrapperError: false,
    onRetryWrapper: jest.fn(),
    isAuthorizedLender: true,
    isDifferentChain: false,
  }

  it("shows retry on failure without offering wrapper creation", () => {
    const onRetryWrapper = jest.fn()
    render(
      <QueryClientProvider client={client}>
        <Component {...props} isWrapperError onRetryWrapper={onRetryWrapper} />
      </QueryClientProvider>,
    )
    expect(screen.getByRole("alert").textContent).toContain("Unable to load")
    expect(screen.queryByTestId("no-wrapper")).toBeNull()
    expect(screen.queryByRole("button", { name: "Create wrapper" })).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(onRetryWrapper).toHaveBeenCalledTimes(1)
  })

  it("only shows absence after lookup finishes successfully", () => {
    const { rerender } = render(
      <QueryClientProvider client={client}>
        <Component {...props} isWrapperLoading />
      </QueryClientProvider>,
    )
    expect(screen.queryByTestId("no-wrapper")).toBeNull()
    rerender(
      <QueryClientProvider client={client}>
        <Component {...props} />
      </QueryClientProvider>,
    )
    expect(screen.getByTestId("no-wrapper")).toBeTruthy()
    expect(screen.queryByRole("alert")).toBeNull()
  })
})
