// eslint-disable-next-line import/no-extraneous-dependencies
import { fireEvent, render, screen } from "@testing-library/react"

import { MobileLenderBanner } from "./index"

describe("MobileLenderBanner", () => {
  it("renders a status message without an inert CTA", () => {
    render(
      <MobileLenderBanner
        title="Checking lender access"
        subtitle="Confirming permissions onchain."
      />,
    )

    expect(screen.getByText("Checking lender access")).toBeTruthy()
    expect(screen.queryByRole("button")).toBeNull()
    expect(screen.queryByRole("link")).toBeNull()
  })

  it("renders a callback CTA when retry is available", () => {
    const onClick = jest.fn()

    render(
      <MobileLenderBanner
        title="Unable to verify lender access"
        subtitle="Try the blockchain check again."
        buttonText="Retry"
        onButtonClick={onClick}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "Retry" }))

    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
