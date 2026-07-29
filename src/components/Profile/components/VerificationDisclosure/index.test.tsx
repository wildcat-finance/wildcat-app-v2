// eslint-disable-next-line import/no-extraneous-dependencies
import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { BorrowerProfileVerificationDisclosure } from "./index"

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

jest.mock("@/assets/icons/arrowRight_icon.svg", () => ({
  __esModule: true,
  default: "svg",
}))

jest.mock("@/assets/icons/check_icon.svg", () => ({
  __esModule: true,
  default: "svg",
}))

const ACKNOWLEDGEMENT_STORAGE_KEY =
  "borrower_profile_verification_acknowledged_v1"

describe("BorrowerProfileVerificationDisclosure", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("shows the disclosure once and persists acknowledgement", async () => {
    render(<BorrowerProfileVerificationDisclosure showNote={false} />)

    const acknowledge = await screen.findByRole("button", {
      name: "borrowerProfile.profile.verification.acknowledge",
    })

    fireEvent.click(acknowledge)

    expect(localStorage.getItem(ACKNOWLEDGEMENT_STORAGE_KEY)).toBe("true")
    await waitFor(() => {
      expect(
        screen.queryByRole("button", {
          name: "borrowerProfile.profile.verification.acknowledge",
        }),
      ).toBeNull()
    })
  })

  it("does not reopen the modal after acknowledgement", async () => {
    localStorage.setItem(ACKNOWLEDGEMENT_STORAGE_KEY, "true")

    render(<BorrowerProfileVerificationDisclosure />)

    expect(
      screen.getByText("borrowerProfile.profile.verification.title"),
    ).toBeTruthy()
    await waitFor(() => {
      expect(
        screen.queryByRole("button", {
          name: "borrowerProfile.profile.verification.acknowledge",
        }),
      ).toBeNull()
    })
  })

  it("can render the inline note without owning the modal", () => {
    render(
      <BorrowerProfileVerificationDisclosure
        variant="inline"
        showModal={false}
      />,
    )

    expect(
      screen.getByText("borrowerProfile.profile.verification.title"),
    ).toBeTruthy()
    expect(
      screen.queryByRole("button", {
        name: "borrowerProfile.profile.verification.acknowledge",
      }),
    ).toBeNull()
  })
})
