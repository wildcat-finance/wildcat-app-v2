"use client"

import { randomBytes } from "crypto"

import { useEffect, useMemo, useState } from "react"

import { Box, Button, Dialog, IconButton, Typography } from "@mui/material"
import SvgIcon from "@mui/material/SvgIcon"
import {
  DepositAccess,
  getDeploymentAddress,
  HooksKind,
  Token,
  TransferAccess,
  WithdrawalAccess,
} from "@wildcatfi/wildcat-sdk"
import { constants } from "ethers"
import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import { PageContainer } from "@/app/[locale]/borrower/create-market/style"
import CircledCheckBlue from "@/assets/icons/circledCheckBlue_icon.svg"
import CircledCrossRed from "@/assets/icons/circledCrossRed_icon.svg"
import Cross from "@/assets/icons/cross_icon.svg"
import { Loader } from "@/components/Loader"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { ROUTES } from "@/routes"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  CreateMarketSteps,
  setInitialCreateState,
} from "@/store/slices/createMarketSidebarSlice/createMarketSidebarSlice"

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
import { useSignMla } from "../hooks/mla/useSignBorrowerMla"

export default function CreateMarketPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const dispatch = useAppDispatch()
  const { address } = useAccount()
  const { isTestnet } = useCurrentNetwork()
  const { chainId: targetChainId } = useAppSelector(
    (state) => state.selectedNetwork,
  )

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

  const [timeSigned, setTimeSigned] = useState(0)
  useEffect(() => {
    setTimeSigned(Date.now())
  }, [])

  const [salt, setSalt] = useState<string>("")
  useEffect(() => {
    const randomSaltNumber = randomBytes(12).toString("hex")
    // Salt must be zero or deployer address as first 20 bytes, followed by a nonce in the last 12 bytes
    const saltWithAddress = `${address}${randomSaltNumber}`
    setSalt(saltWithAddress)
  }, [address])

  // const resetSalt = () => {
  //   const randomSaltNumber = randomBytes(12).toString("hex")
  //   // Salt must be zero or deployer address as first 20 bytes, followed by a nonce in the last 12 bytes
  //   const saltWithAddress = `${address}${randomSaltNumber}`
  //   setSalt(saltWithAddress)
  // }

  const {
    data: mlaSignature,
    mutate: signMla,
    isPending: isSigning,
    reset: resetMlaSignature,
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

  const handleDeployMarket = newMarketForm.handleSubmit((data) => {
    const marketParams = newMarketForm.getValues()

    console.log(`Deploying market with MLA template ID: ${marketParams.mla}`)

    // const deployedMarkets = selectedHooksTemplate?.totalMarkets
    if (assetData && tokenAsset && selectedHooksTemplate && mlaSignature) {
      const realParams: DeployNewV2MarketParams = {
        timeSigned,
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

  const handleClickDeploy = () => {
    console.log(`clicked deploy`)
    setFinalOpen(true)
    handleDeployMarket()
  }

  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [showErrorPopup, setShowErrorPopup] = useState(false)

  useEffect(() => {
    if (isError) {
      setShowErrorPopup(true)
    }
    if (isSuccess) {
      setShowSuccessPopup(true)
    }
  }, [isError, isSuccess])

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
            handleDeploy={handleClickDeploy}
            salt={salt}
            timeSigned={timeSigned}
            onClickSign={signMla}
            isSigning={isSigning}
            mlaSignature={mlaSignature}
          />
        )}

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

      {currentNumber && <GlossarySidebar step={currentStep} />}
    </Box>
  )
}
