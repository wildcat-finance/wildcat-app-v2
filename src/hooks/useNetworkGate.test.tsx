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
  isSupportedChainId: (chainId: number) => [1, 11155111].includes(chainId),
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

describe("useNetworkGate requestSwitchNetwork", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useSelectedNetworkMock.mockReturnValue({
      chainId: SEPOLIA_CHAIN_ID,
      isTestnet: true,
    })
    useAccountMock.mockReturnValue({
      address: "0xca732651410e915090d7a7d889a1e44ef4575fce",
      chain: { id: MAINNET_CHAIN_ID },
      isConnected: true,
    })
    switchChainAsyncMock.mockResolvedValue(undefined)
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
      address: "0xca732651410e915090d7a7d889a1e44ef4575fce",
      chain: { id: SEPOLIA_CHAIN_ID },
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
