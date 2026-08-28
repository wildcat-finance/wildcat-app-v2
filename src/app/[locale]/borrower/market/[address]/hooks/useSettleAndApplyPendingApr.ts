import { Dispatch } from "react"

import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  getPeriodicAprReductionSettlementQuote,
  MarketAccount,
  PeriodicAprSettlementQuote,
  PeriodicAprSettlementStatus,
  populatePeriodicAprReductionPlan,
} from "@wildcatfi/wildcat-sdk"

import { QueryKeys } from "@/config/query-keys"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useEthersSigner } from "@/hooks/useEthersSigner"
import { invalidateMarketStateQueries } from "@/utils/marketStateQueries"
import {
  toSdkTransactionRequest,
  toSafeTransactions,
  waitForSubmittedTransaction,
} from "@/utils/transactions"

export const PERIODIC_APR_SETTLEMENT_QUOTE_KEY = "periodicAprSettlementQuote"

/**
 * Live settlement quote for a pending periodic APR reduction. Reads lens +
 * hook state directly (not the subgraph), so it reflects what the settlement
 * and execution transactions will actually see on-chain.
 */
export const usePeriodicAprSettlementQuote = (
  marketAccount: MarketAccount,
  proposedAprBips: number | undefined,
  enabled: boolean,
) =>
  useQuery({
    enabled: enabled && proposedAprBips !== undefined,
    queryKey: [
      PERIODIC_APR_SETTLEMENT_QUOTE_KEY,
      marketAccount.market.chainId,
      marketAccount.market.address,
      proposedAprBips,
    ],
    queryFn: () =>
      getPeriodicAprReductionSettlementQuote(
        marketAccount,
        proposedAprBips as number,
      ),
    refetchInterval: 60_000,
  })

/**
 * Runs the SDK settlement plan for a pending periodic APR reduction:
 * [approve?, settle?, executeApr].
 *
 * Safe users submit the plan as one batch when the SDK marks it batchable. EOA
 * users submit sequentially. If settlement precedes APR execution, the hook
 * refetches the live quote before executing so a newly-blocked proposal does
 * not blindly submit a reverting transaction.
 */
export const useSettleAndApplyPendingApr = (
  marketAccount: MarketAccount,
  setTxHash: Dispatch<React.SetStateAction<string | undefined>>,
) => {
  const signer = useEthersSigner()
  const client = useQueryClient()
  const { connected: safeConnected, sdk } = useSafeAppsSDK()
  const { targetChainId } = useCurrentNetwork()

  return useMutation({
    mutationFn: async ({
      proposedAprBips,
      quote,
    }: {
      proposedAprBips: number
      quote: PeriodicAprSettlementQuote
    }) => {
      if (!marketAccount || !signer) {
        return
      }
      if (marketAccount.market.chainId !== targetChainId) {
        throw Error(
          `Market chainId does not match target chainId:` +
            ` Market ${marketAccount.market.chainId},` +
            ` Target ${targetChainId}`,
        )
      }

      const plan = await populatePeriodicAprReductionPlan(
        marketAccount,
        proposedAprBips,
        quote,
      )
      if (plan.transactions.length === 0) {
        throw Error(
          `Pending APR reduction is not executable: ${plan.quote.status}`,
        )
      }

      if (safeConnected) {
        if (!plan.safeBatchable) {
          throw Error("Pending APR reduction plan is not Safe-batchable")
        }
        const { safeTxHash } = await sdk.txs.send({
          txs: toSafeTransactions(
            plan.transactions.map((planned) => planned.tx),
          ),
        })
        const { hash: transactionHash } = await waitForSubmittedTransaction({
          provider: signer.provider,
          hash: safeTxHash,
          safeConnected: true,
          safeSdk: sdk,
        })
        setTxHash(transactionHash)
        return
      }

      /* eslint-disable no-await-in-loop */
      for (let index = 0; index < plan.transactions.length; index += 1) {
        const planned = plan.transactions[index]
        if (planned.kind === "executeApr" && index > 0) {
          const refreshedQuote = await getPeriodicAprReductionSettlementQuote(
            marketAccount,
            proposedAprBips,
          )
          if (
            refreshedQuote.status !== PeriodicAprSettlementStatus.Ready ||
            refreshedQuote.proposedAprBips !== proposedAprBips
          ) {
            throw Error(
              `Settlement succeeded but the APR change is no longer executable: ${refreshedQuote.status}`,
            )
          }
        }
        const submitted = await signer.sendTransaction(
          toSdkTransactionRequest(planned.tx),
        )
        setTxHash(submitted.hash)
        if (!submitted.wait) {
          throw Error("Submitted transaction does not expose a wait function")
        }
        await submitted.wait()
      }
      /* eslint-enable no-await-in-loop */
    },
    onSuccess() {
      client.invalidateQueries({
        queryKey: [PERIODIC_APR_SETTLEMENT_QUOTE_KEY],
      })
      invalidateMarketStateQueries({
        client,
        chainId: marketAccount.market.chainId,
        marketAddress: marketAccount.market.address,
        accountAddress: marketAccount.account,
      })
      client.invalidateQueries({
        queryKey: QueryKeys.Borrower.GET_WITHDRAWALS.PREFIX(
          marketAccount.market.chainId,
          marketAccount.market.address,
        ),
      })
    },
    onError(error) {
      console.log(error)
    },
  })
}
