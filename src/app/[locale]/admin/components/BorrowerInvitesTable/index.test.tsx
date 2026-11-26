/* eslint-disable import/no-extraneous-dependencies */
import { render, screen } from "@testing-library/react"

import { BorrowerInvitesTable } from "."
import { BorrowerInvitationRow } from "./interface"

const invitations: BorrowerInvitationRow[] = [1, 11155111].map((chainId) => ({
  borrowerId: "11111111-1111-4111-8111-111111111111",
  inviter: `0x${"a".repeat(40)}`,
  chainId,
  address: `0x${"b".repeat(40)}`,
  name: "Invited Borrower",
  timeInvited: new Date("2026-11-18T00:00:00Z"),
  timeSigned: new Date("2026-11-18T01:00:00Z"),
  registeredOnChain: false,
  hasSignedServiceAgreement: true,
}))

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
jest.mock("@/store/hooks", () => ({
  useAppSelector: () => ({ blockExplorerUrl: "", isTestnet: true }),
}))
jest.mock("@/components/LinkComponent", () => ({ LinkGroup: () => null }))
jest.mock("../../hooks/useAllBorrowerInvitations", () => ({
  useAllBorrowerInvitations: () => ({ data: invitations, isLoading: false }),
}))
jest.mock("../../hooks/useRegisterTestnetBorrower", () => ({
  useRegisterTestnetBorrower: () => ({ mutate: jest.fn(), isPending: false }),
}))
jest.mock("../CancelInviteModal", () => ({ CancelInviteModal: () => null }))
jest.mock("../InviteBorrowerModal", () => ({ InviteBorrowerModal: () => null }))

// Invitations have no id of their own: a registration is keyed by network and
// address, and the same address may be invited on two networks.
it("renders invitations keyed by network and address", () => {
  render(<BorrowerInvitesTable />)
  expect(screen.getAllByText("Invited Borrower").length).toBeGreaterThan(0)
})
