import { useState } from "react"

import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  MarketParameters,
  deployToken,
  Token,
  getNextTokenAddress,
  populateDeployToken,
  SafeTransactionInput,
  toSafeTransactionInput,
  getMockArchControllerOwnerContract,
  getHooksFactoryContractForMarketKind,
  getRevolvingHooksFactoryContract,
  getStandardHooksFactoryContract,
  WrapperFactory,
  hasDeploymentAddress,
  SupportedChainId,
  TransferAccess,
  DeployMarketStatus,
  FixedTermHooksTemplate,
  FixedTermMarketDeploymentArgs,
  OpenTermHooksTemplate,
  OpenTermMarketDeploymentArgs,
  PeriodicTermHooksTemplate,
  PeriodicTermMarketDeploymentArgs,
} from "@wildcatfi/wildcat-sdk"
import { decodeEventLog, parseAbiItem, zeroAddress, type Hex } from "viem"

import { toastError, toastRequest, toastSuccess } from "@/components/Toasts"
import { QueryKeys } from "@/config/query-keys"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useEthersSigner } from "@/hooks/useEthersSigner"
import { useAppDispatch, useAppStore } from "@/store/hooks"
import {
  clearCreateMarketSafeTransactionProposal,
  getCreateMarketSafeTransactionProposal,
  getCreateMarketSigningDraftScope,
  getReusableCreateMarketDraftDeployment,
  markCreateMarketDraftDeployed,
  recordCreateMarketSafeTransactionProposal,
} from "@/store/slices/createMarketSigningDraftsSlice/createMarketSigningDraftsSlice"
import {
  assertWrapperDeploymentCompatible,
  getDeployMarketPreviewError,
  previewHooksTemplateDeployment,
} from "@/utils/createMarketDeploy"
import {
  SafeTransactionTerminalError,
  waitForSafeTransactionExecution,
} from "@/utils/transactions"

import { getCreateMarketFormFingerprint } from "../validation/deployFingerprint"

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
  | (Omit<
      PeriodicTermMarketDeploymentArgs,
      "maxTotalSupply" | "minimumDeposit" | "asset"
    > & {
      maxTotalSupply: number
      minimumDeposit?: number
      assetData: MarketParameters["asset"]
      hooksTemplate: PeriodicTermHooksTemplate
    })
) & {
  marketKind: "standard" | "revolving"
  timeSigned: number
  mlaTemplateId: number | undefined
  mlaSignature: string
  deployWrapper?: boolean
  draftId?: string
  deployFingerprint: string
}

export type CompleteDeployedV2MarketParams = {
  borrowerAddress: string
  draftId: string
  salt: string
  marketKind: "standard" | "revolving"
  marketAddress: string
  transferAccess: TransferAccess
  timeSigned: number
  mlaTemplateId: number | undefined
  mlaSignature: string
  deployWrapper?: boolean
}

type DeployV2MarketOperation =
  | { kind: "deploy"; params: DeployNewV2MarketParams }
  | {
      kind: "resumeSafeDeployment"
      params: CompleteDeployedV2MarketParams
    }
  | { kind: "complete"; params: CompleteDeployedV2MarketParams }

type MarketDeployedEventArgs = {
  market: string
}

const marketDeployedEventAbi = parseAbiItem(
  "event MarketDeployed(address indexed hooksTemplate, address indexed market, string name, string symbol, address asset, uint256 maxTotalSupply, uint256 annualInterestBips, uint256 delinquencyFeeBips, uint256 withdrawalBatchDuration, uint256 reserveRatioBips, uint256 delinquencyGracePeriod, uint256 hooks)",
)

type MarketDeploymentReceipt = {
  logs: readonly {
    data: string
    topics: readonly string[]
  }[]
}

const getDeployedMarketFromReceipt = (receipt: MarketDeploymentReceipt) => {
  const event = receipt.logs
    .map((log) => {
      try {
        return decodeEventLog({
          abi: [marketDeployedEventAbi],
          data: log.data as Hex,
          topics: log.topics as [Hex, ...Hex[]],
        })
      } catch {
        return undefined
      }
    })
    .find((decoded) => decoded?.eventName === "MarketDeployed")

  if (!event) {
    throw Error("MarketDeployed event not found")
  }
  return (event.args as MarketDeployedEventArgs).market
}

export const useDeployV2Market = () => {
  const signer = useEthersSigner()
  const client = useQueryClient()
  const { isTestnet, targetChainId } = useCurrentNetwork()
  const { connected: isConnectedToSafe, sdk: gnosisSafeSDK } = useSafeAppsSDK()

  const waitForTransaction = async (txHash: string) => {
    if (!gnosisSafeSDK) throw Error("No sdk found")
    const receipt = await gnosisSafeSDK.eth.getTransactionReceipt([txHash])
    if (!receipt) {
      throw Error("Safe transaction receipt is not available yet")
    }
    receipt.transactionHash = txHash
    return receipt
  }

  const [deployed, setDeployed] = useState<
    | {
        salt: string
        marketKind: "standard" | "revolving"
        fingerprint: string
        market: string
      }
    | undefined
  >()
  const dispatch = useAppDispatch()
  const store = useAppStore()

  type DeployStep = "mockToken" | "market" | "wrapper"

  const getDeploySteps = ({
    includeMockToken,
    includeMarket = true,
    includeWrapper,
  }: {
    includeMockToken: boolean
    includeMarket?: boolean
    includeWrapper: boolean
  }) =>
    [
      ...(includeMockToken ? (["mockToken"] as DeployStep[]) : []),
      ...(includeMarket ? (["market"] as DeployStep[]) : []),
      ...(includeWrapper ? (["wrapper"] as DeployStep[]) : []),
    ] as DeployStep[]

  const getStepToastConfig = (
    steps: ReturnType<typeof getDeploySteps>,
    step: DeployStep,
    messages: { pending: string; success: string; error: string },
  ) => {
    const currentIndex = steps.indexOf(step)
    if (currentIndex === -1) {
      throw new Error(`Unknown deployment step: ${step}`)
    }
    const position = currentIndex + 1
    const total = steps.length

    return {
      pending: `Step ${position}/${total}: ${messages.pending}`,
      success: `Step ${position}/${total}: ${messages.success}`,
      error: `Step ${position}/${total}: ${messages.error}`,
    }
  }

  const getDraft = (address: string) =>
    store.getState().createMarketSigningDrafts.records[
      getCreateMarketSigningDraftScope(address, targetChainId)
    ]

  const getMatchingDraft = ({
    borrowerAddress,
    draftId,
    salt,
    predictedMarket,
  }: {
    borrowerAddress: string
    draftId: string | undefined
    salt: string
    predictedMarket: string
  }) => {
    const draft = getDraft(borrowerAddress)
    if (
      !draft ||
      !draftId ||
      draft.id !== draftId ||
      draft.salt !== salt ||
      draft.deploymentIdentity.predictedMarket !== predictedMarket.toLowerCase()
    ) {
      throw Error("The Safe deployment draft is no longer active")
    }
    return draft
  }

  const clearSafeProposal = ({
    borrowerAddress,
    salt,
    predictedMarket,
    step,
    safeTxHash,
  }: {
    borrowerAddress: string
    salt: string
    predictedMarket: string
    step: "market" | "wrapper"
    safeTxHash: string
  }) => {
    dispatch(
      clearCreateMarketSafeTransactionProposal({
        address: borrowerAddress,
        chainId: targetChainId,
        salt,
        predictedMarket,
        step,
        safeTxHash,
      }),
    )
  }

  const waitForSafeProposal = async ({
    borrowerAddress,
    salt,
    predictedMarket,
    step,
    createProposal,
    clearOnSuccess = true,
  }: {
    borrowerAddress: string
    salt: string
    predictedMarket: string
    step: "market" | "wrapper"
    createProposal?: () => Promise<{ safeTxHash: string }>
    clearOnSuccess?: boolean
  }) => {
    if (!gnosisSafeSDK) throw Error("No Safe SDK")

    const currentDraft = getDraft(borrowerAddress)
    let proposal = getCreateMarketSafeTransactionProposal({
      draft: currentDraft,
      salt,
      predictedMarket,
      step,
    })
    if (!proposal) {
      if (!createProposal) {
        throw Error(`No pending Safe ${step} proposal was found`)
      }
      const created = await createProposal()
      dispatch(
        recordCreateMarketSafeTransactionProposal({
          address: borrowerAddress,
          chainId: targetChainId,
          salt,
          predictedMarket,
          step,
          safeTxHash: created.safeTxHash,
          submittedAt: Date.now(),
        }),
      )
      proposal = {
        safeTxHash: created.safeTxHash,
        submittedAt: Date.now(),
      }
    }

    try {
      const transactionHash = await waitForSafeTransactionExecution(
        gnosisSafeSDK,
        proposal.safeTxHash,
      )
      const receipt = await waitForTransaction(transactionHash)
      if (clearOnSuccess) {
        clearSafeProposal({
          borrowerAddress,
          salt,
          predictedMarket,
          step,
          safeTxHash: proposal.safeTxHash,
        })
      }
      return receipt
    } catch (error) {
      if (error instanceof SafeTransactionTerminalError) {
        clearSafeProposal({
          borrowerAddress,
          salt,
          predictedMarket,
          step,
          safeTxHash: proposal.safeTxHash,
        })
      }
      throw error
    }
  }

  const assertSignerContext = async (borrowerAddress: string) => {
    if (!signer) throw Error("No signer")
    if (signer.chainId !== targetChainId) {
      throw Error("Wallet network does not match selected network")
    }
    if (
      (await signer.getAddress()).toLowerCase() !==
      borrowerAddress.toLowerCase()
    ) {
      throw Error("Connected wallet does not match the deployment borrower")
    }
    return signer
  }

  const completeMarketSetup = async ({
    borrowerAddress,
    draftId,
    salt,
    marketAddress,
    transferAccess,
    timeSigned,
    mlaTemplateId,
    mlaSignature,
    deployWrapper,
    deploymentSteps,
  }: CompleteDeployedV2MarketParams & {
    deploymentSteps: ReturnType<typeof getDeploySteps>
  }) => {
    if (!signer) throw Error("No signer")
    assertWrapperDeploymentCompatible(deployWrapper, transferAccess)

    if (deployWrapper) {
      const chainId = targetChainId as SupportedChainId
      if (!hasDeploymentAddress(chainId, "Wildcat4626WrapperFactory")) {
        throw Error("Wrapper factory not available on this chain")
      }

      const existingWrapper = await WrapperFactory.getWrapperForMarket(
        chainId,
        signer,
        marketAddress,
      )
      const wrapperProposal = getCreateMarketSafeTransactionProposal({
        draft: getDraft(borrowerAddress),
        salt,
        predictedMarket: marketAddress,
        step: "wrapper",
      })

      if (existingWrapper === zeroAddress) {
        await toastRequest(
          (async () => {
            if (isConnectedToSafe) {
              getMatchingDraft({
                borrowerAddress,
                draftId,
                salt,
                predictedMarket: marketAddress,
              })
              const wrapperTransaction = WrapperFactory.populateCreateWrapper(
                chainId,
                signer,
                marketAddress,
              )
              return waitForSafeProposal({
                borrowerAddress,
                salt,
                predictedMarket: marketAddress,
                step: "wrapper",
                createProposal: wrapperProposal
                  ? undefined
                  : () =>
                      gnosisSafeSDK.txs.send({
                        txs: [toSafeTransactionInput(wrapperTransaction)],
                      }),
              })
            }

            const { result: wrapper } = await WrapperFactory.createWrapper(
              chainId,
              signer,
              marketAddress,
            )
            return wrapper
          })(),
          getStepToastConfig(deploymentSteps, "wrapper", {
            pending: "Deploying Wrapper..",
            success: "Wrapper Deployed Successfully!",
            error: "Wrapper Deployment Failed.",
          }),
        )
      } else if (wrapperProposal) {
        if (!isConnectedToSafe) {
          throw Error("Connect the original Safe to resolve wrapper deployment")
        }
        await toastRequest(
          waitForSafeProposal({
            borrowerAddress,
            salt,
            predictedMarket: marketAddress,
            step: "wrapper",
          }),
          getStepToastConfig(deploymentSteps, "wrapper", {
            pending: "Waiting for Safe wrapper transaction..",
            success: "Wrapper Transaction Finalized!",
            error: "Wrapper Transaction Failed.",
          }),
        )
      } else {
        const { success } = getStepToastConfig(deploymentSteps, "wrapper", {
          pending: "Deploying Wrapper..",
          success: "Wrapper Deployed Successfully!",
          error: "Wrapper Deployment Failed.",
        })
        toastSuccess(`${success} (already deployed)`)
      }
    }

    const doSubmit = async () => {
      if (mlaTemplateId === undefined) {
        console.log(`Declining MLA for market ${marketAddress.toLowerCase()}`)
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
        if (response.status !== 200) {
          const error = await response
            .json()
            .catch(() => undefined as { error?: string } | undefined)
          throw Error(
            error?.error ?? `Failed to submit MLA decline (${response.status})`,
          )
        }
        return true
      }
      console.log(`Submitting MLA for market ${marketAddress.toLowerCase()}`)
      const response = await fetch(`/api/mla/${marketAddress.toLowerCase()}`, {
        method: "POST",
        body: JSON.stringify({
          mlaTemplate: mlaTemplateId,
          signature: mlaSignature,
          timeSigned,
          chainId: targetChainId,
        }),
      })
      if (response.status !== 200) {
        const error = await response
          .json()
          .catch(() => undefined as { error?: string } | undefined)
        throw Error(
          error?.error ??
            `Failed to submit MLA submission (${response.status})`,
        )
      }
      return true
    }
    await toastRequest(doSubmit(), {
      success: "MLA selection uploaded successfully",
      error: "Failed to upload MLA selection",
      pending: "Uploading MLA selection...",
    })
  }

  const deployMarket = async (params: DeployNewV2MarketParams) => {
    const {
      hooksTemplate,
      assetData,
      minimumDeposit: minimumDepositNum,
      maxTotalSupply: maxTotalSupplyNum,
      timeSigned,
      mlaTemplateId,
      mlaSignature,
      deployWrapper,
      draftId,
      deployFingerprint,
      ...marketParams
    } = params
    if (!hooksTemplate) throw Error("No hooks template")
    const borrowerAddress = hooksTemplate.signerAddress
    if (!borrowerAddress) throw Error("Borrower not found")
    const activeSigner = await assertSignerContext(borrowerAddress)

    assertWrapperDeploymentCompatible(
      deployWrapper,
      marketParams.transferAccess,
    )

    const includeMockTokenStep = !!isTestnet && !isConnectedToSafe
    const deploymentSteps = getDeploySteps({
      includeMockToken: includeMockTokenStep,
      includeWrapper: !!deployWrapper,
    })
    const persistedDraft = isConnectedToSafe
      ? getMatchingDraft({
          borrowerAddress,
          draftId,
          salt: marketParams.salt,
          predictedMarket: (
            await getHooksFactoryContractForMarketKind(
              targetChainId,
              marketParams.marketKind,
              activeSigner,
            ).computeMarketAddress(marketParams.salt)
          ).toLowerCase(),
        })
      : undefined
    const lookupFactory = getHooksFactoryContractForMarketKind(
      targetChainId,
      marketParams.marketKind,
      activeSigner,
    )
    const predictedMarket = await lookupFactory.computeMarketAddress(
      marketParams.salt,
    )
    const persistedMarket = getReusableCreateMarketDraftDeployment({
      draft: persistedDraft,
      salt: marketParams.salt,
      marketKind: marketParams.marketKind,
      hooksTemplate: hooksTemplate.hooksTemplate,
    })

    const throwParamsChangedAfterDeployment = () => {
      throw Error(
        "A market was already deployed for this signature with different settings. Restore those settings to complete its agreement, or start a new market.",
      )
    }

    let marketAddress: string | undefined
    if (
      deployed?.salt === marketParams.salt &&
      deployed.marketKind === marketParams.marketKind
    ) {
      if (deployed.fingerprint !== deployFingerprint) {
        throwParamsChangedAfterDeployment()
      }
      marketAddress = deployed.market
    } else if (persistedMarket) {
      if (
        persistedDraft &&
        getCreateMarketFormFingerprint(persistedDraft.formValues) !==
          deployFingerprint
      ) {
        throwParamsChangedAfterDeployment()
      }
      marketAddress = persistedMarket
    } else if (
      (await activeSigner.provider.getCode(predictedMarket)) !== "0x"
    ) {
      marketAddress = predictedMarket
    }

    if (marketAddress) {
      setDeployed({
        salt: marketParams.salt,
        marketKind: marketParams.marketKind,
        fingerprint: deployFingerprint,
        market: marketAddress,
      })
      if (persistedDraft) {
        dispatch(
          markCreateMarketDraftDeployed({
            address: borrowerAddress,
            chainId: targetChainId,
            salt: marketParams.salt,
            deployedMarket: marketAddress,
          }),
        )
      }
    }

    if (!marketAddress) {
      const useGnosisMultiSend = isConnectedToSafe && isTestnet
      let asset: Token
      const gnosisTransactions: SafeTransactionInput[] = []
      console.log(
        `useDeployMarket :: isTestnet: ${isTestnet} :: isConnectedToSafe: ${isConnectedToSafe} :: gnosisSafeSDK: ${!!gnosisSafeSDK}`,
      )
      if (isTestnet) {
        if (isConnectedToSafe) {
          const { chainId } = hooksTemplate
          asset = new Token(
            chainId,
            await getNextTokenAddress(chainId, activeSigner, borrowerAddress),
            assetData.name,
            assetData.symbol,
            18,
            true,
            activeSigner,
          )
          gnosisTransactions.push(
            toSafeTransactionInput(
              await populateDeployToken(
                chainId,
                activeSigner,
                assetData.name,
                assetData.symbol,
              ),
            ),
          )
        } else {
          asset = await toastRequest(
            deployToken(
              targetChainId,
              activeSigner,
              assetData.name,
              assetData.symbol,
            ).then((token) => token.result),
            getStepToastConfig(deploymentSteps, "mockToken", {
              pending: "Deploying Mock Token..",
              success: "Mock Token Deployed Successfully!",
              error: "Mock Token Deployment Failed.",
            }),
          )
        }
      } else {
        asset = assetData
      }

      const maxTotalSupply = asset.parseAmount(maxTotalSupplyNum.toString())
      const minimumDeposit = asset.parseAmount(minimumDepositNum ?? 0)

      if (!hooksTemplate.isRegisteredBorrower) {
        if (isTestnet) {
          const archControllerOwner = getMockArchControllerOwnerContract(
            hooksTemplate.chainId,
            activeSigner,
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
                pending: "Prerequisite: Registering borrower...",
                success: "Prerequisite: Borrower registered",
                error: "Prerequisite: Borrower registration failed",
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
        const preview = previewHooksTemplateDeployment(hooksTemplate, {
          ...x,
          maxTotalSupply,
          minimumDeposit,
          asset,
        })
        if (preview.status !== DeployMarketStatus.Ready) {
          const message = getDeployMarketPreviewError(preview.status)
          toastError(message)
          throw Error(message)
        }

        if (preview.marketKind === "standard") {
          const hooksFactory = getStandardHooksFactoryContract(
            hooksTemplate.chainId,
            activeSigner,
          )
          if (useGnosisMultiSend) {
            gnosisTransactions.push({
              data:
                preview.fn === "deployMarket"
                  ? hooksFactory.interface.encodeFunctionData(
                      "deployMarket",
                      preview.args,
                    )
                  : hooksFactory.interface.encodeFunctionData(
                      "deployMarketAndHooks",
                      preview.args,
                    ),
              to: hooksFactory.address,
              value: "0",
            })
          } else {
            const transaction = await (preview.fn === "deployMarket"
              ? hooksFactory.deployMarket(...preview.args)
              : hooksFactory.deployMarketAndHooks(...preview.args))
            return transaction.wait()
          }
        } else {
          const hooksFactory = getRevolvingHooksFactoryContract(
            hooksTemplate.chainId,
            activeSigner,
          )
          if (useGnosisMultiSend) {
            gnosisTransactions.push({
              data:
                preview.fn === "deployMarket"
                  ? hooksFactory.interface.encodeFunctionData(
                      "deployMarket",
                      preview.args,
                    )
                  : hooksFactory.interface.encodeFunctionData(
                      "deployMarketAndHooks",
                      preview.args,
                    ),
              to: hooksFactory.address,
              value: "0",
            })
          } else if (preview.fn === "deployMarket") {
            return (await hooksFactory.deployMarket(...preview.args)).wait()
          } else {
            return (
              await hooksFactory.deployMarketAndHooks(...preview.args)
            ).wait()
          }
        }

        if (!persistedDraft) {
          throw Error("No persisted Safe draft for market deployment")
        }
        return waitForSafeProposal({
          borrowerAddress,
          salt: marketParams.salt,
          predictedMarket,
          step: "market",
          clearOnSuccess: false,
          createProposal: () =>
            gnosisSafeSDK.txs.send({ txs: gnosisTransactions }),
        })
      }

      const receipt = await toastRequest(
        send(),
        getStepToastConfig(deploymentSteps, "market", {
          pending: "Deploying Market..",
          success: "Market Deployed Successfully!",
          error: "Market Deployment Failed.",
        }),
      )
      marketAddress = getDeployedMarketFromReceipt(receipt)
      if (marketAddress.toLowerCase() !== predictedMarket.toLowerCase()) {
        throw Error("Safe transaction deployed an unexpected market address")
      }
      setDeployed({
        salt: marketParams.salt,
        marketKind: marketParams.marketKind,
        fingerprint: deployFingerprint,
        market: marketAddress,
      })
      if (persistedDraft) {
        dispatch(
          markCreateMarketDraftDeployed({
            address: borrowerAddress,
            chainId: targetChainId,
            salt: marketParams.salt,
            deployedMarket: marketAddress,
          }),
        )
      }
    }

    await completeMarketSetup({
      borrowerAddress,
      draftId: draftId ?? "",
      salt: marketParams.salt,
      marketKind: marketParams.marketKind,
      marketAddress,
      transferAccess: marketParams.transferAccess,
      timeSigned,
      mlaTemplateId,
      mlaSignature,
      deployWrapper,
      deploymentSteps,
    })
  }

  const completeDeployedMarket = async (
    params: CompleteDeployedV2MarketParams,
  ) => {
    const activeSigner = await assertSignerContext(params.borrowerAddress)
    const draft = getMatchingDraft({
      borrowerAddress: params.borrowerAddress,
      draftId: params.draftId,
      salt: params.salt,
      predictedMarket: params.marketAddress,
    })
    if (
      !draft.deployedMarket ||
      draft.deployedMarket.toLowerCase() !== params.marketAddress.toLowerCase()
    ) {
      throw Error("The persisted market deployment is not ready for completion")
    }
    if ((await activeSigner.provider.getCode(params.marketAddress)) === "0x") {
      throw Error("The persisted market deployment has no on-chain code")
    }
    await completeMarketSetup({
      ...params,
      deploymentSteps: getDeploySteps({
        includeMockToken: false,
        includeMarket: false,
        includeWrapper: !!params.deployWrapper,
      }),
    })
  }

  const resumeSafeDeployment = async (
    params: CompleteDeployedV2MarketParams,
  ) => {
    const activeSigner = await assertSignerContext(params.borrowerAddress)
    if (!isConnectedToSafe || !gnosisSafeSDK) {
      throw Error("Connect the original Safe to resume deployment")
    }
    const draft = getMatchingDraft({
      borrowerAddress: params.borrowerAddress,
      draftId: params.draftId,
      salt: params.salt,
      predictedMarket: params.marketAddress,
    })
    if (draft.deployedMarket) {
      await completeDeployedMarket(params)
      return
    }
    const proposal = getCreateMarketSafeTransactionProposal({
      draft,
      salt: params.salt,
      predictedMarket: params.marketAddress,
      step: "market",
    })
    if (!proposal) {
      throw Error("No pending Safe market deployment was found")
    }

    const deploymentSteps = getDeploySteps({
      includeMockToken: false,
      includeWrapper: !!params.deployWrapper,
    })
    const receipt = await toastRequest(
      waitForSafeProposal({
        borrowerAddress: params.borrowerAddress,
        salt: params.salt,
        predictedMarket: params.marketAddress,
        step: "market",
        clearOnSuccess: false,
      }),
      getStepToastConfig(deploymentSteps, "market", {
        pending: "Waiting for Safe market deployment..",
        success: "Market Deployed Successfully!",
        error: "Market Deployment Failed.",
      }),
    )
    const deployedMarket = getDeployedMarketFromReceipt(receipt)
    if (deployedMarket.toLowerCase() !== params.marketAddress.toLowerCase()) {
      throw Error("Safe transaction deployed an unexpected market address")
    }
    if ((await activeSigner.provider.getCode(deployedMarket)) === "0x") {
      throw Error("Safe market deployment has no on-chain code")
    }
    dispatch(
      markCreateMarketDraftDeployed({
        address: params.borrowerAddress,
        chainId: targetChainId,
        salt: params.salt,
        deployedMarket,
      }),
    )
    await completeMarketSetup({ ...params, deploymentSteps })
  }

  const {
    mutate: runOperation,
    isPending: isDeploying,
    isSuccess,
    isError,
    error: deployError,
  } = useMutation<void, Error, DeployV2MarketOperation>({
    mutationFn: async (operation) => {
      if (operation.kind === "deploy") {
        await deployMarket(operation.params)
      } else if (operation.kind === "resumeSafeDeployment") {
        await resumeSafeDeployment(operation.params)
      } else {
        await completeDeployedMarket(operation.params)
      }
    },
    onSuccess: (_, variables) => {
      const borrowerAddress =
        variables.kind === "deploy"
          ? variables.params.hooksTemplate.signerAddress?.toLowerCase()
          : variables.params.borrowerAddress.toLowerCase()

      client.invalidateQueries({
        queryKey: QueryKeys.Borrower.GET_CONTROLLER(
          targetChainId,
          borrowerAddress,
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
      console.error("Market deployment failed", error)
    },
  })

  if (deployError?.message === "Failed to upload MLA selection") {
    console.log("Failed to upload MLA selection")
  }

  return {
    deployNewMarket: (params: DeployNewV2MarketParams) =>
      runOperation({ kind: "deploy", params }),
    resumeSafeDeployment: (params: CompleteDeployedV2MarketParams) =>
      runOperation({ kind: "resumeSafeDeployment", params }),
    completeDeployedMarket: (params: CompleteDeployedV2MarketParams) =>
      runOperation({ kind: "complete", params }),
    isDeploying,
    isSuccess,
    isError,
    deployError,
  }
}
