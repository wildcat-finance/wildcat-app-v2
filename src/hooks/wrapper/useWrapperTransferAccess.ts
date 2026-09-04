import { useQuery } from "@tanstack/react-query"
import { readMarketTransferRecipientAllowed } from "@wildcatfi/wildcat-sdk"
import type { Market, TokenWrapper } from "@wildcatfi/wildcat-sdk"

import { POLLING_INTERVAL } from "@/config/polling"
import { QueryKeys } from "@/config/query-keys"
import { useEthersProvider } from "@/hooks/useEthersSigner"

export type WrapperTransferAccessStatus =
  | "not-applicable"
  | "checking"
  | "allowed"
  | "denied"
  | "error"

export const canWrapWithTransferAccess = (
  status: WrapperTransferAccessStatus,
) => status === "not-applicable" || status === "allowed"

export const useWrapperTransferAccess = (
  market: Market | undefined,
  wrapper: TokenWrapper,
) => {
  const { provider } = useEthersProvider({ chainId: market?.chainId })
  const isApplicable = market?.eventGeneration === "v2.5"
  const hooksAddress = market?.hooksConfig?.hooksAddress

  const query = useQuery({
    queryKey: QueryKeys.Wrapper.GET_TRANSFER_ACCESS(
      market?.chainId ?? 0,
      hooksAddress,
      market?.address,
      wrapper.address,
    ),
    enabled: isApplicable && !!hooksAddress && !!provider,
    queryFn: async () => {
      if (!market || !hooksAddress || !provider) {
        throw new Error("Missing wrapper transfer-access params")
      }

      return readMarketTransferRecipientAllowed(
        provider,
        hooksAddress,
        market.address,
        wrapper.address,
      )
    },
    refetchInterval: POLLING_INTERVAL,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
  })

  let accessStatus: WrapperTransferAccessStatus
  if (!isApplicable) {
    accessStatus = "not-applicable"
  } else if (!hooksAddress || query.isError) {
    accessStatus = "error"
  } else if (query.data === true) {
    accessStatus = "allowed"
  } else if (query.data === false) {
    accessStatus = "denied"
  } else {
    accessStatus = "checking"
  }

  return {
    ...query,
    accessStatus,
    canRetry: !!hooksAddress && !!provider,
    canWrap: canWrapWithTransferAccess(accessStatus),
  }
}
