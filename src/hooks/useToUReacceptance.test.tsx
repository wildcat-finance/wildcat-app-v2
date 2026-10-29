/* eslint-disable import/no-extraneous-dependencies */
import { PropsWithChildren } from "react"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { Wallet } from "ethers"
import { verifyMessage } from "ethers/lib/utils"

import type {
  AcceptServiceAgreementInput,
  CurrentServiceAgreementResponse,
  DeclineServiceAgreementInput,
  ServiceAgreementPartyInput,
} from "@/app/api/service-agreement/interface"
import { toastError } from "@/components/Toasts"
import type {
  MessageToSign,
  WalletMessageSignature,
} from "@/hooks/useSafeMessageSigning"
import {
  buildServiceAgreementDeclineMessage,
  buildServiceAgreementMessage,
} from "@/utils/serviceAgreementMessage"

import { useAcceptToU, useDeclineToU } from "./useToUReacceptance"

const mockWallet = Wallet.createRandom()
const mockSigner = { chainId: 1 }
const mockSafeSigning = {
  safeConnected: false,
  signMessage: jest.fn<Promise<WalletMessageSignature>, [MessageToSign]>(),
  markSubmitting: jest.fn(),
  markCompleted: jest.fn(),
  markSubmissionFailed: jest.fn(),
}
const mockStore = { pendingSafeMessages: { records: {} } }

jest.mock("wagmi", () => ({
  useAccount: () => ({ address: mockWallet.address }),
}))
jest.mock("@wildcatfi/wildcat-sdk", () => ({
  isSupportedChainId: (id: number) => id === 1,
}))
jest.mock("@/hooks/useEthersSigner", () => ({
  useEthersSigner: () => mockSigner,
}))
jest.mock("@/hooks/useSelectedNetwork", () => ({
  useSelectedNetwork: () => ({ chainId: 1 }),
}))
jest.mock("@/hooks/useSafeMessageSigning", () => ({
  useSafeMessageSigning: () => mockSafeSigning,
}))
jest.mock("@/store/hooks", () => ({
  useAppSelector: (select: (state: unknown) => unknown) => select(mockStore),
}))
jest.mock("@/config/query-keys", () => ({
  QueryKeys: {
    ServiceAgreement: {
      GET_CURRENT: () => ["service-agreement", "current"],
      GET_STATUS: (chainId: number, address: string) => [
        "service-agreement",
        "status",
        chainId,
        address,
      ],
    },
  },
}))
jest.mock("@/components/Toasts", () => ({
  toastRequest: (promise: Promise<unknown>) => promise,
  toastError: jest.fn(),
  toastSuccess: jest.fn(),
}))

const previous: CurrentServiceAgreementResponse = {
  version: "test-tou-v2",
  plaintextSha256: "previous-test-hash",
  acknowledgementText: "DIAGNOSTIC FIXTURE ONLY: accept test v2.",
  plaintext: "Test v2",
  html: "<p>Test v2</p>",
  legacyWrapperHash: null,
  effectiveDate: "2025-02-12T00:00:00Z",
  reacceptanceDeadline: null,
}
const current: CurrentServiceAgreementResponse = {
  ...previous,
  version: "test-tou-v3",
  plaintextSha256: "current-test-hash",
  acknowledgementText: "DIAGNOSTIC FIXTURE ONLY: accept test v3.",
}
const clients: QueryClient[] = []
let serverAgreement: CurrentServiceAgreementResponse
let serverName: string
let failedRead: "agreement" | "profile" | undefined
let submissions: DeclineServiceAgreementInput[]
const originalFetch = global.fetch

const jsonResponse = (body: unknown, status = 200) =>
  ({ ok: status < 400, status, json: async () => body }) as Response

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, "log").mockImplementation(() => {})
  mockSigner.chainId = 1
  mockSafeSigning.safeConnected = false
  serverAgreement = previous
  serverName = "Test Borrower Ltd"
  failedRead = undefined
  submissions = []
  mockSafeSigning.signMessage.mockImplementation(async (input) => {
    const message = await input.buildMessage(input.timeSigned, input.context)
    return {
      message,
      signature: await mockWallet.signMessage(message),
      timeSigned: input.timeSigned,
      context: input.context,
    }
  })
  global.fetch = jest.fn(async (input, init) => {
    const url = String(input)
    if (url === "/api/service-agreement/current") {
      return failedRead === "agreement"
        ? jsonResponse({}, 503)
        : jsonResponse(serverAgreement)
    }
    if (url.startsWith("/api/profiles/")) {
      return failedRead === "profile"
        ? jsonResponse({}, 503)
        : jsonResponse({ profile: { name: serverName } })
    }
    if (
      url === "/api/service-agreement/accept" ||
      url === "/api/service-agreement/decline"
    ) {
      const body = JSON.parse(
        String(init?.body),
      ) as DeclineServiceAgreementInput
      submissions.push(body)
      const signingInput = {
        ...body,
        organizationName: body.party === "Borrower" ? serverName : undefined,
      }
      const message = url.endsWith("/accept")
        ? buildServiceAgreementMessage({
            ...signingInput,
            acknowledgementText: serverAgreement.acknowledgementText,
          })
        : buildServiceAgreementDeclineMessage({
            ...signingInput,
            version: serverAgreement.version,
            plaintextSha256: serverAgreement.plaintextSha256,
          })
      return verifyMessage(message, body.signature) === mockWallet.address
        ? jsonResponse({ success: true })
        : jsonResponse({ error: "Invalid signature" }, 400)
    }
    throw Error(`Unexpected request: ${url}`)
  })
})

afterEach(() => {
  cleanup()
  clients.splice(0).forEach((client) => client.clear())
  global.fetch = originalFetch
  jest.restoreAllMocks()
})

const mount = async (party: ServiceAgreementPartyInput = "Borrower") => {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
        staleTime: 30_000,
        gcTime: Infinity,
      },
      mutations: { retry: false, gcTime: Infinity },
    },
  })
  clients.push(client)
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  const flow = renderHook(
    () => ({ accept: useAcceptToU(party), decline: useDeclineToU(party) }),
    { wrapper },
  )
  await waitFor(() => expect(flow.result.current.accept.isReady).toBe(true))
  return flow
}

type Flow = Awaited<ReturnType<typeof mount>>
type Action = "accept" | "decline"
const submit = (flow: Flow, action: Action) =>
  action === "accept"
    ? flow.result.current.accept.mutateAsync()
    : flow.result.current.decline.mutateAsync({ reason: " Test reason " })

describe.each<Action>(["accept", "decline"])("%s", (action) => {
  it.each<ServiceAgreementPartyInput>(["Borrower", "Lender"])(
    "refreshes signing inputs for %s in an already mounted tab",
    async (party) => {
      const flow = await mount(party)
      // Both queries still consider their v2 data fresh. No remount/refocus.
      serverAgreement = current
      serverName = "Renamed Test Borrower Ltd"

      await act(async () => {
        await submit(flow, action)
      })

      expect(submissions).toHaveLength(1)
      expect(submissions[0]).toMatchObject({ party, chainId: 1 })
      expect(mockSafeSigning.signMessage).toHaveBeenCalledTimes(1)
      expect(toastError).not.toHaveBeenCalled()
    },
  )

  it.each(["agreement", "profile"] as const)(
    "does not sign cached data when refreshing the %s fails",
    async (read) => {
      const flow = await mount()
      serverAgreement = current
      failedRead = read

      await act(async () => {
        await expect(submit(flow, action)).rejects.toThrow()
      })

      expect(mockSafeSigning.signMessage).not.toHaveBeenCalled()
      expect(submissions).toHaveLength(0)
      expect(toastError).toHaveBeenCalled()

      await waitFor(() =>
        expect(flow.result.current[action].isError).toBe(true),
      )
      expect(flow.result.current[action].isReady).toBe(true)
      failedRead = undefined
      await act(async () => {
        await submit(flow, action)
      })
      expect(submissions).toHaveLength(1)
    },
  )

  it("checks the current terms again after a rejected submission", async () => {
    const flow = await mount()
    mockSafeSigning.signMessage.mockImplementationOnce(async (input) => {
      const message = await input.buildMessage(input.timeSigned, input.context)
      serverAgreement = current // Publication while the wallet prompt is open.
      return {
        message,
        signature: await mockWallet.signMessage(message),
        timeSigned: input.timeSigned,
      }
    })

    await act(async () => {
      await expect(submit(flow, action)).rejects.toThrow()
    })
    await act(async () => {
      await submit(flow, action)
    })

    expect(submissions).toHaveLength(2)
  })
})

it("preserves a resumed Safe signature's timestamp and refreshed message", async () => {
  const flow = await mount()
  serverAgreement = current
  mockSafeSigning.safeConnected = true
  const pendingTime = Date.now() - 60_000
  mockSafeSigning.signMessage.mockImplementationOnce(async (input) => {
    const message = await input.buildMessage(pendingTime, input.context)
    expect(message).toContain(current.acknowledgementText)
    return {
      message,
      signature: await mockWallet.signMessage(message),
      timeSigned: pendingTime,
      pendingSafeMessageId: "test-pending-message",
      context: input.context,
    }
  })

  await act(async () => {
    await submit(flow, "accept")
  })

  expect(submissions[0]).toMatchObject<Partial<AcceptServiceAgreementInput>>({
    timeSigned: pendingTime,
    party: "Borrower",
  })
  expect(mockSafeSigning.markCompleted).toHaveBeenCalledWith(
    "test-pending-message",
  )
})
