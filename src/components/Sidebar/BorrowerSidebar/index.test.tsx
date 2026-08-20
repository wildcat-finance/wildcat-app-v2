/* eslint-disable import/no-extraneous-dependencies */
import { fireEvent, render, screen } from "@testing-library/react"

import { BorrowerSidebar } from "./index"

const backMock = jest.fn()
const pushMock = jest.fn()
const usePathnameMock = jest.fn()
const searchParamsGetMock = jest.fn()

jest.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock(),
  useRouter: () => ({ back: backMock, push: pushMock }),
  useSearchParams: () => ({ get: searchParamsGetMock }),
}))
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
jest.mock("@/assets/icons/backArrow_icon.svg", () => ({
  __esModule: true,
  default: () => null,
}))
jest.mock("@/config/featureFlags", () => ({ analyticsUiEnabled: false }))
jest.mock("@/hooks/useSelectedNetwork", () => ({
  useSelectedNetwork: () => ({ chainId: 1 }),
}))
jest.mock("@/lib/subgraphCapabilities", () => ({
  isSubgraphPricingConfigured: () => true,
}))

const setHistoryLength = (length: number) => {
  Object.defineProperty(window.history, "length", {
    configurable: true,
    value: length,
  })
}

describe("BorrowerSidebar back navigation", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    usePathnameMock.mockReturnValue("/profile/borrower/0xborrower")
    searchParamsGetMock.mockReturnValue(null)
  })

  afterEach(() => {
    Reflect.deleteProperty(window.history, "length")
  })

  it("returns to the previous page when navigation history is available", () => {
    setHistoryLength(2)
    render(<BorrowerSidebar />)

    fireEvent.click(screen.getByRole("button", { name: "common.buttons.back" }))

    expect(backMock).toHaveBeenCalledTimes(1)
    expect(pushMock).not.toHaveBeenCalled()
  })

  it("uses the lender dashboard as the direct-load fallback", () => {
    setHistoryLength(1)
    render(<BorrowerSidebar />)

    fireEvent.click(screen.getByRole("button", { name: "common.buttons.back" }))

    expect(backMock).not.toHaveBeenCalled()
    expect(pushMock).toHaveBeenCalledWith("/lender")
  })
})
