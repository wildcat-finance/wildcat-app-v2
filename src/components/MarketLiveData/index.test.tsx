/* eslint-disable import/no-extraneous-dependencies */
import { render, screen } from "@testing-library/react"

import {
  LiveMarketDataValue,
  MarketLiveDataNotice,
} from "@/components/MarketLiveData"

describe("market live-data display state", () => {
  it("does not expose an indexed value while live hydration is pending", () => {
    const { container } = render(
      <LiveMarketDataValue status="loading">Pending</LiveMarketDataValue>,
    )

    expect(screen.queryByText("Pending")).toBeNull()
    expect(container.querySelector(".MuiSkeleton-root")).not.toBeNull()
  })

  it("renders a value after a live snapshot succeeds", () => {
    render(<LiveMarketDataValue status="ready">Healthy</LiveMarketDataValue>)

    expect(screen.getByText("Healthy")).not.toBeNull()
  })

  it("shows one explicit notice when live data is unavailable", () => {
    render(
      <>
        <MarketLiveDataNotice
          status="unavailable"
          message="Live market data is temporarily unavailable."
        />
        <LiveMarketDataValue status="unavailable">Pending</LiveMarketDataValue>
      </>,
    )

    expect(screen.getByRole("alert").textContent).toContain(
      "Live market data is temporarily unavailable.",
    )
    expect(screen.queryByText("Pending")).toBeNull()
  })
})
