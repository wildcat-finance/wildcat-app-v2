import { Dispatch } from "react"

import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { Web3TransactionReceiptObject } from "@safe-global/safe-apps-sdk"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  deployToken,
  getNextTokenAddress,
  Market,
  MarketCollateralV1,
  PartialTransaction,
  populateDeployToken,
  Token,
} from "@wildcatfi/wildcat-sdk"

import { toastRequest } from "@/components/Toasts"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useEthersSigner } from "@/hooks/useEthersSigner"
import { GET_COLLATERAL_CONTRACTS_QUERY_KEY } from "@/hooks/useGetCollateralContracts"

export const useCreateCollateralContract = (
  market: Market,
  setTxHash: Dispatch<React.SetStateAction<string | undefined>>,
) => {
  const signer = useEthersSigner()
  const client = useQueryClient()
  const { isTestnet } = useCurrentNetwork()
  const { connected: safeConnected, sdk } = useSafeAppsSDK()

  const waitForTransaction = async (safeTxHash: string) => {
    if (!sdk) throw Error("No sdk found")
    const { txHash } = await sdk.txs.getBySafeTxHash(safeTxHash)
    if (!txHash) throw Error("No tx hash found")
    return sdk.eth.getTransactionReceipt([txHash]).then((tx) => {
      if (tx) {
        tx.transactionHash = txHash
      }
      return tx
    })
  }
  const checkGnosisTransaction = async (
    safeTxHash: string,
  ): Promise<Web3TransactionReceiptObject> =>
    new Promise((resolve) => {
      const doCheckTransaction = async () => {
        const transactionBySafeHash = await sdk.txs.getBySafeTxHash(safeTxHash)
        if (transactionBySafeHash?.txHash) {
          setTxHash(transactionBySafeHash.txHash)
          const receipt = await waitForTransaction(safeTxHash)
          console.log(
            `Got gnosis transaction receipt:\n\ttxHash: ${receipt.transactionHash}`,
          )
          resolve(receipt)
        } else {
          setTimeout(doCheckTransaction, 1000)
        }
      }
      doCheckTransaction()
    })

  return useMutation({
    mutationFn: async (collateralAsset: Token) => {
      if (!market || !signer) {
        return
      }

      const createCollateralContract = async () => {
        // const pendingTransactions: PendingTransactions

        // For testnet, we need to deploy a mock token first
        if (isTestnet) {
          const address = await signer.getAddress()

          collateralAsset = new Token(
            market.chainId,
            await getNextTokenAddress(market.chainId, signer, address),
            collateralAsset.name,
            collateralAsset.symbol,
            18,
            true,
            signer,
          )
          if (safeConnected) {
            const gnosisTransactions: PartialTransaction[] = []
            gnosisTransactions.push(
              await populateDeployToken(
                market.chainId,
                signer,
                collateralAsset.name,
                collateralAsset.symbol,
              ),
            )
            gnosisTransactions.push(
              await MarketCollateralV1.populateCreate(
                market.chainId,
                signer,
                market,
                collateralAsset,
              ),
            )
            const { safeTxHash } = await sdk.txs.send({
              txs: gnosisTransactions,
            })
            console.log(`Got gnosis transaction:\n\tsafeTxHash: ${safeTxHash}`)
            const receipt = await checkGnosisTransaction(safeTxHash)
            console.log(
              `Got gnosis transaction receipt:\n\ttxHash: ${receipt.transactionHash}`,
            )
            return receipt
          }
          await toastRequest(
            deployToken(
              market.chainId,
              signer,
              collateralAsset.name,
              collateralAsset.symbol,
            ).then((t) => t.receipt),
            {
              pending: "Step 1/2: Deploying Mock Token...",
              success: "Step 1/2: Mock Token Deployed Successfully!",
              error: "Step 1/2: Mock Token Deployment Failed.",
            },
          )
        }

        const prefixString = isTestnet ? "Step 2/2: " : ""
        const tx = await toastRequest(
          MarketCollateralV1.create(
            market.chainId,
            market.provider,
            market,
            collateralAsset,
          ),
          {
            pending: `${prefixString}Creating Collateral Contract...`,
            success: `${prefixString}Collateral Contract Created Successfully!`,
            error: `${prefixString}Collateral Contract Creation Failed.`,
          },
        )

        if (safeConnected) {
          return checkGnosisTransaction(tx.hash)
        }
        setTxHash(tx.hash)
        return tx.wait()
      }

      await createCollateralContract()
    },
    onSuccess() {
      client.invalidateQueries({
        queryKey: [GET_COLLATERAL_CONTRACTS_QUERY_KEY, market.address],
      })
    },
    onError(error) {
      console.log(error)
    },
  })
}
