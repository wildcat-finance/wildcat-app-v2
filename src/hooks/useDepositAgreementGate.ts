import { useGetNonMlaAcknowledgement } from "@/app/[locale]/lender/hooks/useNonMlaAcknowledgement"
import { useGetSignedMla } from "@/app/[locale]/lender/hooks/useSignMla"
import { useMarketMla } from "@/hooks/useMarketMla"

export type DepositAgreementGateState =
  | "loading"
  | "error"
  | "requires-mla-signature"
  | "requires-non-mla-acknowledgement"
  | "satisfied"

export const useDepositAgreementGate = (
  marketAddress: string,
  chainId: number,
) => {
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

  const hasError =
    mlaQuery.isError ||
    (!!mlaResponse && signedMlaQuery.isError) ||
    (requiresNonMlaAcknowledgement && acknowledgementQuery.isError)
  const isLoading =
    mlaQuery.isLoading ||
    mla === undefined ||
    (!!mlaResponse &&
      (signedMlaQuery.isLoading || signedMlaQuery.data === undefined)) ||
    (requiresNonMlaAcknowledgement &&
      (acknowledgementQuery.isLoading ||
        acknowledgementQuery.data === undefined))

  // A null MLA is the API's current 404 result for both legacy markets without
  // an explicit refusal and newly unconfigured markets. Preserve the legacy
  // behavior until those states can be distinguished and backfilled; this
  // knowingly allows an unconfigured market to pass the deposit gate.
  let state: DepositAgreementGateState = "satisfied"
  if (hasError) state = "error"
  else if (isLoading) state = "loading"
  else if (mlaResponse && signedMlaQuery.data === null)
    state = "requires-mla-signature"
  else if (requiresNonMlaAcknowledgement && acknowledgementQuery.data === null)
    state = "requires-non-mla-acknowledgement"

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
    hasError,
    isLoading,
    mla,
    signedMla: signedMlaQuery.data,
    nonMlaAcknowledgement: acknowledgementQuery.data,
    retry,
  }
}
