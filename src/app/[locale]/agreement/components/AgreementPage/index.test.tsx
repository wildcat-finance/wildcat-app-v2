/* eslint-disable import/no-extraneous-dependencies */
import { fireEvent, render, screen } from "@testing-library/react"

import type { ServiceAgreementPartyInput } from "@/app/api/service-agreement/interface"
import { useCurrentServiceAgreement } from "@/hooks/useCurrentServiceAgreement"
import { useNetworkGate } from "@/hooks/useNetworkGate"
import {
  useServiceAgreementVersion,
  useServiceAgreementVersions,
} from "@/hooks/useServiceAgreementVersions"

import { AgreementPage } from "."

const mockReplace = jest.fn()
const mockBack = jest.fn()
let mockSearch = ""
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, back: mockBack }),
  usePathname: () => "/lender/agreement",
  useSearchParams: () => new URLSearchParams(mockSearch),
}))
jest.mock("react-i18next", () => ({
  Trans: ({ i18nKey }: { i18nKey: string }) => i18nKey,
}))
jest.mock("@/hooks/useCurrentServiceAgreement", () => ({
  useCurrentServiceAgreement: jest.fn(),
}))
jest.mock("@/hooks/useServiceAgreementVersions", () => ({
  useServiceAgreementVersion: jest.fn(),
  useServiceAgreementVersions: jest.fn(),
}))
jest.mock("@/hooks/useNetworkGate", () => ({ useNetworkGate: jest.fn() }))
jest.mock("../AgreementText", () => ({
  AgreementText: ({
    markdown,
    isLoading,
  }: {
    markdown?: string
    isLoading: boolean
  }) => <div>{isLoading ? "Loading terms" : markdown}</div>,
}))
jest.mock("../SignButton", () => ({
  SignButton: () => <button type="button">Sign current terms</button>,
}))
jest.mock("../ReacceptButton", () => ({
  ReacceptButton: () => <button type="button">Reaccept current terms</button>,
}))

const current = {
  version: "terms-of-use-v3-2026-10-22",
  plaintext: "The current terms",
  plaintextSha256: "current-hash",
  effectiveDate: "2026-10-22T00:00:00Z",
}
const previous = {
  version: "terms-of-use-v2-2025-02-12",
  plaintext: "The previous terms",
  plaintextSha256: "previous-hash",
  effectiveDate: "2025-02-12T00:00:00Z",
}
const result = (data: unknown) => ({
  data,
  isSuccess: true,
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
})

const setCurrent = (value: ReturnType<typeof result>) =>
  jest
    .mocked(useCurrentServiceAgreement)
    .mockReturnValue(
      value as unknown as ReturnType<typeof useCurrentServiceAgreement>,
    )
const setHistory = (value: ReturnType<typeof result>) =>
  jest
    .mocked(useServiceAgreementVersion)
    .mockReturnValue(
      value as unknown as ReturnType<typeof useServiceAgreementVersion>,
    )
const setGate = (state: string, version = current) =>
  jest.mocked(useNetworkGate).mockReturnValue({
    touState: state,
    touCurrentVersion: version,
    touAcceptedVersion: previous,
  } as unknown as ReturnType<typeof useNetworkGate>)

beforeEach(() => {
  jest.clearAllMocks()
  mockSearch = ""
  setCurrent(result(current))
  setHistory(result(previous))
  setGate("staleWithinGrace")
  jest.mocked(useServiceAgreementVersions).mockReturnValue(
    result([
      { ...current, isCurrent: true, isAvailable: true },
      { ...previous, isCurrent: false, isAvailable: true },
      {
        ...previous,
        version: "legacy-service-agreement-2023-12-18",
        isCurrent: false,
        isAvailable: false,
      },
    ]) as unknown as ReturnType<typeof useServiceAgreementVersions>,
  )
  jest.spyOn(window, "open").mockImplementation(() => null)
})

afterEach(() => jest.restoreAllMocks())

it.each(["Borrower", "Lender"] as ServiceAgreementPartyInput[])(
  "%s can read and download the selected history without signing it",
  (party) => {
    mockSearch = `version=${previous.version}`
    render(<AgreementPage party={party} />)
    expect(screen.getByText(previous.plaintext)).toBeTruthy()
    expect(screen.queryByText(current.plaintext)).toBeNull()
    expect(
      screen.queryByRole("button", { name: /^(Reaccept|Sign) current terms$/ }),
    ).toBeNull()
    fireEvent.click(
      screen.getByRole("button", { name: "agreement.page.download" }),
    )
    expect(window.open).toHaveBeenCalledWith(
      `/api/service-agreement/versions/${previous.version}/download`,
      "_blank",
      "noopener,noreferrer",
    )
    expect(useNetworkGate).toHaveBeenCalledWith({ agreementParty: party })
  },
)

it.each(["loading", "error"])(
  "never offers signing or a current-document fallback when history is %s",
  (state) => {
    mockSearch = "version=unknown"
    setHistory({
      ...result(undefined),
      isSuccess: false,
      isLoading: state === "loading",
      isError: state === "error",
    })
    render(<AgreementPage party="Lender" />)
    expect(screen.queryByText(current.plaintext)).toBeNull()
    expect(
      screen.queryByRole("button", { name: /^(Reaccept|Sign) current terms$/ }),
    ).toBeNull()
    expect(
      (
        screen.getByRole("button", {
          name: "agreement.page.download",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true)
    expect(screen.getByRole("button", { name: "View current" })).toBeTruthy()
  },
)

it("does not sign an explicit selection before the current version is known", () => {
  mockSearch = `version=${previous.version}`
  setCurrent({ ...result(undefined), isSuccess: false, isLoading: true })
  render(<AgreementPage party="Lender" />)
  expect(
    screen.queryByRole("button", { name: /^(Reaccept|Sign) current terms$/ }),
  ).toBeNull()
})

it.each(["", `version=${current.version}`])(
  "preserves current-version signing for query %s and pins its download",
  (query) => {
    mockSearch = query
    setGate("neverSigned")
    render(<AgreementPage party="Lender" />)
    expect(
      screen.getByRole("button", { name: "Sign current terms" }),
    ).toBeTruthy()
    fireEvent.click(
      screen.getByRole("button", { name: "agreement.page.download" }),
    )
    expect(window.open).toHaveBeenCalledWith(
      `/api/service-agreement/versions/${current.version}/download`,
      "_blank",
      "noopener,noreferrer",
    )
  },
)

it("preserves borrower reacceptance on the current page", () => {
  render(<AgreementPage party="Borrower" />)
  expect(
    screen.getByRole("button", { name: "Reaccept current terms" }),
  ).toBeTruthy()
})

it("hides signing if the gate and displayed current document disagree", () => {
  setGate("staleExpired", { ...current, plaintextSha256: "different-hash" })
  render(<AgreementPage party="Lender" />)
  expect(
    screen.queryByRole("button", { name: /^(Reaccept|Sign) current terms$/ }),
  ).toBeNull()
})

it("disables unavailable history and replaces the selection without losing other URL parameters", () => {
  mockSearch = "from=status"
  render(<AgreementPage party="Lender" />)
  fireEvent.click(
    screen.getByRole("button", { name: "Choose Terms of Use version" }),
  )
  expect(
    screen
      .getByRole("menuitem", { name: /Legacy/ })
      .getAttribute("aria-disabled"),
  ).toBe("true")
  fireEvent.click(screen.getByRole("menuitem", { name: /Version 2/ }))
  expect(mockReplace).toHaveBeenCalledWith(
    `/lender/agreement?from=status&version=${previous.version}`,
    { scroll: false },
  )
})

it("returning to current terms clears only the version selection", () => {
  mockSearch = `from=status&version=${previous.version}`
  const { rerender } = render(<AgreementPage party="Borrower" />)
  fireEvent.click(screen.getByRole("button", { name: "View current" }))
  expect(mockReplace).toHaveBeenCalledWith("/lender/agreement?from=status", {
    scroll: false,
  })
  mockSearch = "from=status"
  rerender(<AgreementPage party="Borrower" />)
  expect(screen.getByText(current.plaintext)).toBeTruthy()
  expect(
    screen.getByRole("button", { name: "Reaccept current terms" }),
  ).toBeTruthy()
})
