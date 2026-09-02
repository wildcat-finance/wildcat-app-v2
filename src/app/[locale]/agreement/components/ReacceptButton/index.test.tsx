/* eslint-disable import/no-extraneous-dependencies */
import { fireEvent, render, screen } from "@testing-library/react"

import { ReacceptButton } from "@/app/[locale]/agreement/components/ReacceptButton"
import { ROUTES } from "@/routes"

const JAVASCRIPT_URL = ["javascript", "alert(1)"].join(":")

const mockReplace = jest.fn()
const mockBack = jest.fn()

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, back: mockBack }),
}))

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

// Accepting always succeeds here; the point under test is where the success
// handler navigates, not whether the signature works.
jest.mock("@/hooks/useToUReacceptance", () => ({
  useAcceptToU: () => ({
    mutate: (_input: unknown, options?: { onSuccess?: () => void }) =>
      options?.onSuccess?.(),
    isPending: false,
    isReady: true,
  }),
}))

const setUrl = (url: string) => window.history.replaceState({}, "", url)

describe("ReacceptButton", () => {
  beforeEach(() => {
    mockReplace.mockClear()
    mockBack.mockClear()
    setUrl("/lender/agreement")
  })

  it("returns to the page that sent the user here", () => {
    setUrl(
      `/lender/agreement?returnTo=${encodeURIComponent("/lender/my-markets")}`,
    )

    render(<ReacceptButton party="Lender" />)
    fireEvent.click(screen.getByRole("button"))

    expect(mockReplace).toHaveBeenCalledWith("/lender/my-markets")
    expect(mockBack).not.toHaveBeenCalled()
  })

  it("never leaves the application, whatever the target says", () => {
    const hostile = [
      "https://evil.example/x",
      "//evil.example/x",
      JAVASCRIPT_URL,
      "/admin",
      "/lender/../../evil",
    ]

    hostile.forEach((value) => {
      mockReplace.mockClear()
      setUrl(`/borrower/agreement?returnTo=${encodeURIComponent(value)}`)

      const view = render(<ReacceptButton party="Borrower" />)
      fireEvent.click(screen.getByRole("button"))

      expect(mockReplace).toHaveBeenCalledWith(ROUTES.borrower.root)
      expect(mockBack).not.toHaveBeenCalled()
      view.unmount()
    })
  })
})
