/* eslint-disable import/no-extraneous-dependencies */
import { fireEvent, render, screen } from "@testing-library/react"

import type { ServiceAgreementPartyInput } from "@/app/api/service-agreement/interface"
import { useNetworkGate } from "@/hooks/useNetworkGate"

import { ToUReacceptanceModal } from "."

const mockPush = jest.fn()
const mockDispatch = jest.fn()
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/lender",
}))
jest.mock("wagmi", () => ({ useAccount: () => ({ address: "0x1234" }) }))
jest.mock("@/hooks/useNetworkGate", () => ({ useNetworkGate: jest.fn() }))
jest.mock("@/hooks/useToUReacceptance", () => ({
  useAcceptToU: () => ({ isPending: false, isReady: true, mutate: jest.fn() }),
  useDeclineToU: () => ({ isPending: false, isReady: true, mutate: jest.fn() }),
}))
jest.mock("@/store/hooks", () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (select: (state: unknown) => unknown) =>
    select({
      touModal: { forcedOpen: true },
      pendingSafeMessages: { records: {} },
    }),
}))
jest.mock("@/components/TxModalComponents/TxModalHeader", () => ({
  TxModalHeader: () => <div>Terms of Use</div>,
}))
jest.mock("@/components/Loader", () => ({ Loader: () => <div>Loading</div> }))

const accepted = {
  version: "terms-of-use-v2-2025-02-12",
  plaintextSha256: "previous-hash",
  effectiveDate: "2025-02-12T00:00:00Z",
}
const current = {
  version: "terms-of-use-v3-2026-10-22",
  plaintextSha256: "current-hash",
  effectiveDate: "2026-10-22T00:00:00Z",
}

beforeEach(() => {
  jest.clearAllMocks()
  sessionStorage.clear()
})

it.each(["Borrower", "Lender"] as ServiceAgreementPartyInput[])(
  "%s status exposes keyboard-accessible links to accepted and current terms",
  (party) => {
    jest.mocked(useNetworkGate).mockReturnValue({
      touState: "staleWithinGrace",
      touCurrentVersion: current,
      touAcceptedVersion: accepted,
      touParty: party,
      touDeadline: new Date("2026-11-21T00:00:00Z"),
      selectedChainId: 1,
    } as unknown as ReturnType<typeof useNetworkGate>)
    render(<ToUReacceptanceModal />)
    const path = `/${party.toLowerCase()}/agreement`
    const signed = screen.getByRole("button", { name: /Signed Version 2/ })
    expect(signed.tabIndex).toBe(0)
    fireEvent.click(signed)
    expect(mockPush).toHaveBeenLastCalledWith(
      `${path}?version=${accepted.version}`,
    )
    fireEvent.click(screen.getByRole("button", { name: /New Version 3/ }))
    expect(mockPush).toHaveBeenLastCalledWith(
      `${path}?version=${current.version}`,
    )
    fireEvent.click(screen.getByRole("button", { name: "View full terms" }))
    expect(mockPush).toHaveBeenLastCalledWith(path)
  },
)

it("the up-to-date status row opens the exact accepted version", () => {
  jest.mocked(useNetworkGate).mockReturnValue({
    touState: "signedCurrent",
    touCurrentVersion: current,
    touAcceptedVersion: current,
    touParty: "Lender",
    selectedChainId: 1,
  } as unknown as ReturnType<typeof useNetworkGate>)
  render(<ToUReacceptanceModal />)
  fireEvent.click(screen.getByRole("button", { name: /Signed Version 3/ }))
  expect(mockPush).toHaveBeenCalledWith(
    `/lender/agreement?version=${current.version}`,
  )
})
