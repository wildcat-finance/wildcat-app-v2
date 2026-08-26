/* eslint-disable import/no-extraneous-dependencies */
import { fireEvent, render, screen } from "@testing-library/react"

import { AgreementPage } from "@/app/[locale]/agreement/components/AgreementPage"
import { ROUTES } from "@/routes"

const mockPush = jest.fn()
const mockBack = jest.fn()

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
  usePathname: () => "/lender/agreement",
}))

jest.mock("react-i18next", () => ({
  Trans: ({ i18nKey }: { i18nKey: string }) => <span>{i18nKey}</span>,
  useTranslation: () => ({ t: (key: string) => key }),
}))

jest.mock("@/hooks/useCurrentServiceAgreement", () => ({
  useCurrentServiceAgreement: () => ({ data: undefined, isLoading: false }),
}))

// signedCurrent puts the page in review mode, which is when Cancel renders.
jest.mock("@/hooks/useNetworkGate", () => ({
  useNetworkGate: () => ({ touState: "signedCurrent" }),
}))

jest.mock("@/components/ServiceAgreementVersionChip", () => ({
  ServiceAgreementVersionChip: () => null,
}))
jest.mock("@/app/[locale]/agreement/components/AgreementText", () => ({
  AgreementText: () => null,
}))
jest.mock("@/app/[locale]/agreement/components/SignButton", () => ({
  SignButton: () => null,
}))
jest.mock("@/app/[locale]/agreement/components/ReacceptButton", () => ({
  ReacceptButton: () => null,
}))

const setUrl = (url: string) => window.history.replaceState({}, "", url)

const clickCancel = () =>
  fireEvent.click(screen.getByRole("button", { name: /agreement.page.cancel/i }))

describe("AgreementPage cancel", () => {
  beforeEach(() => {
    mockPush.mockClear()
    mockBack.mockClear()
    setUrl("/lender/agreement")
  })

  it("returns to the page that sent the user here", () => {
    setUrl(
      `/lender/agreement?returnTo=${encodeURIComponent("/lender/my-markets")}`,
    )

    render(<AgreementPage party="Lender" />)
    clickCancel()

    expect(mockPush).toHaveBeenCalledWith("/lender/my-markets")
    expect(mockBack).not.toHaveBeenCalled()
  })

  it("keeps the query string of the page it returns to", () => {
    setUrl(
      `/lender/agreement?returnTo=${encodeURIComponent(
        "/lender/market/0xabc?chainId=1",
      )}`,
    )

    render(<AgreementPage party="Lender" />)
    clickCancel()

    expect(mockPush).toHaveBeenCalledWith("/lender/market/0xabc?chainId=1")
  })

  it("falls back to the party root when no target was carried", () => {
    render(<AgreementPage party="Lender" />)
    clickCancel()

    expect(mockPush).toHaveBeenCalledWith(ROUTES.lender.root)
    expect(mockBack).not.toHaveBeenCalled()
  })

  it("uses the borrower root for a borrower with no target", () => {
    render(<AgreementPage party="Borrower" />)
    clickCancel()

    expect(mockPush).toHaveBeenCalledWith(ROUTES.borrower.root)
  })

  it("refuses a target naming another origin", () => {
    setUrl(
      `/lender/agreement?returnTo=${encodeURIComponent(
        "https://evil.example/x",
      )}`,
    )

    render(<AgreementPage party="Lender" />)
    clickCancel()

    expect(mockPush).toHaveBeenCalledWith(ROUTES.lender.root)
  })

  it("never leaves the application, whatever the target says", () => {
    const hostile = [
      "https://evil.example/x",
      "//evil.example/x",
      "javascript:alert(1)",
      "/admin",
      "/lender/../../evil",
      "",
    ]

    hostile.forEach((value) => {
      mockPush.mockClear()
      setUrl(`/lender/agreement?returnTo=${encodeURIComponent(value)}`)

      const view = render(<AgreementPage party="Lender" />)
      clickCancel()

      expect(mockPush).toHaveBeenCalledWith(ROUTES.lender.root)
      view.unmount()
    })
  })
})
