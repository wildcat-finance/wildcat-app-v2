/* eslint-disable import/no-extraneous-dependencies */
import { render, screen } from "@testing-library/react"
import { Market, MarketVersion } from "@wildcatfi/wildcat-sdk"
import { createInstance } from "i18next"
import { I18nextProvider } from "react-i18next"

import en from "@/locales/en/en.json"

import { MarketIndicators } from "."

jest.mock("@/components/TooltipButton", () => ({ TooltipButton: () => null }))
jest.mock("@/hooks/useLiveNowSeconds", () => ({
  useLivePeriodicNowSeconds: () => 1_800_000_300,
}))

const i18n = createInstance()
beforeAll(async () => {
  await i18n.init({ lng: "en", resources: { en: { translation: en } } })
})

const marketFor = (periodic: boolean, revolving: boolean) =>
  ({
    version: MarketVersion.V2,
    marketKind: revolving ? "revolving" : "standard",
    isClosed: false,
    isIncurringPenalties: false,
    periodicHooksConfig: periodic
      ? {
          firstWithdrawalWindowStart: 1_800_000_000,
          periodDuration: 1800,
          withdrawalWindowDuration: 600,
          periodicTermClosed: false,
        }
      : undefined,
    currentAprDisplayBips: {
      isRevolving: revolving,
      configuredAprKind: revolving ? "utilization" : "annualInterest",
      configuredAprBips: 1000,
      commitmentAprBips: 200,
      utilizationBips: 6500,
      currentEffectiveLenderAprBips: 850,
    },
  }) as unknown as Market

const indicators = (market: Market) => (
  <I18nextProvider i18n={i18n}>
    <MarketIndicators market={market} />
  </I18nextProvider>
)

describe("market indicators", () => {
  it.each([
    [true, false, 1],
    [false, true, 1],
    [true, true, 2],
    [false, false, 0],
  ])(
    "handles periodic=%s and revolving=%s independently",
    (periodic, revolving, count) => {
      render(indicators(marketFor(periodic, revolving)))
      expect(screen.queryAllByRole("img")).toHaveLength(count)
      if (periodic)
        expect(
          screen.getByRole("img", { name: /^Withdrawals open/ }),
        ).toBeTruthy()
      if (revolving)
        expect(
          screen.getByRole("img", {
            name: /^Current lender APR is 8.5% at 65%/,
          }),
        ).toBeTruthy()
    },
  )

  it("renders a flat APR curve without invalid SVG coordinates", () => {
    const market = marketFor(false, true)
    Object.assign(market.currentAprDisplayBips!, {
      configuredAprBips: 0,
      currentEffectiveLenderAprBips: 200,
    })
    const { container } = render(indicators(market))
    expect(
      screen.getByRole("img", { name: /^Current lender APR is 2%/ }),
    ).toBeTruthy()
    expect(container.querySelector("svg")!.outerHTML).not.toMatch(
      /NaN|Infinity/,
    )
  })

  it("updates the marker and headline when market data refreshes", () => {
    const market = marketFor(false, true)
    const { container, rerender } = render(indicators(market))
    const initialPosition = container
      .querySelector("circle")!
      .getAttribute("cx")
    Object.assign(market.currentAprDisplayBips!, {
      utilizationBips: 9000,
      currentEffectiveLenderAprBips: 1100,
    })
    rerender(indicators(market))
    expect(
      screen.getByRole("img", { name: /^Current lender APR is 11% at 90%/ }),
    ).toBeTruthy()
    expect(container.querySelector("circle")!.getAttribute("cx")).not.toBe(
      initialPosition,
    )
  })
})
