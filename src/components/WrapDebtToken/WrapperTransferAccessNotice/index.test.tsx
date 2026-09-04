/* eslint-disable import/no-extraneous-dependencies */
import { fireEvent, render, screen } from "@testing-library/react"

import { WrapperTransferAccessNotice } from "."

const WRAPPER_ADDRESS = "0x3333333333333333333333333333333333333333"

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { address?: string }) => {
      const translations: Record<string, string> = {
        "common.buttons.retry": "Retry",
        "marketDetails.lender.wrapDebtToken.wrapperAccess.checking.message":
          "Checking whether this wrapper can receive market tokens…",
        "marketDetails.lender.wrapDebtToken.wrapperAccess.denied.address": `Wrapper: ${
          options?.address ?? ""
        }`,
        "marketDetails.lender.wrapDebtToken.wrapperAccess.denied.managePolicy":
          "Manage Policy",
        "marketDetails.lender.wrapDebtToken.wrapperAccess.denied.message":
          "This wrapper cannot receive market tokens. The borrower must authorize it in the market policy before anyone can wrap.",
        "marketDetails.lender.wrapDebtToken.wrapperAccess.error.message":
          "Wrapper access couldn’t be verified. Retry the onchain check before wrapping.",
      }
      return translations[key] ?? key
    },
  }),
}))

describe("WrapperTransferAccessNotice", () => {
  it("shows the denied wrapper and borrower policy action", () => {
    render(
      <WrapperTransferAccessNotice
        status="denied"
        wrapperAddress={WRAPPER_ADDRESS}
        managePolicyHref="/borrower/policy?policy=0xhooks"
      />,
    )

    expect(screen.getByRole("alert").textContent).toContain(
      "This wrapper cannot receive market tokens",
    )
    expect(screen.getByRole("alert").textContent).toContain(WRAPPER_ADDRESS)
    expect(
      screen.getByRole("link", { name: "Manage Policy" }).getAttribute("href"),
    ).toBe("/borrower/policy?policy=0xhooks")
  })

  it("shows a retryable read error without presenting it as denial", () => {
    const onRetry = jest.fn()
    render(
      <WrapperTransferAccessNotice
        status="error"
        wrapperAddress={WRAPPER_ADDRESS}
        onRetry={onRetry}
      />,
    )

    expect(screen.getByRole("alert").textContent).toContain(
      "Wrapper access couldn’t be verified",
    )
    expect(screen.getByRole("alert").textContent).not.toContain(
      "cannot receive market tokens",
    )
    fireEvent.click(screen.getByRole("button", { name: "Retry" }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it("announces the initial check without an action", () => {
    render(
      <WrapperTransferAccessNotice
        status="checking"
        wrapperAddress={WRAPPER_ADDRESS}
      />,
    )

    expect(screen.getByRole("status").textContent).toContain(
      "Checking whether this wrapper can receive market tokens",
    )
    expect(screen.queryByRole("button")).toBeNull()
    expect(screen.queryByRole("link")).toBeNull()
  })

  it.each(["allowed", "not-applicable"] as const)(
    "renders nothing for %s",
    (status) => {
      const { container } = render(
        <WrapperTransferAccessNotice
          status={status}
          wrapperAddress={WRAPPER_ADDRESS}
        />,
      )

      expect(container.childElementCount).toBe(0)
    },
  )
})
