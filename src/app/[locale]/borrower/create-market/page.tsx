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
import { constants } from "ethers"
import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"
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
  CreateMarketSigningDraft,
  getCreateMarketSigningDraftScope,
  removeCreateMarketSigningDraft,
  saveCreateMarketSigningDraft,
} from "@/store/slices/createMarketSigningDraftsSlice/createMarketSigningDraftsSlice"
import { removePendingSafeMessage } from "@/store/slices/pendingSafeMessagesSlice/pendingSafeMessagesSlice"
import { COLORS } from "@/theme/colors"
import { SERVICE_AGREEMENT_TIME_SIGNED_MAX_AGE_MS } from "@/utils/serviceAgreementMessage"

import { BasicSetupForm } from "./components/Forms/BasicSetupForn"
import { ConfirmationForm } from "./components/Forms/ConfirmationForm"
import { FinancialForm } from "./components/Forms/FinancialForm"
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
import {
  DeployNewV2MarketParams,
  useDeployV2Market,
} from "./hooks/useDeployV2Market"
import { useNewMarketForm } from "./hooks/useNewMarketForm"
import { useNewMarketHooksData } from "./hooks/useNewMarketHooksData"
import { useTokenMetadata } from "./hooks/useTokenMetadata"
import { getCreateMarketFormFingerprint } from "./validation/deployFingerprint"
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
) => `${chainId}:${address.toLowerCase()}:${timeSigned}:${salt.toLowerCase()}`

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

export default function CreateMarketPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const dispatch = useAppDispatch()
  const { address } = useAccount()
  const signer = useEthersSigner()
  const { data: borrowerProfile, refetch: refetchBorrowerProfile } =
    useGetBorrowerProfile(address)
  const { isTestnet } = useCurrentNetwork()
  // ToU re-acceptance lockout (staleExpired / declined): no new markets.
  const { touGateState, isAgreementFetching, refetchAgreementStatus } =
    useNetworkGate()
  const { chainId: targetChainId } = useAppSelector(
    (state) => state.selectedNetwork,
  )
  const signingDraftScope = address
    ? getCreateMarketSigningDraftScope(address, targetChainId)
    : undefined
  const {
    signingDraft,
    signingDraftsRehydrated,
    pendingSafeMessages,
    pendingSafeMessagesRehydrated,
  } = useAppSelector((state) => ({
    signingDraft: signingDraftScope
      ? state.createMarketSigningDrafts.records[signingDraftScope]
      : undefined,
    signingDraftsRehydrated:
      // `_persist` is redux-persist's rehydration marker.
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

  const { selectedHooksInstance, selectedHooksTemplate, hooksInstances } =
    useNewMarketHooksData(newMarketForm)

  const { deployNewMarket, isDeploying, isSuccess, isError } =
    useDeployV2Market()

  const [finalOpen, setFinalOpen] = useState<boolean>(false)
  const [activeDraftId, setActiveDraftId] = useState<string>()
  const [draftToResumeId, setDraftToResumeId] = useState<string>()
  const [signatureRequested, setSignatureRequested] = useState(false)
  const [isValidatingSignature, setIsValidatingSignature] = useState(false)
  const [signedFormFingerprint, setSignedFormFingerprint] = useState<string>()

  const [timeSigned, setTimeSigned] = useState(0)
  const [salt, setSalt] = useState<string>("")
  useEffect(() => {
    setTimeSigned(Date.now())
    setSalt(address ? getNewMarketSalt(address) : "")
    setActiveDraftId(undefined)
    setDraftToResumeId(undefined)
    setSignatureRequested(false)
    setSignedFormFingerprint(undefined)
  }, [address, targetChainId])

  const paramsChangedSinceSigning =
    !!signedFormFingerprint &&
    signedFormFingerprint !==
      getCreateMarketFormFingerprint(newMarketForm.watch())

  const {
    data: mlaSignature,
    mutate: signMla,
    isPending: isSigning,
    reset: resetMlaSignature,
    marketAddress,
    isSafeSigning,
    completeSafeMessage,
  } = useSignMla(salt)

  const handleClickClose = () => {
    setFinalOpen(false)
  }

  const defaultPolicyOption = {
    id: "createNewPolicy",
    label: "Create New Policy",
    value: "createNewPolicy",
  } as const

  const policyOptions = useMemo(
    () => [
      defaultPolicyOption,
      ...(hooksInstances?.map((instance) => ({
        id: instance.address,
        label: instance.name || "Unnamed Policy",
        badge:
          instance.kind === HooksKind.OpenTerm ? "Open Term" : "Fixed Term",
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

  const getPendingMessageForDraft = useCallback(
    (draftId: string) =>
      Object.values(pendingSafeMessages)
        .filter(
          (record) =>
            record.flow === "borrower-market-mla" &&
            record.context?.draftId === draftId,
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
        }),
      )
      removePendingMessagesForDraft(draftId)
    },
    [address, dispatch, removePendingMessagesForDraft, targetChainId],
  )

  const startFreshSigningContext = useCallback(() => {
    resetMlaSignature()
    setSignatureRequested(false)
    setSignedFormFingerprint(undefined)
    setActiveDraftId(undefined)
    setDraftToResumeId(undefined)
    setTimeSigned(Date.now())
    setSalt(address ? getNewMarketSalt(address) : "")
  }, [address, resetMlaSignature])

  const restartDeployedSigningContext = useCallback(
    (
      draft: CreateMarketSigningDraft,
      refreshedBorrowerProfile: BorrowerProfile = draft.borrowerProfile,
    ) => {
      if (!address || !draft.deployedMarket) return false

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
      setSignedFormFingerprint(undefined)
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
      const deployedDraft =
        signingDraft &&
        signingDraft.id === activeDraftId &&
        signingDraft.deployedMarket
          ? signingDraft
          : undefined
      if (deployedDraft) {
        restartDeployedSigningContext(
          deployedDraft,
          refreshedBorrowerProfile ?? deployedDraft.borrowerProfile,
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
      restartDeployedSigningContext,
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
    if (signingDraft?.deployedMarket) {
      const refreshedBorrowerProfile =
        await getCurrentMlaBorrowerProfile(signingDraft)
      if (!refreshedBorrowerProfile) return
      toastError(
        "This market is already deployed. Complete its agreement before creating another market.",
      )
      restartDeployedSigningContext(signingDraft, refreshedBorrowerProfile)
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
    restartDeployedSigningContext,
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
      const asset = resumedDraft
        ? createTokenFromDraft(resumedDraft)
        : args.asset

      setSignatureRequested(true)
      setSignedFormFingerprint(
        getCreateMarketFormFingerprint(args.form.getValues()),
      )
      if (!isSafeSigning) {
        signMla(args)
        return
      }
      if (
        !address ||
        !signingBorrowerProfile ||
        !asset ||
        !salt ||
        !timeSigned
      ) {
        signMla(args)
        return
      }

      const draftId =
        resumedDraft?.id ??
        getCreateMarketSigningDraftId(address, targetChainId, timeSigned, salt)

      if (!resumedDraft) {
        dispatch(
          saveCreateMarketSigningDraft({
            version: 1,
            walletKind: "Safe",
            id: draftId,
            chainId: targetChainId,
            address: address.toLowerCase(),
            salt,
            timeSigned,
            formValues: { ...args.form.getValues() },
            borrowerProfile: signingBorrowerProfile,
            asset: {
              chainId: asset.chainId,
              address: asset.address,
              name: asset.name,
              symbol: asset.symbol,
              decimals: asset.decimals,
              isMock: asset.isMock,
            },
            createdAt: Date.now(),
          }),
        )
      }

      setActiveDraftId(draftId)
      const pendingMessage = getPendingMessageForDraft(draftId)
      signMla({
        ...args,
        borrowerProfile: signingBorrowerProfile,
        asset,
        draftId,
        resumeMessage: pendingMessage?.message,
      })
    },
    [
      activeDraftId,
      address,
      createTokenFromDraft,
      dispatch,
      getPendingMessageForDraft,
      isSafeSigning,
      salt,
      signMla,
      signingDraft,
      targetChainId,
      timeSigned,
    ],
  )

  const handleResumeSavedDraft = useCallback(async () => {
    if (!signingDraft) return
    const refreshedBorrowerProfile =
      await getCurrentMlaBorrowerProfile(signingDraft)
    if (!refreshedBorrowerProfile) return
    const borrowerProfileChanged = !hasSameMlaProfile(
      signingDraft.borrowerProfile,
      refreshedBorrowerProfile,
    )

    // The draft pins timeSigned into the signed MLA message; once it falls
    // out of the server's acceptance window every submit is a guaranteed 400
    // (and resuming would propose dead requests into the Safe's queue), so
    // restart the ceremony with the saved form values instead.
    if (
      Date.now() >=
      signingDraft.timeSigned + SERVICE_AGREEMENT_TIME_SIGNED_MAX_AGE_MS
    ) {
      toastError(
        "The saved signing draft has expired. Review and sign the market agreement again.",
      )
      if (signingDraft.deployedMarket) {
        restartDeployedSigningContext(signingDraft, refreshedBorrowerProfile)
        return
      }
      removeDraftRecords(signingDraft.id)
      startFreshSigningContext()
      newMarketForm.reset(signingDraft.formValues)
      dispatch(setCreatingStep(CreateMarketSteps.CONFIRM))
      return
    }
    if (borrowerProfileChanged) {
      toastError(
        "Borrower legal details changed. Review and sign the market agreement again.",
      )
      if (signingDraft.deployedMarket) {
        restartDeployedSigningContext(signingDraft, refreshedBorrowerProfile)
        return
      }
      removeDraftRecords(signingDraft.id)
      startFreshSigningContext()
      newMarketForm.reset(signingDraft.formValues)
      dispatch(setCreatingStep(CreateMarketSteps.CONFIRM))
      return
    }
    newMarketForm.reset(signingDraft.formValues)
    setSalt(signingDraft.salt)
    setTimeSigned(signingDraft.timeSigned)
    setActiveDraftId(signingDraft.id)
    setDraftToResumeId(signingDraft.id)
    setSignatureRequested(true)
    setSignedFormFingerprint(
      getCreateMarketFormFingerprint(signingDraft.formValues),
    )
    dispatch(setCreatingStep(CreateMarketSteps.CONFIRM))
  }, [
    dispatch,
    getCurrentMlaBorrowerProfile,
    newMarketForm,
    removeDraftRecords,
    restartDeployedSigningContext,
    signingDraft,
    startFreshSigningContext,
  ])

  useEffect(() => {
    if (
      !signingDraft ||
      signingDraft.id !== draftToResumeId ||
      !marketAddress ||
      !selectedHooksTemplate
    ) {
      return
    }
    const asset = createTokenFromDraft(signingDraft)
    if (!asset) return

    setDraftToResumeId(undefined)
    const pendingMessage = getPendingMessageForDraft(signingDraft.id)
    signMla({
      form: newMarketForm,
      timeSigned: signingDraft.timeSigned,
      borrowerProfile: signingDraft.borrowerProfile,
      asset,
      draftId: signingDraft.id,
      resumeMessage: pendingMessage?.message,
    })
  }, [
    createTokenFromDraft,
    draftToResumeId,
    getPendingMessageForDraft,
    marketAddress,
    newMarketForm,
    signMla,
    selectedHooksTemplate,
    signingDraft,
  ])

  const showSigningDraftDialog =
    signingDraftsRehydrated &&
    pendingSafeMessagesRehydrated &&
    isSafeSigning &&
    !!signingDraft &&
    signingDraft.walletKind === "Safe" &&
    signingDraft.id !== activeDraftId

  const handleDeployMarket = newMarketForm.handleSubmit((data) => {
    const marketParams = newMarketForm.getValues()

    console.log(`Deploying market with MLA template ID: ${marketParams.mla}`)

    // const deployedMarkets = selectedHooksTemplate?.totalMarkets
    if (assetData && tokenAsset && selectedHooksTemplate && mlaSignature) {
      const realParams: DeployNewV2MarketParams = {
        timeSigned,
        deployFingerprint: getCreateMarketFormFingerprint(marketParams),
        mlaTemplateId:
          marketParams.mla !== undefined && marketParams.mla !== "noMLA"
            ? Number(marketParams.mla)
            : undefined,
        mlaSignature: mlaSignature.signature as string,
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
        // eslint-disable-next-line no-nested-ternary
        transferAccess: marketParams.disableTransfers
          ? TransferAccess.Disabled
          : marketParams.transferRequiresAccess
            ? TransferAccess.RequiresCredential
            : TransferAccess.Open,
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
        allowClosureBeforeTerm: !!marketParams.allowClosureBeforeTerm,
        allowForceBuyBacks: !!marketParams.allowForceBuyBack,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fixedTermEndTime: marketParams.fixedTermEndTime as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        allowTermReduction: marketParams.allowTermReduction as any,

        newProviderInputs: [],
        roleProviderFactory: constants.AddressZero,
        minimumDeposit: marketParams.minimumDeposit,
        deployWrapper: marketParams.deployWrapper,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any

      // console.log(`--- MARKET PARAMS ---`)
      // console.log(realParams)
      // console.log(`--- END MARKET PARAMS ---`)
      deployNewMarket(realParams)
    }
  })

  const handleClickDeploy = async () => {
    if (
      touGateState !== "unblocked" ||
      !assetData ||
      !tokenAsset ||
      !selectedHooksTemplate ||
      !mlaSignature?.message ||
      !signer ||
      !marketAddress
    ) {
      return
    }
    if (signer.chainId !== targetChainId) {
      toastError("Wallet network does not match selected network.")
      return
    }
    if (paramsChangedSinceSigning) {
      setFinalOpen(false)
      toastError(
        "Market settings changed after the agreement was signed. Review and sign the market agreement again.",
      )
      handleDiscardSignature()
      return
    }

    setIsValidatingSignature(true)
    try {
      const selectedMla = newMarketForm.getValues("mla")
      let currentMessage: string
      let refreshedBorrowerProfile: BorrowerProfile | undefined

      if (selectedMla === "noMLA") {
        currentMessage = DECLINE_MLA_ASSIGNMENT_MESSAGE.replace(
          "{{market}}",
          marketAddress.toLowerCase(),
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
          NETWORKS_BY_ID[targetChainId as SupportedChainId],
        )
        currentMessage = currentMla.message
      }

      if (currentMessage !== mlaSignature.message) {
        setFinalOpen(false)
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

  if (touGateState === "unknown") {
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
          // The status fetch failed and react-query's retries are exhausted -
          // stay fail-closed, but give an explicit retry instead of a
          // spinner that nothing will ever resolve.
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

  if (touGateState === "blocked") {
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
            // Centre on the same axis as the create-market form (the
            // glossary sidebar occupies 267px on the right), and sit a
            // little above true vertical centre.
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
          <FinancialForm form={newMarketForm} tokenAsset={tokenAsset} />
        )}

        {currentStep === CreateMarketSteps.LRESTRICTIONS && (
          <LenderRestrictionsForm form={newMarketForm} />
        )}

        {currentStep === CreateMarketSteps.WRAPPER && (
          <WrapperForm form={newMarketForm} />
        )}

        {currentStep === CreateMarketSteps.CONFIRM && (
          <ConfirmationForm
            form={newMarketForm}
            tokenAsset={tokenAsset}
            borrowerProfile={borrowerProfile}
            handleDeploy={handleClickDeploy}
            salt={salt}
            timeSigned={timeSigned}
            onClickSign={handleSignMla}
            onDiscardSignature={handleDiscardSignature}
            signatureRequested={signatureRequested}
            paramsChangedSinceSigning={paramsChangedSinceSigning}
            isSigning={isSigning}
            isDeployReady={
              !!assetData &&
              !!tokenAsset &&
              !!selectedHooksTemplate &&
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
                A signing draft exists for this wallet and network. Resume the
                exact market settings and Safe request, or discard it and start
                again.
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
                      handleClickDeploy()
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

      {currentNumber && <GlossarySidebar step={currentStep} />}
    </Box>
  )
}
