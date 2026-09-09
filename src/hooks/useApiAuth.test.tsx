/* eslint-disable import/no-extraneous-dependencies */
import { ReactNode } from "react"

import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import { useConfig } from "wagmi"
import { getAccount } from "wagmi/actions"

import { getLoginSignatureMessage } from "@/config/api"
import { useSafeOwnerLogin } from "@/providers/SafeOwnerLoginProvider"
import { useAppDispatch, useAppStore } from "@/store/hooks"
import { setApiToken } from "@/store/slices/apiTokensSlice/apiTokensSlice"

import { useLogin } from "./useApiAuth"
import { useEthersSigner } from "./useEthersSigner"
import { MessageToSign, useSafeMessageSigning } from "./useSafeMessageSigning"
import { useSelectedNetwork } from "./useSelectedNetwork"

jest.mock("react-i18next", () => {
  const en = jest.requireActual("@/locales/en/en.json")
  const t = (key: string) =>
    key.split(".").reduce((value, part) => value[part], en)
  return { useTranslation: () => ({ t }) }
})
jest.mock("@safe-global/safe-apps-react-sdk", () => ({
  useSafeAppsSDK: jest.fn(),
}))
jest.mock("wagmi/actions", () => ({ getAccount: jest.fn() }))
jest.mock("wagmi", () => ({ useAccount: jest.fn(), useConfig: jest.fn() }))
jest.mock("@/components/Toasts", () => ({
  toastError: jest.fn(),
  toastRequest: (promise: Promise<unknown>) => promise,
}))
jest.mock("@/providers/SafeOwnerLoginProvider", () => ({
  useSafeOwnerLogin: jest.fn(),
}))
jest.mock("@/store/hooks", () => ({
  useAppDispatch: jest.fn(),
  useAppStore: jest.fn(),
}))
jest.mock("./useEthersSigner", () => ({ useEthersSigner: jest.fn() }))
jest.mock("./useSelectedNetwork", () => ({ useSelectedNetwork: jest.fn() }))
jest.mock("./useSafeMessageSigning", () => ({
  useSafeMessageSigning: jest.fn(),
}))

const address = "0xc15be5214978d1fc509ecdd4f9d5bc067c94d9ae"
const otherAddress = "0x1111111111111111111111111111111111111111"
const primaryConfig = { id: "active-wagmi-provider" }
const dispatch = jest.fn()
const signAsOwner = jest.fn()
const signMessage = jest.fn()
const safeSigning = {
  signMessage: jest.fn(),
  markSubmitting: jest.fn(),
  markCompleted: jest.fn(),
  markSubmissionFailed: jest.fn(),
}
const fetchMock = jest.fn()
const getState = jest.fn()
const originalFetch = global.fetch
let queryClient: QueryClient
const token = {
  address,
  signer: otherAddress,
  chainId: 9745,
  token: "session",
  isAdmin: false,
}
const signed = { signature: "0xowner-signature", timeSigned: 123 }

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

const account = (chainId = 9745, accountAddress = address) => {
  jest.mocked(getAccount).mockReturnValue({
    address: accountAddress,
    chainId,
    connector: { id: "safe" },
  } as unknown as ReturnType<typeof getAccount>)
}

beforeEach(() => {
  jest.clearAllMocks()
  queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  global.fetch = fetchMock
  fetchMock.mockResolvedValue({ ok: true, json: async () => token })
  account()
  jest
    .mocked(useConfig)
    .mockReturnValue(primaryConfig as unknown as ReturnType<typeof useConfig>)
  jest.mocked(useSafeAppsSDK).mockReturnValue({
    connected: true,
    safe: { safeAddress: address, chainId: 9745 },
  } as ReturnType<typeof useSafeAppsSDK>)
  jest.mocked(useSafeOwnerLogin).mockReturnValue(signAsOwner)
  signAsOwner.mockResolvedValue(signed)
  jest
    .mocked(useSafeMessageSigning)
    .mockReturnValue(
      safeSigning as unknown as ReturnType<typeof useSafeMessageSigning>,
    )
  signMessage.mockResolvedValue("0xeoa-signature")
  jest
    .mocked(useEthersSigner)
    .mockReturnValue({ signMessage, chainId: 9745 } as unknown as ReturnType<
      typeof useEthersSigner
    >)
  jest
    .mocked(useSelectedNetwork)
    .mockReturnValue({ chainId: 9745 } as ReturnType<typeof useSelectedNetwork>)
  jest.mocked(useAppDispatch).mockReturnValue(dispatch)
  getState.mockReturnValue({ selectedNetwork: { chainId: 9745 } })
  jest
    .mocked(useAppStore)
    .mockReturnValue({ getState } as unknown as ReturnType<typeof useAppStore>)
})

afterEach(() => {
  queryClient.clear()
  global.fetch = originalFetch
})

it("submits the owner signature as the Safe and stores the Safe session", async () => {
  const { result } = renderHook(useLogin, { wrapper })
  await act(async () => {
    await result.current.mutateAsync(address)
  })
  expect(getAccount).toHaveBeenCalledWith(primaryConfig)
  expect(signAsOwner).toHaveBeenCalledWith(
    { address, chainId: 9745 },
    expect.any(Function),
  )
  expect(signMessage).not.toHaveBeenCalled()
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
    ...signed,
    address,
    chainId: 9745,
  })
  expect(dispatch).toHaveBeenCalledWith(setApiToken(token))
})

it.each(["0x", "0xthreshold-signature"])(
  "submits a full Safe proof (%s) with its original timestamp and completes the pending message",
  async (signature) => {
    const { signal } = new AbortController()
    signAsOwner.mockImplementationOnce((_scope, fallback) => fallback(signal))
    safeSigning.signMessage.mockImplementationOnce(
      async (input: MessageToSign) => {
        expect(input.flow).toBe("safe-login")
        expect(input.signal).toBe(signal)
        expect(input.expiresAt).toBe((input.timeSigned + 3600) * 1000)
        expect(await input.buildMessage(123)).toBe(
          getLoginSignatureMessage(address, 123, 9745),
        )
        return {
          signature,
          timeSigned: 123,
          message: "login",
          pendingSafeMessageId: "pending-login",
        }
      },
    )
    const { result } = renderHook(useLogin, { wrapper })
    await act(async () => {
      await result.current.mutateAsync(address)
    })
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      signature,
      timeSigned: 123,
      address,
      chainId: 9745,
    })
    expect(safeSigning.markSubmitting).toHaveBeenCalledWith("pending-login")
    expect(safeSigning.markCompleted).toHaveBeenCalledWith("pending-login")
    expect(dispatch).toHaveBeenCalledWith(setApiToken(token))
  },
)

it("retains a full Safe proof for retry when login submission fails", async () => {
  signAsOwner.mockResolvedValueOnce({
    signature: "0x",
    timeSigned: 123,
    pendingSafeMessageId: "pending-login",
  })
  fetchMock.mockRejectedValueOnce(new Error("Network unavailable"))
  const { result } = renderHook(useLogin, { wrapper })
  await act(async () => {
    await expect(result.current.mutateAsync(address)).rejects.toThrow(
      "Network unavailable",
    )
  })
  expect(safeSigning.markCompleted).not.toHaveBeenCalled()
  expect(safeSigning.markSubmissionFailed).toHaveBeenCalledWith(
    "pending-login",
    expect.any(Error),
  )
  expect(dispatch).not.toHaveBeenCalled()
})

it("retains direct signing for an ordinary connected wallet", async () => {
  jest
    .mocked(useSafeAppsSDK)
    .mockReturnValue({ connected: false } as ReturnType<typeof useSafeAppsSDK>)
  jest.mocked(getAccount).mockReturnValue({
    address,
    chainId: 9745,
    connector: { id: "injected" },
  } as unknown as ReturnType<typeof getAccount>)
  const { result } = renderHook(useLogin, { wrapper })
  await act(async () => {
    await result.current.mutateAsync(address)
  })
  expect(signAsOwner).not.toHaveBeenCalled()
  const body = JSON.parse(fetchMock.mock.calls[0][1].body)
  expect(signMessage).toHaveBeenCalledWith(
    getLoginSignatureMessage(address, body.timeSigned, 9745),
  )
  expect(body.signature).toBe("0xeoa-signature")
})

it("does not fall through to multisig signing while the Safe SDK is still loading", async () => {
  jest
    .mocked(useSafeAppsSDK)
    .mockReturnValue({ connected: false } as ReturnType<typeof useSafeAppsSDK>)
  const { result } = renderHook(useLogin, { wrapper })
  await act(async () => {
    await expect(result.current.mutateAsync(address)).rejects.toThrow(
      "not ready",
    )
  })
  expect(signMessage).not.toHaveBeenCalled()
  expect(fetchMock).not.toHaveBeenCalled()
})

it("rejects a mismatched selected network before asking for a signature", async () => {
  account(1)
  const { result } = renderHook(useLogin, { wrapper })
  await act(async () => {
    await expect(result.current.mutateAsync(address)).rejects.toThrow("network")
  })
  expect(signAsOwner).not.toHaveBeenCalled()
  expect(fetchMock).not.toHaveBeenCalled()
})

it.each(["account", "network"])(
  "does not submit if the %s changes while signing",
  async (change) => {
    signAsOwner.mockImplementationOnce(async () => {
      if (change === "account") account(9745, otherAddress)
      else getState.mockReturnValue({ selectedNetwork: { chainId: 1 } })
      return signed
    })
    const { result } = renderHook(useLogin, { wrapper })
    await act(async () => {
      await expect(result.current.mutateAsync(address)).rejects.toThrow()
    })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(dispatch).not.toHaveBeenCalled()
  },
)

it("discards a completed response if the primary account changed during submission", async () => {
  fetchMock.mockImplementationOnce(async () => {
    account(9745, otherAddress)
    return { ok: true, json: async () => token }
  })
  const { result } = renderHook(useLogin, { wrapper })
  await act(async () => {
    await expect(result.current.mutateAsync(address)).rejects.toThrow(
      "account changed",
    )
  })
  expect(dispatch).not.toHaveBeenCalled()
})

it("does not submit cancelled login and permits a fresh retry", async () => {
  signAsOwner.mockRejectedValueOnce(new Error("Login cancelled"))
  const { result } = renderHook(useLogin, { wrapper })
  await act(async () => {
    await expect(result.current.mutateAsync(address)).rejects.toThrow(
      "cancelled",
    )
  })
  expect(fetchMock).not.toHaveBeenCalled()
  await act(async () => {
    await result.current.mutateAsync(address)
  })
  expect(dispatch).toHaveBeenCalledWith(setApiToken(token))
})

it("surfaces API rejection without storing a session", async () => {
  fetchMock.mockResolvedValueOnce({
    ok: false,
    json: async () => ({ error: "Invalid signature" }),
  })
  const { result } = renderHook(useLogin, { wrapper })
  await act(async () => {
    await expect(result.current.mutateAsync(address)).rejects.toThrow(
      "Invalid signature",
    )
  })
  expect(dispatch).not.toHaveBeenCalled()
})

it.each(["account", "network"])(
  "rejects a session returned for the wrong %s",
  async (mismatch) => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ...token,
        ...(mismatch === "account"
          ? { address: otherAddress }
          : { chainId: 1 }),
      }),
    })
    const { result } = renderHook(useLogin, { wrapper })
    await act(async () => {
      await expect(result.current.mutateAsync(address)).rejects.toThrow(
        "wrong account or network",
      )
    })
    expect(dispatch).not.toHaveBeenCalled()
  },
)

it("reports pending login to other login buttons until signing finishes", async () => {
  let finishSigning: (value: typeof signed) => void
  signAsOwner.mockReturnValueOnce(
    new Promise((resolve) => {
      finishSigning = resolve
    }),
  )
  const { result } = renderHook(() => [useLogin(), useLogin()], { wrapper })
  let login: Promise<unknown>
  await act(async () => {
    login = result.current[0].mutateAsync(address)
  })
  await waitFor(() => {
    expect(result.current[0].isPending).toBe(true)
    expect(result.current[1].isPending).toBe(true)
  })
  await act(async () => {
    finishSigning!(signed)
    await login
  })
  await waitFor(() => {
    expect(result.current[0].isPending).toBe(false)
    expect(result.current[1].isPending).toBe(false)
  })
})
