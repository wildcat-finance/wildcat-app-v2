"use client"

import * as React from "react"
import { useEffect, useMemo, useState } from "react"

import { Box, Button, Dialog, IconButton, Typography } from "@mui/material"
import SvgIcon from "@mui/material/SvgIcon"
import {
  DepositAccess,
  HooksKind,
  Token,
  TransferAccess,
  WithdrawalAccess,
} from "@wildcatfi/wildcat-sdk"
import { constants } from "ethers"
import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"

import { PageContainer } from "@/app/[locale]/borrower/create-market/style"
import CircledCheckBlue from "@/assets/icons/circledCheckBlue_icon.svg"
import CircledCrossRed from "@/assets/icons/circledCrossRed_icon.svg"
import Cross from "@/assets/icons/cross_icon.svg"
import { Loader } from "@/components/Loader"
import { ROUTES } from "@/routes"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  CreateMarketSteps,
  setInitialCreateState,
} from "@/store/slices/createMarketSidebarSlice/createMarketSidebarSlice"

import { BasicSetupForm } from "./components/Forms/BasicSetupForn"
import { BorrowerRestrictionsForm } from "./components/Forms/BorrowerRestrictionsForm"
import { ConfirmationForm } from "./components/Forms/ConfirmationForm"
import { FinancialForm } from "./components/Forms/FinancialForm"
import { LenderRestrictionsForm } from "./components/Forms/LenderRestrictionsForm"
import { MarketPolicyForm } from "./components/Forms/MarketPolicyForm"
import { MlaForm } from "./components/Forms/MLAForm"
import { PeriodsForm } from "./components/Forms/PeriodsForm"
import { GlossarySidebar } from "./components/GlossarySidebar"
import { StepCounterTitle } from "./components/StepCounterTitle"
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
import { useDeployV2Market } from "./hooks/useDeployV2Market"
import { useNewMarketForm } from "./hooks/useNewMarketForm"
import { useNewMarketHooksData } from "./hooks/useNewMarketHooksData"
import { useTokenMetadata } from "./hooks/useTokenMetadata"

export default function CreateMarketPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const dispatch = useAppDispatch()

  const currentStep = useAppSelector(
    (state) => state.createMarketSidebar.currentStep,
  )
  const steps = useAppSelector((state) => state.createMarketSidebar.steps)
  const currentNumber = steps.find((step) => step.step === currentStep)?.number

  const newMarketForm = useNewMarketForm()

  const { selectedHooksInstance, selectedHooksTemplate, hooksInstances } =
    useNewMarketHooksData(newMarketForm)

  const { deployNewMarket, isDeploying, isSuccess, isError } =
    useDeployV2Market()

  const [finalOpen, setFinalOpen] = useState<boolean>(false)

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

  const [tokenAsset, setTokenAsset] = useState<Token | undefined>()

  useEffect(() => {
    setTokenAsset(assetData)
  }, [assetData])

  const handleDeployMarket = newMarketForm.handleSubmit((data) => {
    const marketParams = newMarketForm.getValues()

    // const deployedMarkets = selectedHooksTemplate?.totalMarkets
    if (assetData && tokenAsset && selectedHooksTemplate) {
      const randomSaltNumber = (Math.random() * 1000000000000000000)
        .toString(16)
        .padStart(12, "0")
        .slice(-12)
      deployNewMarket({
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
        salt: `0x${randomSaltNumber.padStart(64, "0")}`, // @todo use # of deployed markets
        hooksAddress: selectedHooksInstance?.address,
        // @todo proper solution
        existingProviders:
          marketParams.accessControl === "defaultPullProvider"
            ? [
                {
                  providerAddress: "0x9aCdE253F7A51456c48604185C0ceA4Fc9e58E3a",
                  timeToLive: 2 ** 32 - 1,
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
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
          />
        )}

        {currentStep === CreateMarketSteps.BASIC && (
          <BasicSetupForm form={newMarketForm} tokenAsset={tokenAsset} />
        )}

        {/* {currentStep === CreateMarketSteps.MLA && (
          <MlaForm form={newMarketForm} />
        )} */}

        {(currentStep === CreateMarketSteps.FINANCIAL ||
          currentStep === CreateMarketSteps.MLA) && (
          <FinancialForm form={newMarketForm} tokenAsset={tokenAsset} />
        )}

        {currentStep === CreateMarketSteps.LRESTRICTIONS && (
          <LenderRestrictionsForm form={newMarketForm} />
        )}

        {currentStep === CreateMarketSteps.BRESTRICTIONS && (
          <BorrowerRestrictionsForm form={newMarketForm} />
        )}

        {currentStep === CreateMarketSteps.PERIODS && (
          <PeriodsForm form={newMarketForm} />
        )}

        {currentStep === CreateMarketSteps.CONFIRM && (
          <ConfirmationForm
            form={newMarketForm}
            tokenAsset={tokenAsset}
            handleDeploy={handleClickDeploy}
          />
        )}

        <Dialog
          open={finalOpen}
          onClose={!isDeploying ? () => setFinalOpen(false) : undefined}
          sx={FinalDialogContainer}
        >
          {showErrorPopup && (
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

          {showSuccessPopup && (
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

      {currentNumber && (
        <GlossarySidebar
          step={currentStep}
          hideGlossary={currentStep === CreateMarketSteps.BRESTRICTIONS}
        />
      )}
    </Box>
  )
}
