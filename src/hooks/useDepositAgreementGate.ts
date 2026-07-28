import { useGetNonMlaAcknowledgement } from "@/app/[locale]/lender/hooks/useNonMlaAcknowledgement"
import { useGetSignedMla } from "@/app/[locale]/lender/hooks/useSignMla"
import { useMarketMla } from "@/hooks/useMarketMla"
import { getDepositAgreementGateState } from "@/utils/depositAgreementGate"

export type { DepositAgreementGateState } from "@/utils/depositAgreementGate"

export const useDepositAgreementGate = ({
  marketAddress,
  chainId,
  generation,
}: {
  marketAddress: string
  chainId: number
  generation?: string
}) => {
  const mlaQuery = useMarketMla(marketAddress, chainId)
  const mla = mlaQuery.data
  const requiresNonMlaAcknowledgement = !!mla && "noMLA" in mla
  const mlaResponse = mla && !("noMLA" in mla) ? mla : null
  const signedMlaQuery = useGetSignedMla(mlaResponse)
  const acknowledgementQuery = useGetNonMlaAcknowledgement({
    marketAddress,
    chainId,
    enabled: requiresNonMlaAcknowledgement,
  })

  const state = getDepositAgreementGateState({
    generation,
    mla,
    mlaLoading: mlaQuery.isLoading,
    mlaError: mlaQuery.isError,
    signedMla: signedMlaQuery.data,
    signedMlaLoading: signedMlaQuery.isLoading,
    signedMlaError: signedMlaQuery.isError,
    acknowledgement: acknowledgementQuery.data,
    acknowledgementLoading: acknowledgementQuery.isLoading,
    acknowledgementError: acknowledgementQuery.isError,
  })

  const retry = () =>
    Promise.all([
      mlaQuery.refetch(),
      ...(mlaResponse ? [signedMlaQuery.refetch()] : []),
      ...(requiresNonMlaAcknowledgement
        ? [acknowledgementQuery.refetch()]
        : []),
    ])

  return {
    state,
    hasError: state === "error",
    isLoading: state === "loading",
    mla,
    signedMla: signedMlaQuery.data,
    nonMlaAcknowledgement: acknowledgementQuery.data,
    retry,
  }
}
