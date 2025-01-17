import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { MarketController, PartialTransaction } from "@wildcatfi/wildcat-sdk"
import {
  FixedTermHooks,
  HooksInstance,
  OpenTermHooks,
} from "@wildcatfi/wildcat-sdk/dist/access"

import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useEthersSigner } from "@/hooks/useEthersSigner"
import { useAppDispatch } from "@/store/hooks"
import { resetPolicyLendersState } from "@/store/slices/policyLendersSlice/policyLendersSlice"

import { GET_POLICY_KEY } from "../../hooks/useGetPolicy"

export type SubmitPolicyUpdatesInputs = {
  addLenders?: string[]
  removeLenders?: string[]
  setName?: string
  marketsToUpdate?: string[]
}

export function useSubmitUpdates(policy?: HooksInstance | MarketController) {
  const signer = useEthersSigner()
  const client = useQueryClient()
  const { isTestnet } = useCurrentNetwork()
  const { connected: isConnectedToSafe, sdk: gnosisSafeSDK } = useSafeAppsSDK()
  const dispatch = useAppDispatch()

  const {
    mutate: submitUpdates,
    isPending: isSubmitting,
    isSuccess,
    isError,
  } = useMutation({
    mutationFn: async ({
      addLenders,
      removeLenders,
      setName,
      marketsToUpdate,
    }: SubmitPolicyUpdatesInputs) => {
      if (!signer || !policy) return

      const txs: PartialTransaction[] = []

      if (addLenders?.length) {
        const tx =
          // eslint-disable-next-line no-nested-ternary
          policy instanceof OpenTermHooks || policy instanceof FixedTermHooks
            ? policy.populateAddLenders(
                addLenders.map((lender) => ({ lender })),
              )
            : marketsToUpdate?.length
              ? policy.populateAuthorizeLendersAndUpdateMarkets(
                  addLenders,
                  marketsToUpdate,
                )
              : policy.populateAuthorizeLenders(addLenders)

        txs.push(tx)
      }

      if (removeLenders?.length) {
        const tx =
          // eslint-disable-next-line no-nested-ternary
          policy instanceof OpenTermHooks || policy instanceof FixedTermHooks
            ? policy.populateBlockLenders(removeLenders)
            : marketsToUpdate?.length
              ? policy.populateDeauthorizeLendersAndUpdateMarkets(
                  removeLenders,
                  marketsToUpdate,
                )
              : policy.populateDeauthorizeLenders(removeLenders)

        txs.push(tx)
      }

      if (isConnectedToSafe && isTestnet && txs.length > 1) {
        await gnosisSafeSDK.txs.send({ txs })
      } else {
        // eslint-disable-next-line no-restricted-syntax
        for (const tx of txs) {
          // eslint-disable-next-line no-await-in-loop
          await signer
            .sendTransaction({
              to: tx.to,
              data: tx.data,
              value: tx.value,
            })
            .then(({ wait }) => wait())
        }
      }
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: [GET_POLICY_KEY] })
      dispatch(resetPolicyLendersState())
    },
    onError: (error) => console.log(error),
  })

  return { submitUpdates, isSubmitting, isSuccess, isError }
}
