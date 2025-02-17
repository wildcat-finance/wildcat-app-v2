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
import { TargetChainId } from "@/config/network"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useEthersSigner } from "@/hooks/useEthersSigner"
import { GET_BASIC_BORROWER_DATA_KEY } from "@/hooks/useGetBasicBorrowerData"
import { GET_CONTROLLER_KEY } from "@/hooks/useGetController"

import { GET_BORROWER_MARKETS } from "../../hooks/getMaketsHooks/useGetBorrowerMarkets"
import { GET_ALL_MARKETS } from "../../hooks/getMaketsHooks/useGetOthersMarkets"

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
        console.log(
          `useDeployMarket :: isTestnet: ${isTestnet} :: isConnectedToSafe: ${isConnectedToSafe} :: gnosisSafeSDK: ${!!gnosisSafeSDK}`,
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
                return transactionBySafeHash.txHash
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
          console.log(`Declining MLA for market ${marketAddress.toLowerCase()}`)
          const response = await fetch(
            `/api/mla/${marketAddress.toLowerCase()}/decline`,
            {
              method: "POST",
              body: JSON.stringify({
                signature: mlaSignature,
                timeSigned,
              }),
            },
          )
          if (response.status !== 200) throw Error("Failed to submit MLA")
          return true
        }
        console.log(`Submitting MLA for market ${marketAddress.toLowerCase()}`)
        const response = await fetch(
          `/api/mla/${marketAddress.toLowerCase()}`,
          {
            method: "POST",
            body: JSON.stringify({
              mlaTemplate: mlaTemplateId,
              signature: mlaSignature,
              timeSigned,
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
    onSuccess: () => {
      client.invalidateQueries({ queryKey: [GET_CONTROLLER_KEY] })
      client.invalidateQueries({ queryKey: [GET_BORROWER_MARKETS] })
      client.invalidateQueries({ queryKey: [GET_ALL_MARKETS] })
      client.invalidateQueries({ queryKey: [GET_BASIC_BORROWER_DATA_KEY] })
    },
    onError(error) {
      console.log(error)
    },
  })

  if (deployError?.message === "Failed to upload MLA selection") {
    console.log("Failed to upload MLA selection")
  }

  return {
    deployNewMarket,
    isDeploying,
    isSuccess,
    isError,
  }
}
