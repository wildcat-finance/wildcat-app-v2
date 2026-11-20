/* eslint-disable import/no-extraneous-dependencies */
import { fireEvent, render, screen } from "@testing-library/react"

import AdminPage from "./page"

const mockToken = jest.fn()
const mockWallet = jest.fn()
jest.mock("wagmi", () => ({ useAccount: () => mockWallet() }))
jest.mock("@/hooks/useApiAuth", () => ({
  useAuthToken: () => mockToken(),
  useLogin: () => ({}),
}))
jest.mock("@/hooks/useSelectedNetwork", () => ({
  useSelectedNetwork: () => ({ chainId: 11155111 }),
}))
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
jest.mock("./components/KycAdminSection", () => ({
  KycAdminSection: () => <div>Membership form</div>,
}))
jest.mock("./components/BorrowersTable", () => ({
  BorrowersTable: () => <div>Borrowers table</div>,
}))
jest.mock("./components/BorrowerInvitesTable", () => ({
  BorrowerInvitesTable: () => <div>Invitations table</div>,
}))

beforeEach(() => {
  mockWallet.mockReturnValue({ address: "0x1234" })
  mockToken.mockReturnValue({ isAdmin: true, chainId: 11155111 })
})

it.each([
  [undefined, undefined, "auth.walletRequired"],
  ["0x1234", undefined, "auth.adminLoginRequired"],
  ["0x1234", { isAdmin: false, chainId: 11155111 }, "auth.adminAccessDenied"],
  ["0x1234", { isAdmin: true, chainId: 1 }, "auth.adminAccessDenied"],
])(
  "keeps the admin sections behind login on the selected chain",
  async (address, token, reason) => {
    mockWallet.mockReturnValue({ address })
    mockToken.mockReturnValue(token)
    render(<AdminPage />)
    await screen.findByText(String(reason))
    expect(
      screen.queryByRole("button", { name: "admin.kyc.adminTitle" }),
    ).toBeNull()
    expect(screen.queryByText("Invitations table")).toBeNull()
    expect(screen.queryByText("Membership form")).toBeNull()
  },
)

it("switches all three admin sections in place", async () => {
  render(<AdminPage />)
  await screen.findByText("Invitations table")
  const url = window.location.href
  const kyc = screen.getByRole("button", { name: "admin.kyc.adminTitle" })
  fireEvent.click(kyc)
  expect(kyc.getAttribute("aria-pressed")).toBe("true")
  expect(screen.getByText("Membership form")).toBeTruthy()
  expect(screen.queryByText("Invitations table")).toBeNull()
  fireEvent.click(
    screen.getByRole("button", { name: "admin.borrowers.registeredTitle" }),
  )
  expect(screen.getByText("Borrowers table")).toBeTruthy()
  expect(screen.queryByText("Membership form")).toBeNull()
  fireEvent.click(
    screen.getByRole("button", { name: "admin.invites.pendingTitle" }),
  )
  expect(screen.getByText("Invitations table")).toBeTruthy()
  expect(window.location.href).toBe(url)
})

it("opens on invitations after reloading from the KYC section", async () => {
  const page = render(<AdminPage />)
  fireEvent.click(
    await screen.findByRole("button", { name: "admin.kyc.adminTitle" }),
  )
  expect(screen.getByText("Membership form")).toBeTruthy()
  page.unmount()
  render(<AdminPage />)
  await screen.findByText("Invitations table")
  expect(screen.queryByText("Membership form")).toBeNull()
})
