import { useCallback, useEffect, useMemo, useState } from "react"

import { useQuery } from "@tanstack/react-query"
import { isSupportedChainId } from "@wildcatfi/wildcat-sdk"
import { usePathname } from "next/navigation"
import { useAccount, useSwitchChain } from "wagmi"

import {
  ServiceAgreementGateResponse,
  ServiceAgreementPartyInput,
} from "@/app/api/service-agreement/interface"
import { ROUTES } from "@/routes"
import { useAppDispatch } from "@/store/hooks"
import { setSelectedNetwork } from "@/store/slices/selectedNetworkSlice/selectedNetworkSlice"
import {
  getServiceAgreementPartyForPath,
  isServiceAgreementPath,
} from "@/utils/serviceAgreementParty"
import { SLA_STATUS_QUERY_KEY } from "@/utils/serviceAgreementQueries"
import {
  applyToUDeadlineBoundary,
  computeToUGateState,
} from "@/utils/serviceAgreementState"

import { useSelectedNetwork } from "./useSelectedNetwork"

export type UseNetworkGateOptions = {
  desiredChainId?: number
  pathname?: string
  agreementParty?: ServiceAgreementPartyInput
  includeAgreementStatus?: boolean
}

export { SLA_STATUS_QUERY_KEY } from "@/utils/serviceAgreementQueries"

const MAX_TIMEOUT_MS = 2_147_483_647

type SlaResponse = ServiceAgreementGateResponse

const NO_WALLET_RESTRICTED_PATHS = [
  ROUTES.agreement,
  ROUTES.borrower.agreement,
  ROUTES.lender.agreement,
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
  agreementParty,
  includeAgreementStatus = true,
}: UseNetworkGateOptions = {}) => {
  const dispatch = useAppDispatch()
  const currentPathname = usePathname()
  const { chainId: selectedChainId, isTestnet } = useSelectedNetwork()
  const { address, chain: walletChain, isConnected } = useAccount()
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain()

  const effectiveChainId = desiredChainId ?? selectedChainId
  const walletChainId = walletChain?.id
  const touParty =
    agreementParty ??
    getServiceAgreementPartyForPath(pathname ?? currentPathname)

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

  const agreementQueryEnabled =
    includeAgreementStatus &&
    !!address &&
    typeof selectedChainId === "number" &&
    isSupportedChainId(selectedChainId)

  const slaQuery = useQuery({
    queryKey: [SLA_STATUS_QUERY_KEY, address, selectedChainId, touParty],
    enabled: agreementQueryEnabled,
    queryFn: async () => {
      const res = await fetch(
        `/api/sla/${address}?chainId=${selectedChainId}&party=${touParty}`,
        { cache: "no-store" },
      )
      if (!res.ok) throw new Error("Failed to fetch SLA status")
      const result = (await res.json()) as SlaResponse
      if (result.party !== touParty) {
        throw new Error("SLA status returned for the wrong account capacity")
      }
      return result
    },
  })

  const isAgreementSigned = slaQuery.data?.isSigned ?? false
  const serverTouState = slaQuery.data?.state
  const touDeadline = slaQuery.data?.currentVersion?.reacceptanceDeadline
    ? new Date(slaQuery.data.currentVersion.reacceptanceDeadline)
    : null
  const touDeadlineMs = touDeadline?.getTime() ?? null
  const [deadlineTick, setDeadlineTick] = useState(0)

  useEffect(() => {
    if (serverTouState !== "staleWithinGrace" || touDeadlineMs === null) {
      return undefined
    }
    const remaining = touDeadlineMs - Date.now()
    if (remaining <= 0) return undefined
    const timeout = window.setTimeout(
      () => setDeadlineTick((value) => value + 1),
      Math.min(remaining, MAX_TIMEOUT_MS),
    )
    return () => window.clearTimeout(timeout)
  }, [deadlineTick, serverTouState, touDeadlineMs])

  const touState = applyToUDeadlineBoundary(
    serverTouState,
    touDeadline,
    new Date(),
  )
  const touCurrentVersion = slaQuery.data?.currentVersion
  const touAcceptedVersion = slaQuery.data?.acceptedVersion ?? null
  const touGateState = computeToUGateState({
    queryEnabled: agreementQueryEnabled,
    querySucceeded: slaQuery.isSuccess,
    state: touState,
  })
  const touBlocked = touGateState === "blocked"

  const redirectPath = useMemo(() => {
    if (!pathname) return null

    const isAgreementPath = isServiceAgreementPath(pathname)
    const lenderMarketPath = isLenderMarketPath(pathname)
    const borrowerMarketPath = pathname.startsWith(ROUTES.borrower.market)

    if (!address && isNotPublicPath(pathname)) {
      return "/"
    }

    if (isWrongNetwork && isNotPublicPath(pathname) && !borrowerMarketPath) {
      return "/"
    }

    if (
      !isAgreementPath &&
      isLenderPath(pathname) &&
      !lenderMarketPath &&
      address &&
      slaQuery.isSuccess &&
      !isAgreementSigned
    ) {
      if (isWrongNetwork) {
        return "/"
      }
      return ROUTES.lender.agreement
    }

    return null
  }, [address, isAgreementSigned, isWrongNetwork, pathname, slaQuery.isSuccess])

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
    touParty,
    touState,
    touDeadline,
    touCurrentVersion,
    touAcceptedVersion,
    touGateState,
    touBlocked,
    isAgreementLoading: slaQuery.isLoading,
    isAgreementFetching: slaQuery.isFetching,
    isAgreementUnknown: touGateState === "unknown",
    agreementError: slaQuery.error,
    refetchAgreementStatus: slaQuery.refetch,
    redirectPath,
    isRedirectLoading:
      !redirectPath && agreementQueryEnabled && slaQuery.isPending,
    requestSwitchNetwork,
    isSwitching,
  }
}
