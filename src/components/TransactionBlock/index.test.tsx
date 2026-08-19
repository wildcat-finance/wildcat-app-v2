// eslint-disable-next-line import/no-extraneous-dependencies
import { render, screen } from "@testing-library/react"

import { TransactionBlock } from "./index"

jest.mock("@/components/TooltipButton", () => ({
  TooltipButton: () => null,
}))

describe("TransactionBlock", () => {
  it("renders status copy outside the action slot", () => {
    render(
      <TransactionBlock
        title="Available For Withdraw Requests"
        amount="0"
        asset="USDC"
        subtitle="0 direct · 10 wrapped"
        status="No market tokens are available to withdraw."
        rows={[
          { label: "Withdrawal cycle", value: "1 day" },
          { label: "Grace period", value: "2 days" },
        ]}
      >
        <button type="button">Withdraw</button>
      </TransactionBlock>,
    )

    const action = screen.getByRole("button", { name: "Withdraw" })
    const actionRow = action.parentElement?.parentElement
    const status = screen.getByText(
      "No market tokens are available to withdraw.",
    )

    expect(actionRow?.contains(status)).toBe(false)
    expect(screen.getByText("0 direct · 10 wrapped")).toBeTruthy()
    expect(screen.getByText("Withdrawal cycle")).toBeTruthy()
    expect(screen.getByText("1 day")).toBeTruthy()
    expect(screen.getByText("Grace period")).toBeTruthy()
    expect(screen.getByText("2 days")).toBeTruthy()
  })
})
