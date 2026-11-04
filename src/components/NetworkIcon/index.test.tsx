/* eslint-disable import/no-extraneous-dependencies */
import { render, screen } from "@testing-library/react"
import { SupportedChainId } from "@wildcatfi/wildcat-sdk"

import { NetworkIcon } from "./index"

it("renders the Ink network icon at the requested size", () => {
  render(
    <NetworkIcon
      chainId={SupportedChainId.InkSepolia}
      width={32}
      height={32}
    />,
  )
  const icon = screen.getByRole("img", { name: "Ink" })
  expect(icon.getAttribute("width")).toBe("32")
  expect(icon.getAttribute("height")).toBe("32")
  expect(icon.getAttribute("src")).toContain("ink-icon.svg")
})
