import { useState } from "react"

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
  getMockArchControllerOwnerContract,
  getHooksFactoryContract,
} from "@wildcatfi/wildcat-sdk"
import {
  DeployMarketStatus,
  FixedTermHooksTemplate,
  FixedTermMarketDeploymentArgs,
  OpenTermHooksTemplate,
  OpenTermMarketDeploymentArgs,
} from "@wildcatfi/wildcat-sdk/dist/access"
import { MarketDeployedEvent } from "@wildcatfi/wildcat-sdk/dist/typechain/HooksFactory"
import { parseUnits } from "ethers/lib/utils"

import { toastError, toastRequest } from "@/components/Toasts"
import { QueryKeys } from "@/config/query-keys"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useEthersSigner } from "@/hooks/useEthersSigner"
import { logger } from "@/lib/logging/client"

export type DeployNewV2MarketParams = (
  | (Omit<
      FixedTermMarketDeploymentArgs,
      "maxTotalSupply" | "minimumDeposit" | "asset"
    > & {
      maxTotalSupply: number
      minimumDeposit?: number
      assetData: MarketParameters["asset"]
      hooksTemplate: FixedTermHooksTemplate
    })
  | (Omit<
      OpenTermMarketDeploymentArgs,
      "maxTotalSupply" | "minimumDeposit" | "asset"
    > & {
      maxTotalSupply: number
      minimumDeposit?: number
      assetData: MarketParameters["asset"]
      hooksTemplate: OpenTermHooksTemplate
    })
) & {
  timeSigned: number
  mlaTemplateId: number | undefined
  mlaSignature: string
}

export const useDeployV2Market = () => {
  const signer = useEthersSigner()
  const client = useQueryClient()
  const { isTestnet, targetChainId } = useCurrentNetwork()
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

  const [deployedMarket, setDeployedMarket] = useState<string | undefined>()

  const {
    mutate: deployNewMarket,
    isPending: isDeploying,
    isSuccess,
    isError,
    error: deployError,
  } = useMutation({
    mutationFn: async ({
      hooksTemplate,
      assetData,
      minimumDeposit: minimumDepositNum,
      maxTotalSupply: maxTotalSupplyNum,
      timeSigned,
      mlaTemplateId,
      mlaSignature,
      ...marketParams
    }: DeployNewV2MarketParams) => {
      if (!signer || !hooksTemplate || !marketParams) {
        return
      }

      let marketAddress: string | undefined
      if (deployedMarket) {
        marketAddress = deployedMarket
      } else {
        const useGnosisMultiSend = isConnectedToSafe && isTestnet

        let asset: Token
        const gnosisTransactions: PartialTransaction[] = []
        logger.debug(
          {
            isTestnet,
            isConnectedToSafe,
            hasGnosisSafeSDK: !!gnosisSafeSDK,
          },
          "Deploy market status",
        )
        if (isTestnet) {
          if (isConnectedToSafe) {
            const { chainId } = hooksTemplate
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
            asset = await toastRequest(
              deployToken(
                targetChainId,
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
          parseUnits(maxTotalSupplyNum.toString(), asset.decimals),
          asset,
        )

        const minimumDeposit = asset.parseAmount(minimumDepositNum ?? 0)

        const borrowerAddress = hooksTemplate.signerAddress
        if (!borrowerAddress) throw Error(`Borrower not found`)
        // 1. Ensure borrower is registered on the arch-controller.
        // For the testnet deployment, anyone can register a borrower
        if (!hooksTemplate.isRegisteredBorrower) {
          if (isTestnet) {
            const archControllerOwner = getMockArchControllerOwnerContract(
              hooksTemplate.chainId,
              signer,
            )
            if (isConnectedToSafe) {
              gnosisTransactions.push({
                to: archControllerOwner.address,
                data: archControllerOwner.interface.encodeFunctionData(
                  "registerBorrower",
                  [borrowerAddress],
                ),
                value: "0",
              })
            } else {
              await toastRequest(
                archControllerOwner.registerBorrower(borrowerAddress),
                {
                  pending: "Adjusting: Registering Borrower...",
                  success: "Adjusting: Borrower Registered Successfully",
                  error: "Adjusting: Borrower Registration Failed",
                },
              )
            }
          } else {
            toastError("Must Be Registered Borrower")
            throw Error("Not Registered Borrower")
          }
        }

        const send = async () => {
          const x = marketParams as Parameters<
            typeof hooksTemplate.previewDeployMarket
          >[0]
          const params = {
            ...x,
            maxTotalSupply,
            minimumDeposit,
            asset,
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const preview = hooksTemplate.previewDeployMarket(params as any)
          if (preview.status !== DeployMarketStatus.Ready) {
            throw Error(`Market not ready : ${preview.status}`)
          }
          const hooksFactory = getHooksFactoryContract(
            hooksTemplate.chainId,
            signer,
          )
          if (useGnosisMultiSend) {
            const data =
              preview.fn === "deployMarket"
                ? hooksFactory.interface.encodeFunctionData(
                    "deployMarket",
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    preview.args as any,
                  )
                : hooksFactory.interface.encodeFunctionData(
                    "deployMarketAndHooks",
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    preview.args as any,
                  )

            gnosisTransactions.push({
              data,
              to: hooksFactory.address,
              value: "0",
            })

            logger.info("Sending Gnosis transactions")
            logger.debug(
              { transactions: gnosisTransactions },
              "Gnosis transactions payload",
            )

            const tx = await gnosisSafeSDK.txs.send({ txs: gnosisTransactions })
            logger.info({ tx }, "Transaction sent")

            const checkTransaction = async () => {
              const transactionBySafeHash =
                await gnosisSafeSDK.txs.getBySafeTxHash(tx.safeTxHash)

              if (transactionBySafeHash?.txHash) {
                logger.info(
                  { txHash: transactionBySafeHash.txHash },
                  "Transaction confirmed",
                )
                return transactionBySafeHash.txHash
              }
              logger.debug("Transaction pending, rechecking in 1 second")
              return new Promise<string>((res) => {
                setTimeout(async () => res(await checkTransaction()), 1000)
              })
            }

            const txHash = await checkTransaction()

            if (txHash) {
              logger.info({ txHash }, "Waiting for transaction")
              const receipt = await waitForTransaction(txHash)
              logger.info({ txHash }, "Transaction confirmed, receipt received")
              return receipt
            }
            logger.error("Failed to retrieve txHash")
            throw new Error("Transaction failed or hash not found.")
          } else {
            // const exec = (...args: any[]) => hooksFactory[preview.fn]()
            const tx = await (preview.fn === "deployMarket"
              ? hooksFactory.deployMarket(...preview.args)
              : hooksFactory.deployMarketAndHooks(...preview.args))
            return tx.wait()
          }
        }

        const receipt = await send()
        const marketDeployedTopic =
          hooksTemplate.contract.interface.getEventTopic("MarketDeployed")

        const log = receipt.logs.find(
          (l) => l.topics[0] === marketDeployedTopic,
        )!

        const event = hooksTemplate.contract.interface.decodeEventLog(
          "MarketDeployed",
          log.data,
          log.topics,
        ) as unknown as MarketDeployedEvent["args"]
        marketAddress = event.market
        setDeployedMarket(marketAddress)
      }

      const doSubmit = async () => {
        if (mlaTemplateId === undefined) {
          logger.info(
            { market: marketAddress.toLowerCase() },
            "Declining MLA for market",
          )
          const response = await fetch(
            `/api/mla/${marketAddress.toLowerCase()}/decline`,
            {
              method: "POST",
              body: JSON.stringify({
                chainId: targetChainId,
                signature: mlaSignature,
                timeSigned,
              }),
            },
          )
          if (response.status !== 200) throw Error("Failed to submit MLA")
          return true
        }
        logger.info(
          { market: marketAddress.toLowerCase() },
          "Submitting MLA for market",
        )
        const response = await fetch(
          `/api/mla/${marketAddress.toLowerCase()}`,
          {
            method: "POST",
            body: JSON.stringify({
              mlaTemplate: mlaTemplateId,
              signature: mlaSignature,
              timeSigned,
              chainId: targetChainId,
            }),
          },
        )
        if (response.status !== 200) throw Error("Failed to submit MLA")
        return true
      }
      await toastRequest(doSubmit(), {
        success: "MLA selection uploaded successfully",
        error: "Failed to upload MLA selection",
        pending: "Uploading MLA selection...",
      })
    },
    onSuccess: (_, variables) => {
      const borrowerAddress =
        variables?.hooksTemplate?.signerAddress?.toLowerCase()

      client.invalidateQueries({
        queryKey: QueryKeys.Borrower.GET_CONTROLLER(
          targetChainId,
          variables?.hooksTemplate?.signerAddress,
        ),
      })
      client.invalidateQueries({
        queryKey: QueryKeys.Borrower.GET_OWN_MARKETS(
          targetChainId,
          borrowerAddress,
        ),
      })
      client.invalidateQueries({
        queryKey: QueryKeys.Borrower.GET_ALL_MARKETS(targetChainId),
      })
      client.invalidateQueries({
        queryKey: QueryKeys.Borrower.GET_BASIC_BORROWER_DATA(
          targetChainId,
          borrowerAddress,
        ),
      })
    },
    onError(error) {
      logger.error({ err: error }, "Failed to deploy market")
    },
  })

  if (deployError?.message === "Failed to upload MLA selection") {
    logger.error("Failed to upload MLA selection")
  }

  return {
    deployNewMarket,
    isDeploying,
    isSuccess,
    isError,
  }
}
