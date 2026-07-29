"use client"

import { randomBytes } from "crypto"

import { useCallback, useEffect, useMemo, useState } from "react"

import { Box, Button, Dialog, IconButton, Typography } from "@mui/material"
import SvgIcon from "@mui/material/SvgIcon"
import {
  DepositAccess,
  getDeploymentAddress,
  HooksKind,
  SupportedChainId,
  Token,
  TransferAccess,
  WithdrawalAccess,
} from "@wildcatfi/wildcat-sdk"
import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"
import { zeroAddress } from "viem"
import { useAccount } from "wagmi"

import { PageContainer } from "@/app/[locale]/borrower/create-market/style"
import { useGetBorrowerProfile } from "@/app/[locale]/borrower/profile/hooks/useGetBorrowerProfile"
import { BorrowerProfile } from "@/app/api/profiles/interface"
import CircledCheckBlue from "@/assets/icons/circledCheckBlue_icon.svg"
import CircledCrossRed from "@/assets/icons/circledCrossRed_icon.svg"
import Cross from "@/assets/icons/cross_icon.svg"
import Docs from "@/assets/icons/docs_icon.svg"
import { Loader } from "@/components/Loader"
import { toastError } from "@/components/Toasts"
import { DECLINE_MLA_ASSIGNMENT_MESSAGE } from "@/config/mla-rejection"
import { NETWORKS_BY_ID } from "@/config/network"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useEthersSigner } from "@/hooks/useEthersSigner"
import { useNetworkGate } from "@/hooks/useNetworkGate"
import { formatDate } from "@/lib/mla"
import { ROUTES } from "@/routes"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  CreateMarketSteps,
  setInitialCreateState,
  setCreatingStep,
} from "@/store/slices/createMarketSidebarSlice/createMarketSidebarSlice"
import {
  CreateMarketAssetSnapshot,
  CreateMarketSigningDraft,
  getCreateMarketDeploymentIdentity,
  getCreateMarketSigningDraftScope,
  hasCommittedCreateMarketDeployment,
  isCommittedCreateMarketDraftCompatible,
  isCreateMarketDraftCompatible,
  isCreateMarketSigningDraftExpired,
  markCreateMarketDraftDeployed,
  removeCreateMarketSigningDraft,
  saveCreateMarketSigningDraft,
} from "@/store/slices/createMarketSigningDraftsSlice/createMarketSigningDraftsSlice"
import { removePendingSafeMessage } from "@/store/slices/pendingSafeMessagesSlice/pendingSafeMessagesSlice"
import { COLORS } from "@/theme/colors"
import {
  getCreateMarketDeployRouting,
  hasCreateMarketDeploymentTarget,
} from "@/utils/createMarketDeploy"

import { BasicSetupForm } from "./components/Forms/BasicSetupForn"
import { LenderRestrictionsForm } from "./components/Forms/LenderRestrictionsForm"
import { MarketPolicyForm } from "./components/Forms/MarketPolicyForm"
import { MlaForm } from "./components/Forms/MLAForm"
import { WrapperForm } from "./components/Forms/WrapperForm"
import { GlossarySidebar } from "./components/GlossarySidebar"
import { StepCounterTitle } from "./components/StepCounterTitle"
import { useTokensList } from "./components/UnderlyingAssetSelect/hooks/useTokensList"
import {
  FinalDialogContainer,
  DeployButtonContainer,
  DeployCloseButtonIcon,
  DeployContentContainer,
  DeployHeaderContainer,
  DeployMainContainer,
  DeploySubtitle,
  DeployTypoBox,
} from "./deploy-style"
import { getCreateMarketFlowVariant } from "./flow-variants"
import {
  CompleteDeployedV2MarketParams,
  DeployNewV2MarketParams,
  useDeployV2Market,
} from "./hooks/useDeployV2Market"
import { useNewMarketForm } from "./hooks/useNewMarketForm"
import { useNewMarketHooksData } from "./hooks/useNewMarketHooksData"
import { useTokenMetadata } from "./hooks/useTokenMetadata"
import { getMlaFromForm } from "../hooks/mla/usePreviewMla"
import {
  SignMlaFromFormInputs,
  useSignMla,
} from "../hooks/mla/useSignBorrowerMla"

const getNewMarketSalt = (address: string) =>
  `${address}${randomBytes(12).toString("hex")}`

const getCreateMarketSigningDraftId = (
  address: string,
  chainId: number,
  timeSigned: number,
  salt: string,
) =>
  `v2:${chainId}:${address.toLowerCase()}:${timeSigned}:${salt.toLowerCase()}`

const hasSameMlaProfile = (
  first: BorrowerProfile | undefined,
  second: BorrowerProfile | undefined,
) =>
  !!first &&
  !!second &&
  first.address.toLowerCase() === second.address.toLowerCase() &&
  first.name === second.name &&
  first.jurisdiction === second.jurisdiction &&
  first.physicalAddress === second.physicalAddress &&
  first.entityKind === second.entityKind

const getAssetSnapshot = (asset: Token): CreateMarketAssetSnapshot => ({
  chainId: asset.chainId,
  address: asset.address,
  name: asset.name,
  symbol: asset.symbol,
  decimals: asset.decimals,
  isMock: asset.isMock,
})

const DEFAULT_POLICY_OPTION = {
  id: "createNewPolicy",
  label: "Create New Policy",
  value: "createNewPolicy",
} as const

const HOOKS_KIND_LABELS: Record<HooksKind, string> = {
  [HooksKind.OpenTerm]: "Open Term",
  [HooksKind.FixedTerm]: "Fixed Term",
  [HooksKind.PeriodicTerm]: "Periodic Term",
  [HooksKind.Unknown]: "Unknown Term",
}

export default function CreateMarketPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const dispatch = useAppDispatch()
  const { address } = useAccount()
  const signer = useEthersSigner()
  const { data: borrowerProfile, refetch: refetchBorrowerProfile } =
    useGetBorrowerProfile(address)
  const { isTestnet } = useCurrentNetwork()
  const { touGateState, isAgreementFetching, refetchAgreementStatus } =
    useNetworkGate({ agreementParty: "Borrower" })
  const { chainId: targetChainId } = useAppSelector(
    (state) => state.selectedNetwork,
  )
  const signingDraftScope = address
    ? getCreateMarketSigningDraftScope(address, targetChainId)
    : undefined
  const {
    signingDraft,
    signingDraftIdKey,
    signingDraftsRehydrated,
    pendingSafeMessages,
    pendingSafeMessagesRehydrated,
  } = useAppSelector((state) => ({
    signingDraft: signingDraftScope
      ? state.createMarketSigningDrafts.records[signingDraftScope]
      : undefined,
    signingDraftIdKey: Object.values(state.createMarketSigningDrafts.records)
      .map(({ id }) => id)
      .sort()
      .join("|"),
    signingDraftsRehydrated:
      // eslint-disable-next-line no-underscore-dangle
      state.createMarketSigningDrafts._persist?.rehydrated ?? false,
    pendingSafeMessages: state.pendingSafeMessages.records,
    pendingSafeMessagesRehydrated:
      // eslint-disable-next-line no-underscore-dangle
      state.pendingSafeMessages._persist?.rehydrated ?? false,
  }))

  const currentStep = useAppSelector(
    (state) => state.createMarketSidebar.currentStep,
  )
  const steps = useAppSelector((state) => state.createMarketSidebar.steps)
  const currentNumber = steps.find((step) => step.step === currentStep)?.number

  const newMarketForm = useNewMarketForm(isTestnet ?? false)
  const implementationTypeWatch = newMarketForm.watch("implementationType")
  const flowVariant = getCreateMarketFlowVariant(implementationTypeWatch)
  const marketTypeWatch = newMarketForm.watch("marketType")
  const glossaryItems = flowVariant.getGlossaryItems(
    currentStep,
    t,
    marketTypeWatch,
  )

  const {
    selectedHooksInstance,
    selectedHooksTemplate,
    hooksInstances,
    hooksTemplates,
    isFetched: hooksDataFetched,
  } = useNewMarketHooksData(newMarketForm, {
    preserveUnavailablePolicy: hasCommittedCreateMarketDeployment(signingDraft),
  })

  const {
    deployNewMarket,
    resumeSafeDeployment,
    completeDeployedMarket,
    isDeploying,
    isSuccess,
    isError,
  } = useDeployV2Market()

  const [finalOpen, setFinalOpen] = useState<boolean>(false)
  const [activeDraftId, setActiveDraftId] = useState<string>()
  const [draftToResumeId, setDraftToResumeId] = useState<string>()
  const [signatureRequested, setSignatureRequested] = useState(false)
  const [isValidatingSignature, setIsValidatingSignature] = useState(false)

  const [timeSigned, setTimeSigned] = useState(0)
  const [salt, setSalt] = useState<string>("")
  useEffect(() => {
    setTimeSigned(Date.now())
    setSalt(address ? getNewMarketSalt(address) : "")
    setActiveDraftId(undefined)
    setDraftToResumeId(undefined)
    setSignatureRequested(false)
  }, [address, targetChainId])

  const {
    data: mlaSignature,
    mutate: signMla,
    isPending: isSigning,
    reset: resetMlaSignature,
    marketAddress,
    isSafeSigning,
    completeSafeMessage,
  } = useSignMla(salt, implementationTypeWatch)
  const committedSigningDraft = hasCommittedCreateMarketDeployment(signingDraft)
    ? signingDraft
    : undefined
  const canCompleteDeployedMarket = !!committedSigningDraft?.deployedMarket
  const effectiveMarketAddress =
    committedSigningDraft?.deploymentIdentity.predictedMarket ?? marketAddress

  const handleClickClose = () => {
    setFinalOpen(false)
  }

  const policyOptions = useMemo(
    () => [
      DEFAULT_POLICY_OPTION,
      ...(hooksInstances?.map((instance) => ({
        id: instance.address,
        label: instance.name || "Unnamed Policy",
        badge: HOOKS_KIND_LABELS[instance.kind],
        value: instance.address,
      })) ?? []),
    ],
    [hooksInstances],
  )

  const assetWatch = newMarketForm.watch("asset")
  const { data: assetData } = useTokenMetadata({
    address: assetWatch?.toLowerCase(),
  })

  const { handleChange, handleSelect, query, setQuery, isLoading, tokens } =
    useTokensList()

  const [tokenAsset, setTokenAsset] = useState<Token | undefined>()

  useEffect(() => {
    setTokenAsset(assetData)
  }, [assetData])

  useEffect(() => {
    if (!signingDraftsRehydrated || !pendingSafeMessagesRehydrated) return

    const validDraftIds = new Set(
      signingDraftIdKey ? signingDraftIdKey.split("|") : [],
    )
    Object.values(pendingSafeMessages)
      .filter(
        (record) =>
          record.flow === "borrower-market-mla" &&
          (record.context?.draftVersion !== 2 ||
            typeof record.context?.draftId !== "string" ||
            !validDraftIds.has(record.context.draftId)),
      )
      .forEach((record) => dispatch(removePendingSafeMessage(record.id)))
  }, [
    dispatch,
    pendingSafeMessages,
    pendingSafeMessagesRehydrated,
    signingDraftIdKey,
    signingDraftsRehydrated,
  ])

  const getPendingMessageForDraft = useCallback(
    (draftId: string) =>
      Object.values(pendingSafeMessages)
        .filter(
          (record) =>
            record.flow === "borrower-market-mla" &&
            record.context?.draftVersion === 2 &&
            record.context.draftId === draftId,
        )
        .sort((a, b) => b.createdAt - a.createdAt)[0],
    [pendingSafeMessages],
  )

  const removePendingMessagesForDraft = useCallback(
    (draftId: string | undefined) => {
      if (!draftId) return
      Object.values(pendingSafeMessages)
        .filter(
          (record) =>
            record.flow === "borrower-market-mla" &&
            record.context?.draftId === draftId,
        )
        .forEach((record) => dispatch(removePendingSafeMessage(record.id)))
    },
    [dispatch, pendingSafeMessages],
  )

  const removeDraftRecords = useCallback(
    (draftId: string | undefined) => {
      if (!address || !draftId) return
      dispatch(
        removeCreateMarketSigningDraft({
          address,
          chainId: targetChainId,
          id: draftId,
        }),
      )
      removePendingMessagesForDraft(draftId)
    },
    [address, dispatch, removePendingMessagesForDraft, targetChainId],
  )

  const startFreshSigningContext = useCallback(() => {
    resetMlaSignature()
    setSignatureRequested(false)
    setActiveDraftId(undefined)
    setDraftToResumeId(undefined)
    setTimeSigned(Date.now())
    setSalt(address ? getNewMarketSalt(address) : "")
  }, [address, resetMlaSignature])

  const restartCommittedSigningContext = useCallback(
    (
      draft: CreateMarketSigningDraft,
      refreshedBorrowerProfile: BorrowerProfile = draft.borrowerProfile,
    ) => {
      if (!address || !hasCommittedCreateMarketDeployment(draft)) return false

      const nextTimeSigned = Math.max(Date.now(), draft.timeSigned + 1)
      const nextDraftId = getCreateMarketSigningDraftId(
        address,
        targetChainId,
        nextTimeSigned,
        draft.salt,
      )

      removePendingMessagesForDraft(draft.id)
      dispatch(
        saveCreateMarketSigningDraft({
          ...draft,
          id: nextDraftId,
          timeSigned: nextTimeSigned,
          borrowerProfile: refreshedBorrowerProfile,
          createdAt: Date.now(),
        }),
      )
      resetMlaSignature()
      setSignatureRequested(false)
      setActiveDraftId(nextDraftId)
      setDraftToResumeId(undefined)
      setTimeSigned(nextTimeSigned)
      setSalt(draft.salt)
      newMarketForm.reset(draft.formValues)
      dispatch(setCreatingStep(CreateMarketSteps.CONFIRM))
      return true
    },
    [
      address,
      dispatch,
      newMarketForm,
      removePendingMessagesForDraft,
      resetMlaSignature,
      targetChainId,
    ],
  )

  const getCurrentMlaBorrowerProfile = useCallback(
    async (draft: CreateMarketSigningDraft) => {
      if (draft.formValues.mla === "noMLA") return draft.borrowerProfile

      const profileResult = await refetchBorrowerProfile()
      if (profileResult.error || !profileResult.data) {
        toastError("Failed to refresh borrower profile. Please try again.")
        return undefined
      }
      return profileResult.data
    },
    [refetchBorrowerProfile],
  )

  const handleDiscardSignature = useCallback(
    (refreshedBorrowerProfile?: BorrowerProfile) => {
      const committedDraft =
        signingDraft &&
        signingDraft.id === activeDraftId &&
        hasCommittedCreateMarketDeployment(signingDraft)
          ? signingDraft
          : undefined
      if (committedDraft) {
        restartCommittedSigningContext(
          committedDraft,
          refreshedBorrowerProfile ?? committedDraft.borrowerProfile,
        )
        return false
      }

      removeDraftRecords(activeDraftId)
      startFreshSigningContext()
      return true
    },
    [
      activeDraftId,
      removeDraftRecords,
      restartCommittedSigningContext,
      signingDraft,
      startFreshSigningContext,
    ],
  )

  useEffect(() => {
    if (
      activeDraftId &&
      !draftToResumeId &&
      currentStep !== CreateMarketSteps.CONFIRM
    ) {
      handleDiscardSignature()
    }
  }, [activeDraftId, currentStep, draftToResumeId, handleDiscardSignature])

  const handleDiscardSavedDraft = useCallback(async () => {
    if (hasCommittedCreateMarketDeployment(signingDraft)) {
      const refreshedBorrowerProfile =
        await getCurrentMlaBorrowerProfile(signingDraft)
      if (!refreshedBorrowerProfile) return
      toastError(
        signingDraft?.deployedMarket
          ? "This market is already deployed. Complete its agreement before creating another market."
          : "This market deployment is already proposed in Safe. Complete or cancel that proposal before creating another market.",
      )
      restartCommittedSigningContext(signingDraft, refreshedBorrowerProfile)
      return
    }
    removeDraftRecords(signingDraft?.id)
    startFreshSigningContext()
    newMarketForm.reset()
    dispatch(setInitialCreateState())
  }, [
    dispatch,
    getCurrentMlaBorrowerProfile,
    newMarketForm,
    removeDraftRecords,
    restartCommittedSigningContext,
    signingDraft,
    startFreshSigningContext,
  ])

  const createTokenFromDraft = useCallback(
    (draft: CreateMarketSigningDraft) => {
      if (!signer) return undefined
      return new Token(
        draft.asset.chainId as SupportedChainId,
        draft.asset.address,
        draft.asset.name,
        draft.asset.symbol,
        draft.asset.decimals,
        draft.asset.isMock,
        signer,
      )
    },
    [signer],
  )

  const handleSignMla = useCallback(
    (args: SignMlaFromFormInputs) => {
      const resumedDraft =
        signingDraft?.id === activeDraftId ? signingDraft : undefined
      const signingBorrowerProfile =
        resumedDraft?.borrowerProfile ?? args.borrowerProfile
      const signingAsset = resumedDraft
        ? createTokenFromDraft(resumedDraft)
        : args.asset
      const resumedCommittedDraft = hasCommittedCreateMarketDeployment(
        resumedDraft,
      )
        ? resumedDraft
        : undefined

      setSignatureRequested(true)
      if (!signer || signer.chainId !== targetChainId) {
        setSignatureRequested(false)
        toastError("Wallet network does not match selected network.")
        return
      }
      if (
        !hasCreateMarketDeploymentTarget({
          hasSelectedHooksTemplate: !!selectedHooksTemplate,
          hasCommittedDeployment: !!resumedCommittedDraft,
        })
      ) {
        setSignatureRequested(false)
        toastError("Market signing is not ready. Please try again.")
        return
      }
      if (!isSafeSigning) {
        signMla(args)
        return
      }
      if (
        !address ||
        !signingBorrowerProfile ||
        !signingAsset ||
        !salt ||
        !timeSigned ||
        !effectiveMarketAddress ||
        (!resumedCommittedDraft && !selectedHooksTemplate)
      ) {
        setSignatureRequested(false)
        toastError("Market signing is not ready. Please try again.")
        return
      }

      const draftId =
        resumedDraft?.id ??
        getCreateMarketSigningDraftId(address, targetChainId, timeSigned, salt)

      if (!resumedDraft && selectedHooksTemplate) {
        const formValues = { ...args.form.getValues() }
        dispatch(
          saveCreateMarketSigningDraft({
            version: 2,
            walletKind: "Safe",
            id: draftId,
            chainId: targetChainId,
            address: address.toLowerCase(),
            salt,
            timeSigned,
            formValues,
            borrowerProfile: signingBorrowerProfile,
            asset: getAssetSnapshot(signingAsset),
            deploymentIdentity: getCreateMarketDeploymentIdentity({
              formValues,
              predictedMarket: effectiveMarketAddress,
              hooksTemplate: selectedHooksTemplate,
              hooksInstanceAddress: selectedHooksInstance?.address,
            }),
            createdAt: Date.now(),
          }),
        )
      }

      setActiveDraftId(draftId)
      const pendingMessage = getPendingMessageForDraft(draftId)
      signMla({
        ...args,
        borrowerProfile: signingBorrowerProfile,
        asset: signingAsset,
        draftId,
        resumeMessage: pendingMessage?.message,
        marketIdentity: resumedCommittedDraft
          ? {
              marketAddress:
                resumedCommittedDraft.deploymentIdentity.predictedMarket,
              hooksFactory:
                resumedCommittedDraft.deploymentIdentity.hooksFactory,
            }
          : undefined,
      })
    },
    [
      activeDraftId,
      address,
      createTokenFromDraft,
      dispatch,
      getPendingMessageForDraft,
      isSafeSigning,
      effectiveMarketAddress,
      salt,
      selectedHooksInstance?.address,
      selectedHooksTemplate,
      signMla,
      signer,
      signingDraft,
      targetChainId,
      timeSigned,
    ],
  )

  const handleResumeSavedDraft = useCallback(async () => {
    if (!signingDraft) return
    if (!signer || signer.chainId !== targetChainId) {
      toastError("Switch the wallet to the saved draft's network to resume.")
      return
    }
    let draftToResume = signingDraft
    if (!hasCommittedCreateMarketDeployment(draftToResume)) {
      try {
        const { predictedMarket } = draftToResume.deploymentIdentity
        if ((await signer.provider.getCode(predictedMarket)) !== "0x") {
          dispatch(
            markCreateMarketDraftDeployed({
              address: draftToResume.address,
              chainId: draftToResume.chainId,
              salt: draftToResume.salt,
              deployedMarket: predictedMarket,
            }),
          )
          draftToResume = {
            ...draftToResume,
            deployedMarket: predictedMarket,
          }
        }
      } catch {
        // Best-effort recovery. A normal pre-deployment resume still validates
        // the currently deployable policy below.
      }
    }
    const refreshedBorrowerProfile =
      await getCurrentMlaBorrowerProfile(draftToResume)
    if (!refreshedBorrowerProfile) return
    const borrowerProfileChanged = !hasSameMlaProfile(
      draftToResume.borrowerProfile,
      refreshedBorrowerProfile,
    )

    if (isCreateMarketSigningDraftExpired(draftToResume)) {
      toastError(
        "The saved signing draft has expired. Review and sign the market agreement again.",
      )
      if (hasCommittedCreateMarketDeployment(draftToResume)) {
        restartCommittedSigningContext(draftToResume, refreshedBorrowerProfile)
        return
      }
      removeDraftRecords(draftToResume.id)
      startFreshSigningContext()
      newMarketForm.reset(draftToResume.formValues)
      dispatch(setCreatingStep(CreateMarketSteps.CONFIRM))
      return
    }
    if (borrowerProfileChanged) {
      toastError(
        "Borrower legal details changed. Review and sign the market agreement again.",
      )
      if (hasCommittedCreateMarketDeployment(draftToResume)) {
        restartCommittedSigningContext(draftToResume, refreshedBorrowerProfile)
        return
      }
      removeDraftRecords(draftToResume.id)
      startFreshSigningContext()
      newMarketForm.reset(draftToResume.formValues)
      dispatch(setCreatingStep(CreateMarketSteps.CONFIRM))
      return
    }

    newMarketForm.reset(draftToResume.formValues)
    setSalt(draftToResume.salt)
    setTimeSigned(draftToResume.timeSigned)
    setActiveDraftId(draftToResume.id)
    setDraftToResumeId(draftToResume.id)
    setSignatureRequested(true)
    dispatch(setCreatingStep(CreateMarketSteps.CONFIRM))
  }, [
    dispatch,
    getCurrentMlaBorrowerProfile,
    newMarketForm,
    removeDraftRecords,
    restartCommittedSigningContext,
    signer,
    signingDraft,
    startFreshSigningContext,
    targetChainId,
  ])

  useEffect(() => {
    if (
      !signingDraft ||
      signingDraft.id !== draftToResumeId ||
      !address ||
      !effectiveMarketAddress ||
      !assetData
    ) {
      return
    }

    const committedDraft = hasCommittedCreateMarketDeployment(signingDraft)
    let isCompatible: boolean
    if (committedDraft) {
      isCompatible = isCommittedCreateMarketDraftCompatible({
        draft: signingDraft,
        formValues: newMarketForm.getValues(),
        asset: getAssetSnapshot(assetData),
        address,
        chainId: targetChainId,
        salt,
        predictedMarket: effectiveMarketAddress,
      })
    } else {
      const storedInstance = signingDraft.deploymentIdentity.hooksInstance
        ? hooksInstances.find(
            (instance) =>
              instance.address.toLowerCase() ===
              signingDraft.deploymentIdentity.hooksInstance,
          )
        : undefined
      const storedTemplate =
        storedInstance?.hooksTemplate ??
        hooksTemplates.find(
          (template) =>
            template.hooksFactory.toLowerCase() ===
              signingDraft.deploymentIdentity.hooksFactory &&
            template.hooksTemplate.toLowerCase() ===
              signingDraft.deploymentIdentity.hooksTemplate &&
            template.kind === signingDraft.deploymentIdentity.hooksKind,
        )
      if (!storedTemplate) {
        if (!hooksDataFetched) return
        setDraftToResumeId(undefined)
        setSignatureRequested(false)
        toastError(
          "The saved policy is no longer available for V2.5 deployment. Review the market settings again.",
        )
        removeDraftRecords(signingDraft.id)
        startFreshSigningContext()
        return
      }
      isCompatible = isCreateMarketDraftCompatible({
        draft: signingDraft,
        formValues: newMarketForm.getValues(),
        asset: getAssetSnapshot(assetData),
        deploymentIdentity: getCreateMarketDeploymentIdentity({
          formValues: newMarketForm.getValues(),
          predictedMarket: effectiveMarketAddress,
          hooksTemplate: storedTemplate,
          hooksInstanceAddress: storedInstance?.address,
        }),
        address,
        chainId: targetChainId,
      })
    }

    if (!isCompatible) {
      setDraftToResumeId(undefined)
      setSignatureRequested(false)
      toastError(
        "The saved market no longer matches the current V2.5 deployment context. Review and sign it again.",
      )
      if (!committedDraft) {
        removeDraftRecords(signingDraft.id)
        startFreshSigningContext()
      }
      return
    }

    const signingAsset = createTokenFromDraft(signingDraft)
    if (!signingAsset) return

    setDraftToResumeId(undefined)
    const pendingMessage = getPendingMessageForDraft(signingDraft.id)
    signMla({
      form: newMarketForm,
      timeSigned: signingDraft.timeSigned,
      borrowerProfile: signingDraft.borrowerProfile,
      asset: signingAsset,
      draftId: signingDraft.id,
      resumeMessage: pendingMessage?.message,
      marketIdentity: committedDraft
        ? {
            marketAddress: signingDraft.deploymentIdentity.predictedMarket,
            hooksFactory: signingDraft.deploymentIdentity.hooksFactory,
          }
        : undefined,
    })
  }, [
    assetData,
    address,
    createTokenFromDraft,
    draftToResumeId,
    getPendingMessageForDraft,
    hooksDataFetched,
    hooksInstances,
    hooksTemplates,
    effectiveMarketAddress,
    newMarketForm,
    removeDraftRecords,
    signMla,
    signingDraft,
    salt,
    startFreshSigningContext,
    targetChainId,
  ])

  const showSigningDraftDialog =
    signingDraftsRehydrated &&
    pendingSafeMessagesRehydrated &&
    isSafeSigning &&
    !!signingDraft &&
    signingDraft.version === 2 &&
    signingDraft.walletKind === "Safe" &&
    signingDraft.id !== activeDraftId

  const handleDeployMarket = newMarketForm.handleSubmit(() => {
    const marketParams = newMarketForm.getValues()
    const deployRouting = getCreateMarketDeployRouting({
      implementationType: marketParams.implementationType,
      commitmentFeePercent: marketParams.commitmentFeePercent,
    })

    console.log(`Deploying market with MLA template ID: ${marketParams.mla}`)

    const activeSafeDraft =
      isSafeSigning &&
      signingDraft?.id === activeDraftId &&
      signingDraft?.version === 2
        ? signingDraft
        : undefined
    if (touGateState !== "unblocked" && !activeSafeDraft?.deployedMarket) {
      toastError("Accept the current Terms of Use before creating a market.")
      return
    }
    let transferAccess = TransferAccess.Open
    if (marketParams.disableTransfers) {
      transferAccess = TransferAccess.Disabled
    } else if (marketParams.transferRequiresAccess) {
      transferAccess = TransferAccess.RequiresCredential
    }
    const mlaTemplateId =
      marketParams.mla !== undefined && marketParams.mla !== "noMLA"
        ? Number(marketParams.mla)
        : undefined

    if (
      activeSafeDraft &&
      hasCommittedCreateMarketDeployment(activeSafeDraft) &&
      address &&
      effectiveMarketAddress &&
      mlaSignature
    ) {
      const completionParams: CompleteDeployedV2MarketParams = {
        borrowerAddress: address,
        draftId: activeSafeDraft.id,
        salt: activeSafeDraft.salt,
        marketKind: activeSafeDraft.deploymentIdentity.marketKind,
        marketAddress: effectiveMarketAddress,
        transferAccess,
        timeSigned,
        mlaTemplateId,
        mlaSignature: mlaSignature.signature as string,
        deployWrapper: marketParams.deployWrapper,
      }
      if (activeSafeDraft.deployedMarket) {
        completeDeployedMarket(completionParams)
      } else {
        resumeSafeDeployment(completionParams)
      }
      return
    }

    if (assetData && tokenAsset && selectedHooksTemplate && mlaSignature) {
      const realParams: DeployNewV2MarketParams = {
        timeSigned,
        mlaTemplateId,
        mlaSignature: mlaSignature.signature as string,
        marketKind: deployRouting.marketKind,
        namePrefix: `${marketParams.namePrefix.trimEnd()} `,
        symbolPrefix: marketParams.symbolPrefix,
        annualInterestBips: Number(marketParams.annualInterestBips) * 100,
        delinquencyFeeBips: Number(marketParams.delinquencyFeeBips) * 100,
        reserveRatioBips: Number(marketParams.reserveRatioBips) * 100,
        delinquencyGracePeriod:
          Number(marketParams.delinquencyGracePeriod) * 60 * 60,
        withdrawalBatchDuration:
          Number(marketParams.withdrawalBatchDuration) * 60 * 60,
        maxTotalSupply: marketParams.maxTotalSupply,
        assetData: tokenAsset,
        depositAccess: marketParams.depositRequiresAccess
          ? DepositAccess.RequiresCredential
          : DepositAccess.Open,
        withdrawalAccess: marketParams.withdrawalRequiresAccess
          ? WithdrawalAccess.RequiresCredential
          : WithdrawalAccess.Open,
        transferAccess,
        hooksTemplate: selectedHooksTemplate,
        hooksInstanceName: marketParams.policyName,
        salt,
        hooksAddress: selectedHooksInstance?.address,
        // @todo proper solution
        existingProviders:
          marketParams.accessControl === "defaultPullProvider"
            ? [
                {
                  providerAddress: getDeploymentAddress(
                    targetChainId,
                    "OpenAccessRoleProvider",
                  ),
                  timeToLive: 90 * 86_400,
                },
              ]
            : [],
        newProviderInputs: [],
        roleProviderFactory: zeroAddress,
        minimumDeposit: marketParams.minimumDeposit,
        deployWrapper: marketParams.deployWrapper,
        draftId: activeSafeDraft?.id,
        ...(marketParams.marketType === "fixedTerm"
          ? {
              allowClosureBeforeTerm: !!marketParams.allowClosureBeforeTerm,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              fixedTermEndTime: marketParams.fixedTermEndTime as any,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              allowTermReduction: marketParams.allowTermReduction as any,
            }
          : {}),
        ...(marketParams.marketType === "periodicTerm"
          ? {
              firstWithdrawalWindowStart: Number(
                marketParams.firstWithdrawalWindowStart,
              ),
              periodDuration: Number(marketParams.periodDuration),
              withdrawalWindowDuration: Number(
                marketParams.withdrawalWindowDuration,
              ),
            }
          : {}),
        ...(deployRouting.marketKind === "revolving"
          ? { commitmentFeeBips: deployRouting.commitmentFeeBips }
          : {}),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any

      // console.log(`--- MARKET PARAMS ---`)
      // console.log(realParams)
      // console.log(`--- END MARKET PARAMS ---`)
      deployNewMarket(realParams)
    }
  })

  const handleClickDeploy = async () => {
    const activeSafeDraft =
      isSafeSigning &&
      signingDraft?.id === activeDraftId &&
      signingDraft?.version === 2
        ? signingDraft
        : undefined
    const activeCommittedDraft = hasCommittedCreateMarketDeployment(
      activeSafeDraft,
    )
      ? activeSafeDraft
      : undefined
    if (touGateState !== "unblocked" && !activeCommittedDraft?.deployedMarket) {
      return
    }
    if (
      !assetData ||
      !tokenAsset ||
      (!selectedHooksTemplate && !activeCommittedDraft) ||
      !mlaSignature?.message ||
      !signer ||
      !address ||
      !effectiveMarketAddress
    ) {
      return
    }
    if (signer.chainId !== targetChainId) {
      toastError("Wallet network does not match selected network.")
      return
    }

    setIsValidatingSignature(true)
    try {
      const formValues = newMarketForm.getValues()

      if (isSafeSigning && !activeSafeDraft) {
        throw new Error("The Safe signing draft is no longer active")
      }
      if (
        activeSafeDraft &&
        !(activeCommittedDraft
          ? isCommittedCreateMarketDraftCompatible({
              draft: activeCommittedDraft,
              formValues,
              asset: getAssetSnapshot(assetData),
              address,
              chainId: targetChainId,
              salt,
              predictedMarket: effectiveMarketAddress,
            })
          : selectedHooksTemplate &&
            isCreateMarketDraftCompatible({
              draft: activeSafeDraft,
              formValues,
              asset: getAssetSnapshot(assetData),
              deploymentIdentity: getCreateMarketDeploymentIdentity({
                formValues,
                predictedMarket: effectiveMarketAddress,
                hooksTemplate: selectedHooksTemplate,
                hooksInstanceAddress: selectedHooksInstance?.address,
              }),
              address,
              chainId: targetChainId,
            }))
      ) {
        toastError(
          "Market deployment details changed. Review and sign the market agreement again.",
        )
        handleDiscardSignature()
        return
      }

      const selectedMla = formValues.mla
      let currentMessage: string
      let refreshedBorrowerProfile: BorrowerProfile | undefined

      if (selectedMla === "noMLA") {
        currentMessage = DECLINE_MLA_ASSIGNMENT_MESSAGE.replace(
          "{{market}}",
          effectiveMarketAddress.toLowerCase(),
        ).replace("{{timeSigned}}", formatDate(timeSigned)!)
      } else {
        const profileResult = await refetchBorrowerProfile()
        if (profileResult.error || !profileResult.data) {
          throw new Error("Failed to refresh borrower profile")
        }
        refreshedBorrowerProfile = profileResult.data
        const currentMla = await getMlaFromForm(
          signer,
          newMarketForm,
          Number(selectedMla),
          timeSigned,
          profileResult.data,
          tokenAsset,
          salt,
          formValues.implementationType,
          NETWORKS_BY_ID[targetChainId as SupportedChainId],
          activeCommittedDraft
            ? {
                marketAddress:
                  activeCommittedDraft.deploymentIdentity.predictedMarket,
                hooksFactory:
                  activeCommittedDraft.deploymentIdentity.hooksFactory,
              }
            : undefined,
        )
        currentMessage = currentMla.message
      }

      if (currentMessage !== mlaSignature.message) {
        toastError(
          "Market or borrower details changed. Review and sign the market agreement again.",
        )
        handleDiscardSignature(refreshedBorrowerProfile)
        return
      }

      console.log(`clicked deploy`)
      setFinalOpen(true)
      handleDeployMarket()
    } catch {
      setFinalOpen(false)
      toastError("Couldn't validate the market agreement. Please try again.")
    } finally {
      setIsValidatingSignature(false)
    }
  }

  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [showErrorPopup, setShowErrorPopup] = useState(false)

  useEffect(() => {
    if (isError) {
      setShowErrorPopup(true)
    }
    if (isSuccess) {
      completeSafeMessage(mlaSignature?.pendingSafeMessageId)
      removeDraftRecords(activeDraftId)
      setActiveDraftId(undefined)
      setSignatureRequested(false)
      setShowSuccessPopup(true)
    }
  }, [
    activeDraftId,
    completeSafeMessage,
    isError,
    isSuccess,
    mlaSignature?.pendingSafeMessageId,
    removeDraftRecords,
  ])

  const handleResetModal = () => {
    setShowErrorPopup(false)
  }

  const handleGoToMarkets = () => {
    router.push(`${ROUTES.borrower.root}`)
  }

  useEffect(() => {
    newMarketForm.reset()
    dispatch(setInitialCreateState())
  }, [])

  if (touGateState === "unknown" && !canCompleteDeployedMarket) {
    return (
      <Box
        sx={{
          ...PageContainer,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px",
        }}
      >
        {isAgreementFetching ? (
          <Loader />
        ) : (
          <>
            <Typography variant="text2" color={COLORS.santasGrey}>
              Couldn&apos;t verify your Terms of Use status.
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={() => refetchAgreementStatus()}
            >
              Retry
            </Button>
          </>
        )}
      </Box>
    )
  }

  if (touGateState === "blocked" && !canCompleteDeployedMarket) {
    return (
      <Box sx={PageContainer}>
        <Box
          sx={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "24px",
            padding: "40px",
            paddingRight: "307px",
            paddingBottom: "160px",
          }}
        >
          <Box
            sx={{
              width: "52px",
              height: "52px",
              borderRadius: "14px",
              backgroundColor: COLORS.glitter,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <SvgIcon
              sx={{
                fontSize: "26px",
                "& path": { stroke: COLORS.ultramarineBlue },
              }}
            >
              <Docs />
            </SvgIcon>
          </Box>
          <Typography variant="title2" fontWeight={600} textAlign="center">
            Terms of Use update required
          </Typography>
          <Typography
            variant="text2"
            color={COLORS.santasGrey}
            textAlign="center"
            sx={{ maxWidth: "440px", marginTop: "-8px" }}
          >
            Creating new markets is paused until you accept the current Terms of
            Use. Your existing markets and withdrawals are unaffected.
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={() => router.push(ROUTES.borrower.agreement)}
            sx={{ minWidth: "220px" }}
          >
            Review Terms of Use
          </Button>
        </Box>
      </Box>
    )
  }

  return (
    <Box sx={PageContainer}>
      <Box
        sx={{
          width: "100%",
          padding: "40px 100px 0",
        }}
      >
        <StepCounterTitle current={currentNumber} total={steps.length - 1} />

        {currentStep === CreateMarketSteps.POLICY && (
          <MarketPolicyForm
            form={newMarketForm}
            policyOptions={policyOptions}
            isTestnet={isTestnet ?? false}
          />
        )}

        {currentStep === CreateMarketSteps.BASIC && (
          <BasicSetupForm
            form={newMarketForm}
            tokenAsset={tokenAsset}
            tokens={tokens}
            isLoading={isLoading}
            setQuery={setQuery}
            query={query}
            handleSelect={handleSelect}
            handleChange={handleChange}
          />
        )}

        {currentStep === CreateMarketSteps.MLA && (
          <MlaForm form={newMarketForm} />
        )}

        {currentStep === CreateMarketSteps.FINANCIAL && (
          <flowVariant.FinancialForm
            form={newMarketForm}
            tokenAsset={tokenAsset}
          />
        )}

        {currentStep === CreateMarketSteps.LRESTRICTIONS && (
          <LenderRestrictionsForm form={newMarketForm} />
        )}

        {currentStep === CreateMarketSteps.WRAPPER && (
          <WrapperForm form={newMarketForm} />
        )}

        {currentStep === CreateMarketSteps.CONFIRM && (
          <flowVariant.ConfirmationForm
            form={newMarketForm}
            tokenAsset={tokenAsset}
            borrowerProfile={borrowerProfile}
            handleDeploy={handleClickDeploy}
            salt={salt}
            timeSigned={timeSigned}
            onClickSign={handleSignMla}
            onDiscardSignature={handleDiscardSignature}
            signatureRequested={signatureRequested}
            isSigning={isSigning}
            isDeployReady={
              !!assetData &&
              !!tokenAsset &&
              hasCreateMarketDeploymentTarget({
                hasSelectedHooksTemplate: !!selectedHooksTemplate,
                hasCommittedDeployment:
                  signingDraft?.id === activeDraftId &&
                  hasCommittedCreateMarketDeployment(signingDraft),
              }) &&
              !isValidatingSignature
            }
            mlaSignature={mlaSignature}
          />
        )}

        <Dialog open={showSigningDraftDialog} maxWidth="xs" fullWidth>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: "20px",
              padding: "24px",
            }}
          >
            <Box sx={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <Typography variant="title3">Resume market signing?</Typography>
              <Typography variant="text3" color={COLORS.santasGrey}>
                A signing draft exists for this Safe and network. Resume the
                exact market settings and signing request, or discard it and
                start again.
              </Typography>
            </Box>
            <Box sx={{ display: "flex", gap: "8px" }}>
              <Button
                variant="contained"
                color="secondary"
                size="large"
                fullWidth
                onClick={handleDiscardSavedDraft}
              >
                Discard
              </Button>
              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={handleResumeSavedDraft}
              >
                Resume
              </Button>
            </Box>
          </Box>
        </Dialog>

        <Dialog
          open={finalOpen}
          onClose={
            isDeploying
              ? undefined
              : () => {
                  setFinalOpen(false)
                  if (isSuccess) handleGoToMarkets()
                }
          }
          sx={FinalDialogContainer}
        >
          {isError && !isDeploying && (
            <>
              <Box sx={DeployHeaderContainer}>
                <Box width="20px" height="20px" />
                <IconButton disableRipple onClick={handleClickClose}>
                  <SvgIcon fontSize="big" sx={DeployCloseButtonIcon}>
                    <Cross />
                  </SvgIcon>
                </IconButton>
              </Box>
              <Box padding="24px" sx={DeployContentContainer}>
                <Box margin="auto" sx={DeployMainContainer}>
                  <SvgIcon fontSize="colossal">
                    <CircledCrossRed />
                  </SvgIcon>

                  <Box sx={DeployTypoBox}>
                    <Typography variant="title3">
                      {t("createNewMarket.deploy.error.title")}
                    </Typography>
                    <Typography variant="text3" sx={DeploySubtitle}>
                      {t("createNewMarket.deploy.error.message")}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={DeployButtonContainer}>
                  <Button
                    variant="contained"
                    color="secondary"
                    size="large"
                    fullWidth
                    onClick={() => {
                      handleResetModal()
                      setFinalOpen(false)
                    }}
                  >
                    {t("createNewMarket.deploy.error.buttons.back")}
                  </Button>
                  <Button
                    variant="contained"
                    size="large"
                    fullWidth
                    onClick={() => {
                      handleResetModal()
                      handleDeployMarket()
                    }}
                  >
                    {t("createNewMarket.deploy.error.buttons.again")}
                  </Button>
                </Box>
              </Box>
            </>
          )}

          {isSuccess && !isDeploying && (
            <Box padding="24px" sx={DeployContentContainer}>
              <Box
                margin="auto"
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  rowGap: "24px",
                }}
              >
                <SvgIcon fontSize="colossal">
                  <CircledCheckBlue />
                </SvgIcon>

                <Box sx={DeployTypoBox}>
                  <Typography variant="title3">
                    {t("createNewMarket.deploy.success.title")}
                  </Typography>
                  <Typography variant="text3" sx={DeploySubtitle}>
                    {t("createNewMarket.deploy.success.message")}
                  </Typography>
                </Box>
              </Box>

              <Box sx={DeployButtonContainer}>
                {newMarketForm.getValues("mla") === "wildcatMLA" && (
                  <Button
                    variant="contained"
                    color="secondary"
                    size="large"
                    fullWidth
                  >
                    {t("createNewMarket.deploy.success.buttons.mla")}
                  </Button>
                )}
                <Button
                  onClick={handleGoToMarkets}
                  variant="contained"
                  size="large"
                  fullWidth
                >
                  {t("createNewMarket.deploy.success.buttons.markets")}
                </Button>
              </Box>
            </Box>
          )}

          {isDeploying && (
            <Box sx={DeployContentContainer} rowGap="24px">
              <Loader />

              <Box sx={DeployTypoBox}>
                <Typography variant="text1">
                  {t("createNewMarket.deploy.loading.title")}
                </Typography>
                <Typography variant="text3" sx={DeploySubtitle}>
                  {t("createNewMarket.deploy.loading.message")}
                </Typography>
              </Box>
            </Box>
          )}
        </Dialog>
      </Box>

      {currentNumber && <GlossarySidebar items={glossaryItems} />}
    </Box>
  )
}
