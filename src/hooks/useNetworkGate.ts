import { useCallback, useMemo } from "react"

import { useQuery } from "@tanstack/react-query"
import { isSupportedChainId } from "@wildcatfi/wildcat-sdk"
import { useAccount, useSwitchChain } from "wagmi"

import { ROUTES } from "@/routes"
import { useAppDispatch } from "@/store/hooks"
import { setSelectedNetwork } from "@/store/slices/selectedNetworkSlice/selectedNetworkSlice"

import { useSelectedNetwork } from "./useSelectedNetwork"

export type UseNetworkGateOptions = {
  desiredChainId?: number
  pathname?: string
  includeAgreementStatus?: boolean
}

export const SLA_STATUS_QUERY_KEY = "sla-status"

type SlaResponse = {
  isSigned: boolean
}

const NO_WALLET_RESTRICTED_PATHS = [
  ROUTES.agreement,
  ROUTES.borrower.createMarket,
  ROUTES.borrower.market,
  ROUTES.borrower.lendersList,
]

const isNotPublicPath = (pathname: string) => {
  if (pathname.startsWith(ROUTES.borrower.market)) {
    return true
  }
  return NO_WALLET_RESTRICTED_PATHS.includes(pathname)
}

const isLenderMarketPath = (pathname: string) =>
  pathname.startsWith(`${ROUTES.lender.market}/`)

const isLenderPath = (pathname: string) =>
  pathname === ROUTES.lender.root ||
  pathname.startsWith(`${ROUTES.lender.root}/`)

export const useNetworkGate = ({
  desiredChainId,
  pathname,
  includeAgreementStatus = true,
}: UseNetworkGateOptions = {}) => {
  const dispatch = useAppDispatch()
  const { chainId: selectedChainId, isTestnet } = useSelectedNetwork()
  const { address, chain: walletChain, isConnected } = useAccount()
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain()

  const effectiveChainId = desiredChainId ?? selectedChainId
  const walletChainId = walletChain?.id

  const isSelectionMismatch =
    typeof effectiveChainId === "number" &&
    typeof selectedChainId === "number" &&
    effectiveChainId !== selectedChainId

  const isWalletMismatch =
    isConnected &&
    typeof effectiveChainId === "number" &&
    typeof walletChainId === "number" &&
    walletChainId !== effectiveChainId

  const isWrongNetwork = Boolean(isWalletMismatch)

  const slaQuery = useQuery({
    queryKey: [SLA_STATUS_QUERY_KEY, address, selectedChainId],
    enabled:
      includeAgreementStatus &&
      !!address &&
      typeof selectedChainId === "number" &&
      isSupportedChainId(selectedChainId),
    queryFn: async () => {
      const res = await fetch(`/api/sla/${address}?chainId=${selectedChainId}`)
      if (!res.ok) throw new Error("Failed to fetch SLA status")
      return (await res.json()) as SlaResponse
    },
  })

  const isAgreementSigned = slaQuery.data?.isSigned ?? false

  const redirectPath = useMemo(() => {
    if (!pathname) return null

    const isAgreementPath = pathname === ROUTES.agreement
    const lenderMarketPath = isLenderMarketPath(pathname)
    const borrowerMarketPath = pathname.startsWith(ROUTES.borrower.market)

    if (!address && isNotPublicPath(pathname)) {
      return "/"
    }

    if (isWrongNetwork && isNotPublicPath(pathname) && !borrowerMarketPath) {
      return "/"
    }

    if (isAgreementPath && isAgreementSigned) {
      return "/"
    }

    if (
      !isAgreementPath &&
      isLenderPath(pathname) &&
      !lenderMarketPath &&
      address &&
      !isAgreementSigned
    ) {
      if (isWrongNetwork) {
        return "/"
      }
      return ROUTES.agreement
    }

    return null
  }, [address, isAgreementSigned, isWrongNetwork, pathname])

  const requestSwitchNetwork = useCallback(async () => {
    if (typeof desiredChainId !== "number") return
    if (desiredChainId === selectedChainId) return

    if (!address) {
      dispatch(setSelectedNetwork(desiredChainId))
      return
    }

    if (!switchChainAsync) return

    try {
      await switchChainAsync({ chainId: desiredChainId })
      dispatch(setSelectedNetwork(desiredChainId))
    } catch {
      // User rejected or switch failed — do not update selected network
    }
  }, [address, desiredChainId, dispatch, selectedChainId, switchChainAsync])

  const canInteract =
    isConnected &&
    !isWrongNetwork &&
    (!includeAgreementStatus || isAgreementSigned)

  return {
    selectedChainId,
    effectiveChainId,
    desiredChainId,
    walletChainId,
    walletChain,
    isConnected,
    isTestnet,
    isWrongNetwork,
    isSelectionMismatch,
    canInteract,
    isAgreementSigned,
    isAgreementLoading: slaQuery.isLoading,
    agreementError: slaQuery.error,
    redirectPath,
    isRedirectLoading: includeAgreementStatus && slaQuery.isLoading,
    requestSwitchNetwork,
    isSwitching,
  }
}
