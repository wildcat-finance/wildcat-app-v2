/* eslint-disable import/no-extraneous-dependencies */
import { renderHook } from "@testing-library/react"

import { useSignAgreement } from "@/app/[locale]/agreement/hooks/useSignAgreement"
import { ROUTES } from "@/routes"

const JAVASCRIPT_URL = ["javascript", "alert(1)"].join(":")

const mockReplace = jest.fn()
const mockBack = jest.fn()

type MutationConfig = {
  onSuccess: (result: unknown, variables: { address: string }) => Promise<void>
}

let captured: MutationConfig | undefined

// Capture the mutation config so the success handler can be invoked directly.
// The signing path itself is not under test here; where it navigates is.
jest.mock("@tanstack/react-query", () => ({
  useMutation: (config: MutationConfig) => {
    captured = config
    return { mutate: jest.fn(), isPending: false }
  },
  useQueryClient: () => ({}),
}))

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, back: mockBack }),
  usePathname: () => "/lender/agreement",
}))

jest.mock("@/hooks/useEthersSigner", () => ({
  useEthersSigner: () => undefined,
}))
jest.mock("@/hooks/useSelectedNetwork", () => ({
  useSelectedNetwork: () => ({ chainId: 1 }),
}))
jest.mock("@/hooks/useSafeMessageSigning", () => ({
  useSafeMessageSigning: () => ({}),
}))
jest.mock("@/hooks/useCurrentServiceAgreement", () => ({
  useCurrentServiceAgreement: () => ({ data: undefined }),
}))
jest.mock("@/utils/serviceAgreementQueries", () => ({
  invalidateToUQueries: jest.fn().mockResolvedValue(undefined),
}))
jest.mock("@/components/Toasts", () => ({
  toastError: jest.fn(),
  toastRequest: jest.fn(),
}))

const setUrl = (url: string) => window.history.replaceState({}, "", url)

const succeed = async () => {
  renderHook(() => useSignAgreement())
  await captured?.onSuccess(undefined, { address: "0xabc" })
}

describe("useSignAgreement success navigation", () => {
  beforeEach(() => {
    mockReplace.mockClear()
    mockBack.mockClear()
    captured = undefined
    setUrl("/lender/agreement")
  })

  it("returns to the page that sent the user here", async () => {
    setUrl(
      `/lender/agreement?returnTo=${encodeURIComponent("/lender/my-markets")}`,
    )

    await succeed()

    expect(mockReplace).toHaveBeenCalledWith("/lender/my-markets")
    expect(mockBack).not.toHaveBeenCalled()
  })

  it("falls back to the lender root when nothing was carried", async () => {
    await succeed()

    expect(mockReplace).toHaveBeenCalledWith(ROUTES.lender.root)
  })

  it("never leaves the application after a successful signature", async () => {
    const hostile = [
      "https://evil.example/x",
      "//evil.example/x",
      JAVASCRIPT_URL,
      "/admin",
      "/lender/../../evil",
    ]

    // eslint-disable-next-line no-restricted-syntax
    for (const value of hostile) {
      mockReplace.mockClear()
      setUrl(`/lender/agreement?returnTo=${encodeURIComponent(value)}`)

      // eslint-disable-next-line no-await-in-loop
      await succeed()

      expect(mockReplace).toHaveBeenCalledWith(ROUTES.lender.root)
      expect(mockBack).not.toHaveBeenCalled()
    }
  })
})
