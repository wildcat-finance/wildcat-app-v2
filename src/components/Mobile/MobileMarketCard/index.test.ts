/* eslint-disable import/no-extraneous-dependencies */
import * as React from "react"

import { fireEvent, render, screen } from "@testing-library/react"
import { HooksKind } from "@wildcatfi/wildcat-sdk"

import { ROUTES } from "@/routes"

import {
  getMobileMarketTermLabel,
  MobileMarketCard,
  MobileMarketItem,
} from "./index"

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

jest.mock("@/components/Translation", () => ({
  Trans: ({ i18nKey }: { i18nKey: string }) => i18nKey,
}))

jest.mock("@/hooks/useMobileResolution", () => ({
  useMobileResolution: () => true,
}))

jest.mock("@/components/AdsBanners/adsConfig", () => ({
  getAdsConfig: jest.fn(),
}))

const marketWithTerm = (term: MobileMarketItem["term"]): MobileMarketItem =>
  ({
    term,
  }) as MobileMarketItem

const clickableMarket = {
  id: "0x1111111111111111111111111111111111111111",
  chainId: 11155111,
  status: {},
  term: { kind: HooksKind.OpenTerm },
  name: "Test Market",
  borrower: "Borrower Inc",
  borrowerAddress: "0x2222222222222222222222222222222222222222",
  asset: "USDC",
  apr: 1_000,
  withdrawalBatchDuration: 86_400,
} as MobileMarketItem

beforeAll(() => {
  Object.defineProperty(global, "ResizeObserver", {
    configurable: true,
    value: jest.fn(() => ({
      observe: jest.fn(),
      disconnect: jest.fn(),
    })),
  })
})

beforeEach(() => {
  routerPushMock.mockClear()
})

describe("getMobileMarketTermLabel", () => {
  it("labels open-term markets", () => {
    expect(
      getMobileMarketTermLabel(marketWithTerm({ kind: HooksKind.OpenTerm })),
    ).toBe("Open Term")
  })

  it("keeps periodic-term markets distinct from fixed-term markets", () => {
    expect(
      getMobileMarketTermLabel(
        marketWithTerm({ kind: HooksKind.PeriodicTerm }),
      ),
    ).toBe("Periodic Term")
  })
})

describe("MobileMarketCard borrower profile navigation", () => {
  it("opens the public borrower profile from a lender market list", () => {
    render(
      React.createElement(MobileMarketCard, { marketItem: clickableMarket }),
    )

    fireEvent.click(screen.getByText("Borrower Inc"))

    expect(routerPushMock).toHaveBeenCalledWith(
      "/profile/borrower/0x2222222222222222222222222222222222222222?chainId=11155111",
    )
  })

  it("preserves borrower context when opening the public profile", () => {
    render(
      React.createElement(MobileMarketCard, {
        marketItem: clickableMarket,
        baseRoute: ROUTES.borrower.market,
      }),
    )

    fireEvent.click(screen.getByText("Borrower Inc"))

    expect(routerPushMock).toHaveBeenCalledWith(
      "/profile/borrower/0x2222222222222222222222222222222222222222?chainId=11155111&from=borrower",
    )
  })
})
