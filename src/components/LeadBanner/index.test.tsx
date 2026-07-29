// eslint-disable-next-line import/no-extraneous-dependencies
import { fireEvent, render, screen } from "@testing-library/react"

import { LeadBanner } from "./index"

jest.mock(
  "../../../theme/colors",
  () => ({
    COLORS: {
      white: "#FFFFFF",
    },
  }),
  { virtual: true },
)

describe("LeadBanner", () => {
  it("does not render a CTA when no action is configured", () => {
    render(<LeadBanner title="Pending" subtitle="Registration is pending." />)

    expect(screen.queryByRole("button")).toBeNull()
    expect(screen.queryByRole("link")).toBeNull()
  })

  it("renders a link CTA with the configured destination", () => {
    render(
      <LeadBanner
        buttonText="Leave a Request"
        buttonLink={{ isExternal: false, url: "/profile/borrower" }}
      />,
    )

    const link = screen.getByRole("link", { name: "Leave a Request" })
    expect(link.getAttribute("href")).toBe("/profile/borrower")
    expect(link.getAttribute("target")).toBe("_self")
  })

  it("renders a callback-only CTA as a button without navigation", () => {
    const onClick = jest.fn()

    render(<LeadBanner buttonText="Connect Wallet" buttonOnClick={onClick} />)

    const button = screen.getByRole("button", { name: "Connect Wallet" })
    expect(button.tagName).toBe("BUTTON")
    expect(button.hasAttribute("href")).toBe(false)

    fireEvent.click(button)

    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
