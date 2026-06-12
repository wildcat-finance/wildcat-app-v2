import { Dispatch } from "react"

import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { BaseTransaction } from "@safe-global/safe-apps-sdk"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  getPeriodicAprReductionSettlementQuote,
  MarketAccount,
  PeriodicAprSettlementQuote,
  populatePeriodicAprReductionPlan,
  SetAprStatus,
} from "@wildcatfi/wildcat-sdk"

import { QueryKeys } from "@/config/query-keys"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useEthersSigner } from "@/hooks/useEthersSigner"

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
 * For a Safe borrower the steps are batched into one atomic transaction
 * (both market calls see msg.sender == borrower). For an EOA borrower the
 * steps run sequentially; market state is refreshed between the settlement
 * and the APR execution, and the flow aborts cleanly if the market was
 * re-blocked in the meantime (e.g. a new withdrawal queued in an open
 * window) instead of submitting a transaction that would revert.
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
        const gnosisTransactions: BaseTransaction[] = plan.transactions.map(
          (planned) => planned.tx,
        )
        const { safeTxHash } = await sdk.txs.send({ txs: gnosisTransactions })
        await new Promise((resolve) => {
          const checkTransaction = async () => {
            const transactionBySafeHash =
              await sdk.txs.getBySafeTxHash(safeTxHash)
            if (transactionBySafeHash?.txHash) {
              setTxHash(transactionBySafeHash.txHash)
              resolve(transactionBySafeHash)
            } else {
              setTimeout(checkTransaction, 1000)
            }
          }
          checkTransaction()
        })
        return
      }

      /* eslint-disable no-restricted-syntax, no-await-in-loop */
      for (const planned of plan.transactions) {
        if (planned.kind === "executeApr" && plan.transactions.length > 1) {
          // Refresh from the lens and re-check before the borrower-only
          // execution; a withdrawal queued since settlement re-blocks it.
          await marketAccount.market.update()
          const preview = marketAccount.previewSetAPR(proposedAprBips)
          if (preview.status !== SetAprStatus.Ready) {
            throw Error(
              `Settlement succeeded but the APR change is no longer executable: ${preview.status}`,
            )
          }
        }
        const tx = await signer.sendTransaction({
          to: planned.tx.to,
          data: planned.tx.data,
          value: planned.tx.value,
        })
        setTxHash(tx.hash)
        await tx.wait()
      }
      /* eslint-enable no-restricted-syntax, no-await-in-loop */
    },
    onSuccess() {
      client.invalidateQueries({
        queryKey: [PERIODIC_APR_SETTLEMENT_QUOTE_KEY],
      })
      client.invalidateQueries({
        queryKey: QueryKeys.Markets.GET_MARKET_ACCOUNT(
          marketAccount.market.chainId,
          marketAccount.market.address,
        ),
      })
      client.invalidateQueries({
        queryKey: QueryKeys.Borrower.GET_BORROWER_MARKET_ACCOUNT_LEGACY(
          marketAccount.market.chainId,
          marketAccount.account,
          marketAccount.market.address,
        ),
      })
      client.invalidateQueries({
        queryKey: QueryKeys.Borrower.GET_WITHDRAWALS(
          marketAccount.market.chainId,
          "initial",
          marketAccount.market.address,
        ),
      })
      client.invalidateQueries({
        queryKey: QueryKeys.Borrower.GET_WITHDRAWALS(
          marketAccount.market.chainId,
          "update",
          marketAccount.market.address,
        ),
      })
    },
    onError(error) {
      console.log(error)
    },
  })
}
