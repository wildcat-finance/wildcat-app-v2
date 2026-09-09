/* eslint-disable import/no-extraneous-dependencies */
import { configureStore } from "@reduxjs/toolkit"
import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { act, renderHook, waitFor } from "@testing-library/react"
import { useAccount } from "wagmi"

import { getLoginSignatureMessage } from "@/config/api"
import { proposeSafeMessage } from "@/lib/safeMessageSigning"
import { useAppDispatch, useAppStore } from "@/store/hooks"
import {
  addPendingSafeMessage,
  markSafeMessageSignatureReady,
  pendingSafeMessagesReducer,
} from "@/store/slices/pendingSafeMessagesSlice/pendingSafeMessagesSlice"

import { useEthersSigner } from "./useEthersSigner"
import { MessageToSign, useSafeMessageSigning } from "./useSafeMessageSigning"

jest.mock("@safe-global/safe-apps-react-sdk", () => ({
  useSafeAppsSDK: jest.fn(),
}))
jest.mock("wagmi", () => ({ useAccount: jest.fn() }))
jest.mock("./useEthersSigner", () => ({ useEthersSigner: jest.fn() }))
jest.mock("@/store/hooks", () => ({
  useAppStore: jest.fn(),
  useAppDispatch: jest.fn(),
}))
jest.mock("@/lib/safeMessageSigning", () => ({
  ...jest.requireActual("@/lib/safeMessageSigning"),
  proposeSafeMessage: jest.fn(),
}))

const address = "0xc15be5214978d1fc509ecdd4f9d5bc067c94d9ae"
const chainId = 9745
const createStore = () =>
  configureStore({
    reducer: { pendingSafeMessages: pendingSafeMessagesReducer },
  })
let store: ReturnType<typeof createStore>

const request = (signal?: AbortSignal): MessageToSign => {
  const timeSigned = Math.floor(Date.now() / 1000)
  return {
    flow: "safe-login",
    address,
    chainId,
    timeSigned,
    signal,
    expiresAt: (timeSigned + 3600) * 1000,
    buildMessage: (time) => getLoginSignatureMessage(address, time, chainId),
  }
}
const records = () =>
  Object.values(store.getState().pendingSafeMessages.records)

beforeEach(() => {
  jest.clearAllMocks()
  store = createStore()
  jest
    .mocked(useAppStore)
    .mockReturnValue(store as unknown as ReturnType<typeof useAppStore>)
  jest.mocked(useAppDispatch).mockReturnValue(store.dispatch)
  jest
    .mocked(useAccount)
    .mockReturnValue({ connector: { id: "safe" } } as ReturnType<
      typeof useAccount
    >)
  jest
    .mocked(useEthersSigner)
    .mockReturnValue({ chainId } as ReturnType<typeof useEthersSigner>)
  jest.mocked(useSafeAppsSDK).mockReturnValue({
    sdk: {},
    connected: true,
    safe: { safeAddress: address, chainId },
  } as ReturnType<typeof useSafeAppsSDK>)
  jest
    .mocked(proposeSafeMessage)
    .mockResolvedValue({ kind: "offchain", messageHash: "0xmessage" })
})

it("cancels the waiter, retains the proposal, and resumes its original proof without asking Safe again", async () => {
  const { result } = renderHook(useSafeMessageSigning)
  const controller = new AbortController()
  const initial = request(controller.signal)
  let pending: ReturnType<typeof result.current.signMessage>
  await act(async () => {
    pending = result.current.signMessage(initial)
  })
  await waitFor(() => expect(records()).toHaveLength(1))
  const [record] = records()
  expect(record).toMatchObject({
    flow: "safe-login",
    expiresAt: initial.expiresAt,
  })

  const cancelled = expect(pending!).rejects.toThrow("cancelled")
  controller.abort()
  await cancelled
  expect(records()).toHaveLength(1)

  const resumed = result.current.signMessage({
    ...request(),
    timeSigned: initial.timeSigned + 5,
  })
  store.dispatch(
    markSafeMessageSignatureReady({ id: record.id, signature: "0xthreshold" }),
  )
  await expect(resumed).resolves.toMatchObject({
    signature: "0xthreshold",
    timeSigned: initial.timeSigned,
    pendingSafeMessageId: record.id,
  })
  expect(proposeSafeMessage).toHaveBeenCalledTimes(1)
})

it("returns an approved on-chain Safe message as the valid 0x proof", async () => {
  jest
    .mocked(proposeSafeMessage)
    .mockResolvedValueOnce({ kind: "onchain", safeTxHash: "0xtx" })
  const { result } = renderHook(useSafeMessageSigning)
  const pending = result.current.signMessage(request())
  await waitFor(() => expect(records()).toHaveLength(1))
  const [record] = records()
  store.dispatch(
    markSafeMessageSignatureReady({ id: record.id, signature: "0x" }),
  )
  await expect(pending).resolves.toMatchObject({
    signature: "0x",
    pendingSafeMessageId: record.id,
  })
})

it("does not resume expired login proofs", async () => {
  const input = request()
  const timeSigned = input.timeSigned - 7200
  store.dispatch(
    addPendingSafeMessage({
      id: "expired",
      flow: "safe-login",
      address,
      chainId,
      timeSigned,
      message: getLoginSignatureMessage(address, timeSigned, chainId),
      kind: "offchain",
      messageHash: "0xexpired",
      status: "signatureReady",
      signature: "0xold",
      createdAt: timeSigned * 1000,
      expiresAt: (timeSigned + 3600) * 1000,
    }),
  )
  const { result } = renderHook(useSafeMessageSigning)
  const pending = result.current.signMessage(input)
  await waitFor(() => expect(proposeSafeMessage).toHaveBeenCalledTimes(1))
  expect(store.getState().pendingSafeMessages.records.expired).toBeUndefined()
  const [record] = records()
  store.dispatch(
    markSafeMessageSignatureReady({ id: record.id, signature: "0xnew" }),
  )
  await expect(pending).resolves.toMatchObject({
    signature: "0xnew",
    timeSigned: input.timeSigned,
  })
})

it("does not propose a cancelled request", async () => {
  const controller = new AbortController()
  controller.abort()
  const { result } = renderHook(useSafeMessageSigning)
  await expect(
    result.current.signMessage(request(controller.signal)),
  ).rejects.toThrow("cancelled")
  expect(proposeSafeMessage).not.toHaveBeenCalled()
  expect(records()).toHaveLength(0)
})

it("ignores a late Safe proposal after cancelling its prompt", async () => {
  const controller = new AbortController()
  jest.mocked(proposeSafeMessage).mockImplementationOnce(async () => {
    controller.abort()
    return { kind: "offchain", messageHash: "0xlate" }
  })
  const { result } = renderHook(useSafeMessageSigning)
  await expect(
    result.current.signMessage(request(controller.signal)),
  ).rejects.toThrow("discarded")
  expect(records()).toHaveLength(0)
})
