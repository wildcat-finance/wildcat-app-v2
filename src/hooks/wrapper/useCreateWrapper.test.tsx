/* eslint-disable import/no-extraneous-dependencies */
import { PropsWithChildren } from "react"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook } from "@testing-library/react"
import type { Market } from "@wildcatfi/wildcat-sdk"

import { QueryKeys } from "@/config/query-keys"
import { WRAPPER_TRANSFERS_DISABLED_ERROR } from "@/utils/createMarketDeploy"

import { useCreateWrapper } from "./useCreateWrapper"

const createWrapperMock = jest.fn()
const populateCreateWrapperMock = jest.fn()
const toSafeTransactionInputMock = jest.fn()
const useCurrentNetworkMock = jest.fn()
const useEthersProviderMock = jest.fn()
const useSafeAppsSDKMock = jest.fn()
const waitForSafeTransactionExecutionMock = jest.fn()

jest.mock("@safe-global/safe-apps-react-sdk", () => ({
  useSafeAppsSDK: () => useSafeAppsSDKMock(),
}))

jest.mock("@wildcatfi/wildcat-sdk", () => ({
  Signer: {
    isSigner: (value: { isSigner?: boolean }) => value?.isSigner === true,
  },
  WrapperFactory: {
    createWrapper: (...args: unknown[]) => createWrapperMock(...args),
    populateCreateWrapper: (...args: unknown[]) =>
      populateCreateWrapperMock(...args),
  },
  toSafeTransactionInput: (...args: unknown[]) =>
    toSafeTransactionInputMock(...args),
}))

jest.mock("@/hooks/useCurrentNetwork", () => ({
  useCurrentNetwork: () => useCurrentNetworkMock(),
}))

jest.mock("@/hooks/useEthersSigner", () => ({
  useEthersProvider: (...args: unknown[]) => useEthersProviderMock(...args),
}))

jest.mock("@/utils/transactions", () => ({
  waitForSafeTransactionExecution: (...args: unknown[]) =>
    waitForSafeTransactionExecutionMock(...args),
}))

const CHAIN_ID = 11155111
const MARKET_ADDRESS = "0x2222222222222222222222222222222222222222"
const signer = { isSigner: true }
const market = {
  address: MARKET_ADDRESS,
  chainId: CHAIN_ID,
  isClosed: true,
  hooksConfig: { transfersDisabled: false },
} as unknown as Market

const createQueryWrapper = () => {
  const client = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  })
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { client, wrapper }
}

describe("useCreateWrapper", () => {
  const sendSafeTransactions = jest.fn()
  const getTransactionReceipt = jest.fn()
  const safeSdk = {
    txs: {
      send: sendSafeTransactions,
    },
    eth: {
      getTransactionReceipt,
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    useCurrentNetworkMock.mockReturnValue({ targetChainId: CHAIN_ID })
    useEthersProviderMock.mockReturnValue({ signer })
    useSafeAppsSDKMock.mockReturnValue({ connected: false, sdk: safeSdk })
    createWrapperMock.mockResolvedValue({ result: { address: "0xwrapper" } })
  })

  it("allows deployment for a terminated market", () => {
    const { wrapper } = createQueryWrapper()
    const { result } = renderHook(
      () =>
        useCreateWrapper({
          market,
          hasFactory: true,
          isDifferentChain: false,
        }),
      { wrapper },
    )

    expect(result.current.canCreateWrapper).toBe(true)
  })

  it("blocks deployment when market transfers are disabled", async () => {
    const transferDisabledMarket = {
      ...market,
      hooksConfig: { transfersDisabled: true },
    } as Market
    const { wrapper } = createQueryWrapper()
    const { result } = renderHook(
      () =>
        useCreateWrapper({
          market: transferDisabledMarket,
          hasFactory: true,
          isDifferentChain: false,
        }),
      { wrapper },
    )

    expect(result.current.canCreateWrapper).toBe(false)
    expect(result.current.transfersDisabled).toBe(true)
    await act(async () => {
      await expect(result.current.createWrapper()).rejects.toThrow(
        WRAPPER_TRANSFERS_DISABLED_ERROR,
      )
    })
    expect(createWrapperMock).not.toHaveBeenCalled()
  })

  it("creates an EOA transaction and refreshes wrapper discovery", async () => {
    const { client, wrapper } = createQueryWrapper()
    const invalidateQueries = jest.spyOn(client, "invalidateQueries")
    const { result } = renderHook(
      () =>
        useCreateWrapper({
          market,
          hasFactory: true,
          isDifferentChain: false,
        }),
      { wrapper },
    )

    await act(async () => {
      await result.current.createWrapper()
    })

    expect(createWrapperMock).toHaveBeenCalledWith(
      CHAIN_ID,
      signer,
      MARKET_ADDRESS,
    )
    expect(populateCreateWrapperMock).not.toHaveBeenCalled()
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: QueryKeys.Wrapper.GET_WRAPPER_FOR_MARKET(
        CHAIN_ID,
        MARKET_ADDRESS,
      ),
    })
  })

  it("submits and waits for Safe deployment transactions", async () => {
    const populatedTransaction = { to: "0xfactory", data: "0x1234" }
    const safeTransaction = { to: "0xfactory", data: "0x1234", value: "0" }
    const safeTxHash = "0xsafe"
    const transactionHash = "0xtransaction"
    useSafeAppsSDKMock.mockReturnValue({ connected: true, sdk: safeSdk })
    populateCreateWrapperMock.mockReturnValue(populatedTransaction)
    toSafeTransactionInputMock.mockReturnValue(safeTransaction)
    sendSafeTransactions.mockResolvedValue({ safeTxHash })
    waitForSafeTransactionExecutionMock.mockResolvedValue(transactionHash)
    getTransactionReceipt.mockResolvedValue({ transactionHash })
    const { wrapper } = createQueryWrapper()
    const { result } = renderHook(
      () =>
        useCreateWrapper({
          market,
          hasFactory: true,
          isDifferentChain: false,
        }),
      { wrapper },
    )

    await act(async () => {
      await result.current.createWrapper()
    })

    expect(populateCreateWrapperMock).toHaveBeenCalledWith(
      CHAIN_ID,
      signer,
      MARKET_ADDRESS,
    )
    expect(toSafeTransactionInputMock).toHaveBeenCalledWith(
      populatedTransaction,
    )
    expect(sendSafeTransactions).toHaveBeenCalledWith({
      txs: [safeTransaction],
    })
    expect(waitForSafeTransactionExecutionMock).toHaveBeenCalledWith(
      safeSdk,
      safeTxHash,
    )
    expect(getTransactionReceipt).toHaveBeenCalledWith([transactionHash])
    expect(createWrapperMock).not.toHaveBeenCalled()
  })

  it("requires the market network", () => {
    const { wrapper } = createQueryWrapper()
    const { result } = renderHook(
      () =>
        useCreateWrapper({
          market,
          hasFactory: true,
          isDifferentChain: true,
        }),
      { wrapper },
    )

    expect(result.current.canCreateWrapper).toBe(false)
  })
})
