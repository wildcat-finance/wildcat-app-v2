/* eslint-disable import/no-extraneous-dependencies */
import { PropsWithChildren } from "react"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook } from "@testing-library/react"

import { useNetworkGate } from "./useNetworkGate"

const dispatchMock = jest.fn()
const switchChainAsyncMock = jest.fn()
const useAccountMock = jest.fn()
const useSelectedNetworkMock = jest.fn()

jest.mock("@wildcatfi/wildcat-sdk", () => ({
  isSupportedChainId: (chainId: number) =>
    [1, 11155111, 9745, 9746].includes(chainId),
}))

jest.mock("next/navigation", () => ({
  usePathname: () => "/lender/market/0xmarket",
}))

jest.mock("wagmi", () => ({
  useAccount: () => useAccountMock(),
  useSwitchChain: () => ({
    switchChainAsync: switchChainAsyncMock,
    isPending: false,
  }),
}))

jest.mock("@/hooks/useSelectedNetwork", () => ({
  useSelectedNetwork: () => useSelectedNetworkMock(),
}))

jest.mock("@/store/hooks", () => ({
  useAppDispatch: () => dispatchMock,
}))

jest.mock("@/store/slices/selectedNetworkSlice/selectedNetworkSlice", () => ({
  setSelectedNetwork: (chainId: number) => ({
    type: "selectedChain/setSelectedNetwork",
    payload: chainId,
  }),
}))

const MAINNET_CHAIN_ID = 1
const SEPOLIA_CHAIN_ID = 11155111
const ACCOUNT_ADDRESS = "0xca732651410e915090d7a7d889a1e44ef4575fce"

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe("useNetworkGate", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useSelectedNetworkMock.mockReturnValue({
      chainId: SEPOLIA_CHAIN_ID,
      isTestnet: true,
    })
    useAccountMock.mockReturnValue({
      address: ACCOUNT_ADDRESS,
      chain: { id: MAINNET_CHAIN_ID },
      chainId: MAINNET_CHAIN_ID,
      isConnected: true,
    })
    switchChainAsyncMock.mockResolvedValue(undefined)
  })

  it.each([MAINNET_CHAIN_ID, SEPOLIA_CHAIN_ID, 9745, 9746])(
    "allows interaction when the wallet matches configured chain %i",
    (chainId) => {
      useSelectedNetworkMock.mockReturnValue({ chainId })
      useAccountMock.mockReturnValue({
        address: ACCOUNT_ADDRESS,
        chain: { id: chainId },
        chainId,
        isConnected: true,
      })

      const { result } = renderHook(
        () => useNetworkGate({ includeAgreementStatus: false }),
        { wrapper: createWrapper() },
      )

      expect(result.current.walletChainId).toBe(chainId)
      expect(result.current.isWrongNetwork).toBe(false)
      expect(result.current.canInteract).toBe(true)
    },
  )

  it.each([
    [MAINNET_CHAIN_ID, 42161],
    [SEPOLIA_CHAIN_ID, 137],
    [9745, 8453],
    [9746, 42161],
  ])(
    "blocks interaction on selected chain %i when wallet chain %i is unconfigured",
    (selectedChainId, walletChainId) => {
      useSelectedNetworkMock.mockReturnValue({ chainId: selectedChainId })
      useAccountMock.mockReturnValue({
        address: ACCOUNT_ADDRESS,
        chain: undefined,
        chainId: walletChainId,
        isConnected: true,
      })

      const { result } = renderHook(
        () => useNetworkGate({ includeAgreementStatus: false }),
        { wrapper: createWrapper() },
      )

      expect(result.current.isWrongNetwork).toBe(true)
      expect(result.current.canInteract).toBe(false)
      expect(result.current.walletChainId).toBe(walletChainId)
    },
  )

  it("keeps disconnected explore browsing free of network errors and redirects", () => {
    useAccountMock.mockReturnValue({
      address: undefined,
      chain: undefined,
      chainId: undefined,
      isConnected: false,
    })

    const { result } = renderHook(
      () =>
        useNetworkGate({
          pathname: "/lender",
          includeAgreementStatus: false,
        }),
      { wrapper: createWrapper() },
    )

    expect(result.current.isWrongNetwork).toBe(false)
    expect(result.current.redirectPath).toBeNull()
    expect(result.current.canInteract).toBe(false)
  })

  it("recovers from an unconfigured wallet chain by switching to the selected chain", async () => {
    useAccountMock.mockReturnValue({
      address: ACCOUNT_ADDRESS,
      chain: undefined,
      chainId: 8453,
      isConnected: true,
    })

    const { result, rerender } = renderHook(
      () =>
        useNetworkGate({
          desiredChainId: SEPOLIA_CHAIN_ID,
          includeAgreementStatus: false,
        }),
      { wrapper: createWrapper() },
    )

    expect(result.current.isWrongNetwork).toBe(true)

    await act(async () => {
      await result.current.requestSwitchNetwork()
    })

    expect(switchChainAsyncMock).toHaveBeenCalledWith({
      chainId: SEPOLIA_CHAIN_ID,
    })
    expect(dispatchMock).not.toHaveBeenCalled()

    useAccountMock.mockReturnValue({
      address: ACCOUNT_ADDRESS,
      chain: { id: SEPOLIA_CHAIN_ID },
      chainId: SEPOLIA_CHAIN_ID,
      isConnected: true,
    })
    rerender()

    expect(result.current.isWrongNetwork).toBe(false)
    expect(result.current.canInteract).toBe(true)
  })

  it("switches the wallet when the app already has the desired market network selected", async () => {
    const { result } = renderHook(
      () =>
        useNetworkGate({
          desiredChainId: SEPOLIA_CHAIN_ID,
          includeAgreementStatus: false,
        }),
      { wrapper: createWrapper() },
    )

    expect(result.current.isSelectionMismatch).toBe(false)
    expect(result.current.isWrongNetwork).toBe(true)

    await act(async () => {
      await result.current.requestSwitchNetwork()
    })

    expect(switchChainAsyncMock).toHaveBeenCalledWith({
      chainId: SEPOLIA_CHAIN_ID,
    })
    expect(dispatchMock).not.toHaveBeenCalled()
  })

  it("updates the app selection without requesting a redundant wallet switch", async () => {
    useSelectedNetworkMock.mockReturnValue({
      chainId: MAINNET_CHAIN_ID,
      isTestnet: false,
    })
    useAccountMock.mockReturnValue({
      address: ACCOUNT_ADDRESS,
      chain: { id: SEPOLIA_CHAIN_ID },
      chainId: SEPOLIA_CHAIN_ID,
      isConnected: true,
    })

    const { result } = renderHook(
      () =>
        useNetworkGate({
          desiredChainId: SEPOLIA_CHAIN_ID,
          includeAgreementStatus: false,
        }),
      { wrapper: createWrapper() },
    )

    await act(async () => {
      await result.current.requestSwitchNetwork()
    })

    expect(switchChainAsyncMock).not.toHaveBeenCalled()
    expect(dispatchMock).toHaveBeenCalledWith({
      type: "selectedChain/setSelectedNetwork",
      payload: SEPOLIA_CHAIN_ID,
    })
  })
})
