import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  MarketParameters,
  deployToken,
  TokenAmount,
  Token,
  getNextTokenAddress,
  populateDeployToken,
  PartialTransaction,
} from "@wildcatfi/wildcat-sdk"
import { parseUnits } from "ethers/lib/utils"

import { toastifyError, toastifyRequest } from "@/components/toasts"
import { TargetChainId } from "@/config/network"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useEthersSigner } from "@/hooks/useEthersSigner"
import { GET_CONTROLLER_KEY, useGetController } from "@/hooks/useGetController"

export type DeployNewMarketParams = Omit<
  MarketParameters,
  "maxTotalSupply" | "asset"
> & {
  maxTotalSupply: number
  assetData: MarketParameters["asset"]
}

export const useDeployMarket = () => {
  const { data: controller } = useGetController()
  const signer = useEthersSigner()
  const client = useQueryClient()
  const { isTestnet } = useCurrentNetwork()
  const { connected: isConnectedToSafe, sdk: gnosisSafeSDK } = useSafeAppsSDK()

  const waitForTransaction = async (txHash: string) => {
    if (!gnosisSafeSDK) throw Error("No sdk found")
    return gnosisSafeSDK.eth.getTransactionReceipt([txHash]).then((tx) => {
      if (tx) {
        tx.transactionHash = txHash
      }
      return tx
    })
  }

  const {
    mutate: deployNewMarket,
    isPending: isDeploying,
    isSuccess,
    isError,
  } = useMutation({
    mutationFn: async (marketParams: DeployNewMarketParams) => {
      if (!signer || !controller || !marketParams) {
        return
      }
      const useGnosisMultiSend = isConnectedToSafe && isTestnet

      const { assetData } = marketParams
      let asset: Token
      const gnosisTransactions: PartialTransaction[] = []
      console.log(
        `useDeployMarket :: isTestnet: ${isTestnet} :: isConnectedToSafe: ${isConnectedToSafe} :: gnosisSafeSDK: ${!!gnosisSafeSDK}`,
      )
      if (isTestnet) {
        if (isConnectedToSafe) {
          const { chainId } = controller
          const address = await signer.getAddress()
          asset = new Token(
            chainId,
            await getNextTokenAddress(chainId, signer, address),
            assetData.name,
            assetData.symbol,
            18,
            true,
            signer,
          )
          gnosisTransactions.push(
            await populateDeployToken(
              chainId,
              signer,
              assetData.name,
              assetData.symbol,
            ),
          )
        } else {
          asset = await toastifyRequest(
            deployToken(
              TargetChainId,
              signer,
              assetData.name,
              assetData.symbol,
            ).then((t) => t.token),
            {
              pending: "Step 1/2: Deploying Mock Token...",
              success: "Step 1/2: Mock Token Deployed Successfully!",
              error: "Step 1/2: Mock Token Deployment Failed.",
            },
          )
        }
      } else {
        asset = assetData
      }

      const maxTotalSupply = new TokenAmount(
        parseUnits(marketParams.maxTotalSupply.toString(), asset.decimals),
        asset,
      )

      const marketParameters: MarketParameters = {
        asset,
        namePrefix: marketParams.namePrefix,
        symbolPrefix: marketParams.symbolPrefix,
        maxTotalSupply,
        annualInterestBips: marketParams.annualInterestBips,
        delinquencyFeeBips: marketParams.delinquencyFeeBips,
        withdrawalBatchDuration: marketParams.withdrawalBatchDuration,
        reserveRatioBips: marketParams.reserveRatioBips,
        delinquencyGracePeriod: marketParams.delinquencyGracePeriod,
      }

      // 1. Ensure borrower is registered on the arch-controller.
      // For the testnet deployment, anyone can register a borrower
      if (!controller.isRegisteredBorrower) {
        if (isTestnet) {
          if (isConnectedToSafe) {
            gnosisTransactions.push(await controller.populateRegisterBorrower())
          } else {
            await toastifyRequest(controller.registerBorrower(), {
              pending: "Adjusting: Registering Borrower...",
              success: "Adjusting: Borrower Registered Successfully",
              error: "Adjusting: Borrower Registration Failed",
            })
          }
        } else {
          toastifyError("Must Be Registered Borrower")
          throw Error("Not Registered Borrower")
        }
      }

      // 2. Ensure the `asset, namePrefix, symbolPrefix` are unique.
      if (controller.getExistingMarketForParameters(marketParameters)) {
        toastifyError("Market Not Unique: Modify Either Prefix")
        throw Error("Market Not Unique")
      }

      const send = async () => {
        if (useGnosisMultiSend) {
          gnosisTransactions.push(
            controller.encodeDeployMarket(marketParameters),
          )

          console.log("Sending Gnosis transactions:", gnosisTransactions)

          const tx = await gnosisSafeSDK.txs.send({ txs: gnosisTransactions })
          console.log("Transaction sent, result:", tx)

          const checkTransaction = async () => {
            const transactionBySafeHash =
              await gnosisSafeSDK.txs.getBySafeTxHash(tx.safeTxHash)

            if (transactionBySafeHash?.txHash) {
              console.log(
                `Transaction confirmed. txHash: ${transactionBySafeHash.txHash}`,
              )
              return transactionBySafeHash.txHash // Возвращаем хэш транзакции
            }
            console.log("Transaction pending, rechecking in 1 second...")
            return new Promise<string>((res) => {
              setTimeout(async () => res(await checkTransaction()), 1000)
            })
          }

          const txHash = await checkTransaction()

          if (txHash) {
            console.log(`Waiting for transaction with txHash: ${txHash}`)
            const receipt = await waitForTransaction(txHash)
            console.log("Transaction confirmed, receipt received.")
            return receipt
          }
          console.error("Failed to retrieve txHash.")
          throw new Error("Transaction failed or hash not found.")
        } else {
          const { receipt } = await controller.deployMarket(marketParameters)
          return receipt
        }
      }

      await send()
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: [GET_CONTROLLER_KEY] })
    },
    onError(error) {
      console.log(error)
    },
  })

  return {
    deployNewMarket,
    isDeploying,
    isSuccess,
    isError,
  }
}
