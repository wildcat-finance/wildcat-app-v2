/* eslint-disable import/no-extraneous-dependencies */
import { render, screen } from "@testing-library/react"

import { LegendItem } from "."

jest.mock("@/assets/icons/upArrow_icon.svg", () => ({
  __esModule: true,
  default: () => null,
}))

jest.mock("@/utils/formatters", () => ({
  formatTokenWithCommas: () => "4,000.006",
}))

describe("LegendItem", () => {
  it("labels an expandable aggregate separately from its breakdown", () => {
    render(
      <LegendItem
        type="expandable"
        totalLabel="Total"
        chartItem={{
          label: "Collateral Obligations",
          color: "#000",
          value: {} as never,
          asset: "USDC",
        }}
      >
        <div>Protocol Fees</div>
      </LegendItem>,
    )

    expect(screen.getByText("Protocol Fees")).toBeTruthy()
    expect(screen.getByText("4,000.006 USDC")).toBeTruthy()
    expect(screen.getByText("Total")).toBeTruthy()
  })
})
