/* eslint-disable import/no-extraneous-dependencies */
import { render, screen } from "@testing-library/react"

import { RedirectsProvider } from "@/providers/RedirectsProvider"
import { ROUTES } from "@/routes"

const mockPush = jest.fn()
const mockReplace = jest.fn()
const mockPathname = jest.fn()
const mockUseNetworkGate = jest.fn()

jest.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useSelectedLayoutSegments: () => ["lender", "my-markets"],
}))

jest.mock("@/hooks/useNetworkGate", () => ({
  useNetworkGate: (options: unknown) => mockUseNetworkGate(options),
}))

const renderProvider = () =>
  render(
    <RedirectsProvider>
      <span>content</span>
    </RedirectsProvider>,
  )

describe("RedirectsProvider return target", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    window.history.replaceState({}, "", `${ROUTES.lender.myMarkets}?chainId=1`)
    mockPathname.mockReturnValue(ROUTES.lender.myMarkets)
    mockUseNetworkGate.mockReturnValue({
      redirectPath: ROUTES.lender.agreement,
      isRedirectLoading: false,
      selectedChainId: 1,
      walletChainId: 1,
    })
  })

  it("carries the complete in-app page onto an agreement redirect", () => {
    renderProvider()

    expect(screen.getByText("content")).toBeTruthy()
    expect(mockPush).toHaveBeenCalledWith(
      `${ROUTES.lender.agreement}?returnTo=${encodeURIComponent(
        `${ROUTES.lender.myMarkets}?chainId=1`,
      )}`,
    )
  })

  it("does not attach a return target to a non-agreement redirect", () => {
    mockUseNetworkGate.mockReturnValue({
      redirectPath: "/",
      isRedirectLoading: false,
      selectedChainId: 1,
      walletChainId: 1,
    })

    renderProvider()

    expect(mockPush).toHaveBeenCalledWith("/")
  })
})
