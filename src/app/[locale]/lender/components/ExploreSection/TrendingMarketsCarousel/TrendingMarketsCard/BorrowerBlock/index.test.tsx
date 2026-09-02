/* eslint-disable import/no-extraneous-dependencies */
import * as React from "react"

import { fireEvent, render, screen } from "@testing-library/react"

import { TrendingMarketDetails, TrendingMarketDetailsProps } from "./index"

const routerPushMock = jest.fn()

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPushMock }),
}))

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

jest.mock("@/components/@extended/MarketStatusAndTermChip", () => ({
  MarketStatusAndTermChip: () => null,
}))

jest.mock("@/components/NetworkIcon", () => ({
  NetworkIcon: () => null,
}))

jest.mock("@/hooks/useMobileResolution", () => ({
  useMobileResolution: () => false,
}))

const details: TrendingMarketDetailsProps = {
  marketName: "Test Market",
  borrower: "Borrower Inc",
  borrowerAddress: "0x2222222222222222222222222222222222222222",
  asset: "USDC",
  chainId: 11155111,
  suppliedPct: 25,
  supplied: "25",
  capacity: "100",
  status: {} as TrendingMarketDetailsProps["status"],
  termLabel: "Open Term",
  isMobile: false,
}

describe("TrendingMarketDetails borrower profile navigation", () => {
  beforeEach(() => {
    routerPushMock.mockClear()
  })

  it("opens the chain-scoped public borrower profile", () => {
    render(<TrendingMarketDetails {...details} />)

    fireEvent.click(screen.getByText("Borrower Inc"))

    expect(routerPushMock).toHaveBeenCalledWith(
      "/profile/borrower/0x2222222222222222222222222222222222222222?chainId=11155111",
    )
  })
})
