import { useState } from "react"

import { Box, Button, Divider, SxProps, Theme, Typography } from "@mui/material"
import SvgIcon from "@mui/material/SvgIcon"
import { Token } from "@wildcatfi/wildcat-sdk"
import { UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import { usePreviewMlaFromForm } from "@/app/[locale]/borrower/hooks/mla/usePreviewMla"
import { SignMlaFromFormInputs } from "@/app/[locale]/borrower/hooks/mla/useSignBorrowerMla"
import { useGetBorrowerProfile } from "@/app/[locale]/borrower/profile/hooks/useGetBorrowerProfile"
import { MlaModal } from "@/app/[locale]/lender/components/MlaModal"
import { BorrowerProfile } from "@/app/api/profiles/interface"
import BackArrow from "@/assets/icons/arrowLeft_icon.svg"
import Info from "@/assets/icons/info_icon.svg"
import {
  mockedAccessControlOptions,
  mockedMarketTypesOptions,
  mockedNaturesOptions,
} from "@/mocks/mocks"
import { useAppDispatch } from "@/store/hooks"
import {
  CreateMarketSteps,
  setCreatingStep,
} from "@/store/slices/createMarketSidebarSlice/createMarketSidebarSlice"
import { COLORS } from "@/theme/colors"
import { timestampToDateFormatted } from "@/utils/formatters"

import { ConfirmationFormProps } from "./interface"
import { AlertContainer, DividerStyle, SubtitleStyle } from "./style"
import { MarketValidationSchemaType } from "../../../validation/validationSchema"
import { ConfirmationFormItem } from "../../ConfirmationFormItem"
import { FormContainer, SectionGrid } from "../style"

const PreviewMlaModal = ({
  form,
  mlaTemplateId,
  timeSigned,
  borrowerProfile,
  asset,
  salt,
  onSign,
  isSigning,
  sx,
  disabled,
  modalButtonVariant,
  modalButtonSize,
  buttonText = "Sign",
  showSignButton = true,
  isClosed,
}: {
  form: UseFormReturn<MarketValidationSchemaType>
  mlaTemplateId: number
  timeSigned: number
  borrowerProfile: BorrowerProfile | undefined
  asset: Token | undefined
  salt: string
  onSign?: (args: SignMlaFromFormInputs) => void
  isSigning: boolean
  sx?: SxProps<Theme> | undefined
  disabled?: boolean
  modalButtonVariant?: "text" | "outlined" | "contained"
  modalButtonSize?: "small" | "medium" | "large"
  buttonText?: string
  showSignButton?: boolean
  isClosed?: boolean
}) => {
  const { data: mla, isLoading } = usePreviewMlaFromForm(
    form,
    mlaTemplateId,
    timeSigned,
    borrowerProfile,
    asset,
    salt,
  )
  return (
    <MlaModal
      mla={mla}
      onSign={() => {
        onSign?.({
          form,
          timeSigned,
          borrowerProfile,
          asset,
        })
      }}
      disableModalButton={disabled}
      disableSignButton={disabled}
      isLoading={isLoading}
      showSignButton={showSignButton}
      isSigning={isSigning}
      buttonText={buttonText}
      sx={sx}
      modalButtonVariant={modalButtonVariant}
      modalButtonSize={modalButtonSize}
      isClosed={isClosed}
    />
  )
}

export const ConfirmationForm = ({
  form,
  tokenAsset,
  handleDeploy,
  timeSigned,
  salt,
  onClickSign,
  isSigning,
  mlaSignature,
}: ConfirmationFormProps) => {
  const { t } = useTranslation()

  const { address } = useAccount()
  const { data: borrowerData, isLoading: isPublicDataLoading } =
    useGetBorrowerProfile(address)

  const entityKind = mockedNaturesOptions.find(
    (option) => option.id === borrowerData?.entityKind,
  )

  const dispatch = useAppDispatch()

  const { getValues } = form

  const [requestedSign, setRequestedSign] = useState<boolean>(false)

  const marketTypeValue = mockedMarketTypesOptions.find(
    (el) => el.value === getValues("marketType"),
  )?.label

  const accessControlValue = mockedAccessControlOptions.find(
    (el) => el.value === getValues("accessControl"),
  )?.label

  const isFixedTerm = getValues("marketType") === "fixedTerm"
  const isNewPolicy = getValues("policy") === "createNewPolicy"
  const policyNameValue = getValues("policyName") || "Unnamed Policy"
  const depositRequiresAccess = getValues("depositRequiresAccess")
  const withdrawalRequiresAccess = getValues("withdrawalRequiresAccess")
  const transferRequiresAccess = getValues("transferRequiresAccess")
  const disableTransfers = getValues("disableTransfers")
  const allowForceBuyBack = getValues("allowForceBuyBack")

  const selectedMla = getValues("mla")
  const mlaTemplateId =
    selectedMla === "noMLA" ? undefined : Number(selectedMla)
  const isMLA = mlaTemplateId !== undefined

  /// Note: The signature is handled at a higher level, but we need to ensure the
  /// signature was requested at this stage of the deployment process to prevent
  /// using a signature from a previous version of the market's parameters in case
  /// the user goes back and changes some settings.
  const signed = requestedSign && !isSigning && !!mlaSignature

  const handleBackClick = () => {
    dispatch(setCreatingStep(CreateMarketSteps.MLA))
  }

  const handleSign = () => {
    onClickSign({
      form,
      timeSigned,
      borrowerProfile: borrowerData,
      asset: tokenAsset,
    })
    setRequestedSign(true)
  }

  return (
    <Box sx={{ ...FormContainer, width: "71.5%", paddingBottom: "24px" }}>
      <Typography variant="title2" sx={{ marginBottom: "36px" }}>
        {t("createNewMarket.confirm.title")}
      </Typography>

      <Typography variant="text4" sx={SubtitleStyle}>
        {t("createNewMarket.policy.title")}
      </Typography>

      <Box
        sx={{
          ...SectionGrid,
          gap: "20px 12px",
        }}
      >
        <ConfirmationFormItem
          label={t("createNewMarket.policy.policy.label")}
          value={isNewPolicy ? "NEW POLICY" : "EXISTING POLICY"}
        />

        <ConfirmationFormItem
          label={t("createNewMarket.policy.name.label")}
          value={policyNameValue}
        />
        <ConfirmationFormItem
          label={t("createNewMarket.policy.type.label")}
          value={marketTypeValue || ""}
        />

        <ConfirmationFormItem
          label={t("createNewMarket.policy.access.label")}
          value={accessControlValue ?? "-"}
        />
      </Box>

      <Divider sx={DividerStyle} />

      <Typography variant="text4" sx={SubtitleStyle}>
        {t("createNewMarket.basic.title")}
      </Typography>

      <Box
        sx={{
          ...SectionGrid,
          gap: "20px 12px",
        }}
      >
        <ConfirmationFormItem
          label={t("createNewMarket.basic.asset.label")}
          value={tokenAsset?.name || ""}
        />

        <ConfirmationFormItem
          label={t("createNewMarket.basic.tokenName.label")}
          value={`${getValues("namePrefix")} ${tokenAsset?.name}`}
        />

        <ConfirmationFormItem
          label={t("createNewMarket.basic.tokenSymbol.label")}
          value={`${getValues("symbolPrefix")}${tokenAsset?.symbol}`}
        />
      </Box>

      <Divider sx={DividerStyle} />

      {isMLA && (
        <>
          <Box
            sx={{
              ...SectionGrid,
              gap: "20px 12px",
              gridTemplateRows: "repeat(1, 1fr)",
              alignItems: "center",
            }}
          >
            <Typography variant="text4" sx={{ textTransform: "uppercase" }}>
              {t("createNewMarket.mla.title")}
            </Typography>

            {/* <Button
              variant="contained"
              color="secondary"
              size="small"
              sx={{ width: "fit-content" }}
            >
              {t("createNewMarket.buttons.viewMLA")}
            </Button> */}
            <PreviewMlaModal
              form={form}
              mlaTemplateId={mlaTemplateId}
              timeSigned={timeSigned}
              borrowerProfile={borrowerData}
              asset={tokenAsset}
              salt={salt}
              isSigning={false}
              disabled={false}
              sx={{ width: "fit-content" }}
              modalButtonVariant="contained"
              modalButtonSize="small"
              buttonText={t("createNewMarket.buttons.viewMLA")}
              showSignButton={false}
            />
          </Box>

          <Divider sx={DividerStyle} />
        </>
      )}

      {isFixedTerm && (
        <>
          <Typography variant="text4" sx={SubtitleStyle}>
            {t("createNewMarket.confirm.typeTerms")}
          </Typography>

          <Box
            sx={{
              ...SectionGrid,
              gap: "20px 12px",
            }}
          >
            <ConfirmationFormItem
              label={t("createNewMarket.policy.expiration.label")}
              value={
                timestampToDateFormatted(
                  Number(getValues("fixedTermEndTime")),
                  "DD/MM/YYYY",
                ) ?? ""
              }
            />

            <ConfirmationFormItem
              label={t("createNewMarket.policy.earlyClose.label")}
              value={getValues("allowClosureBeforeTerm") ? "Yes" : "No"}
            />

            <ConfirmationFormItem
              label={t("createNewMarket.policy.reduceExpiration.label")}
              value={getValues("allowTermReduction") ? "Yes" : "No"}
            />
          </Box>

          <Divider sx={DividerStyle} />
        </>
      )}

      <Typography variant="text4" sx={SubtitleStyle}>
        {t("createNewMarket.financial.title")}
      </Typography>

      <Box
        sx={{
          ...SectionGrid,
          gap: "20px 12px",
          gridTemplateRows: "repeat(3, 1fr)",
        }}
      >
        <ConfirmationFormItem
          label={t("createNewMarket.financial.maxCapacity.label")}
          value={`${getValues("maxTotalSupply")} ${tokenAsset?.symbol}`}
        />

        <ConfirmationFormItem
          label={t("createNewMarket.financial.baseAPR.label")}
          value={`${getValues("annualInterestBips")}%`}
        />

        <ConfirmationFormItem
          label={t("createNewMarket.financial.penaltyAPR.label")}
          value={`${getValues("delinquencyFeeBips")}%`}
        />

        <ConfirmationFormItem
          label={t("createNewMarket.financial.ratio.label")}
          value={`${getValues("reserveRatioBips")}%`}
        />

        <ConfirmationFormItem
          label={t("createNewMarket.financial.minDeposit.label")}
          value={`${getValues("minimumDeposit") ?? 0} ${tokenAsset?.symbol}`}
        />
      </Box>

      <Divider sx={DividerStyle} />

      <Typography variant="text4" sx={SubtitleStyle}>
        {t("createNewMarket.lenderRestrictions.title")}
      </Typography>

      <Box
        sx={{
          ...SectionGrid,
          gap: "20px 12px",
        }}
      >
        <ConfirmationFormItem
          label={t("createNewMarket.lenderRestrictions.restrictDeposits.label")}
          value={depositRequiresAccess ? "Yes" : "No"}
        />

        <ConfirmationFormItem
          label={t(
            "createNewMarket.lenderRestrictions.restrictWithdrawals.label",
          )}
          value={withdrawalRequiresAccess ? "Yes" : "No"}
        />

        <ConfirmationFormItem
          label={t(
            "createNewMarket.lenderRestrictions.restrictTransfers.label",
          )}
          value={transferRequiresAccess ? "Yes" : "No"}
        />

        <ConfirmationFormItem
          label={t("createNewMarket.lenderRestrictions.disableTransfers.label")}
          value={disableTransfers ? "Yes" : "No"}
        />
      </Box>

      <Divider sx={DividerStyle} />

      <Typography variant="text4" sx={SubtitleStyle}>
        {t("createNewMarket.periods.title")}
      </Typography>

      <Box
        sx={{
          ...SectionGrid,
          gap: "20px 12px",
          gridTemplateRows: "repeat(1, 1fr)",
        }}
      >
        <ConfirmationFormItem
          label={t("createNewMarket.periods.grace.label")}
          value={`${getValues("delinquencyGracePeriod")} hours`}
        />
        <ConfirmationFormItem
          label={t("createNewMarket.periods.wdCycle.label")}
          value={`${getValues("withdrawalBatchDuration")} hours`}
        />
      </Box>

      {isMLA && (
        <>
          <Divider sx={DividerStyle} />

          <Typography variant="text4" sx={SubtitleStyle}>
            {t("createNewMarket.confirm.legalInfo.title")}
          </Typography>

          <Box
            sx={{
              ...SectionGrid,
              gap: "20px 12px",
              gridTemplateRows: "repeat(3, 1fr)",
            }}
          >
            <ConfirmationFormItem
              label={t("createNewMarket.confirm.legalInfo.legalName")}
              value={borrowerData?.name || ""}
            />

            <ConfirmationFormItem
              label={t("createNewMarket.confirm.legalInfo.jurisdiction")}
              value={borrowerData?.jurisdiction || ""}
            />

            <ConfirmationFormItem
              label={t("createNewMarket.confirm.legalInfo.entityKind")}
              value={entityKind?.label || ""}
            />

            <ConfirmationFormItem
              label={t("createNewMarket.confirm.legalInfo.address")}
              value={borrowerData?.physicalAddress || ""}
            />

            <ConfirmationFormItem
              label={t("createNewMarket.confirm.legalInfo.email")}
              value={borrowerData?.email || ""}
            />
          </Box>
        </>
      )}

      <Box sx={AlertContainer}>
        <SvgIcon sx={{ fontSize: "18px", "& path": { fill: COLORS.greySuit } }}>
          <Info />
        </SvgIcon>

        <Typography variant="text3">
          {t("createNewMarket.confirm.alert")}
        </Typography>
      </Box>

      <Box
        sx={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          marginTop: "38px",
        }}
      >
        <Button
          size="large"
          variant="text"
          sx={{ justifyContent: "flex-start", borderRadius: "12px" }}
          onClick={handleBackClick}
        >
          <SvgIcon
            fontSize="medium"
            sx={{
              marginRight: "4px",
              "& path": { fill: `${COLORS.bunker}` },
            }}
          >
            <BackArrow />
          </SvgIcon>
          {t("createNewMarket.buttons.back")}
        </Button>

        <Box sx={{ display: "flex", gap: "4px" }}>
          {isMLA && (
            <PreviewMlaModal
              form={form}
              mlaTemplateId={mlaTemplateId}
              timeSigned={timeSigned}
              borrowerProfile={borrowerData}
              asset={tokenAsset}
              salt={salt}
              onSign={handleSign}
              isSigning={isSigning}
              disabled={signed}
              sx={{ width: "168px", borderRadius: "12px" }}
              modalButtonVariant="contained"
              modalButtonSize="large"
              isClosed={signed}
            />
          )}
          {!isMLA && (
            <Button
              size="large"
              variant="contained"
              sx={{ width: "168px", borderRadius: "12px" }}
              disabled={signed}
              onClick={handleSign}
            >
              {t("createNewMarket.buttons.signMlaRefusal")}
            </Button>
          )}

          <Button
            size="large"
            variant="contained"
            sx={{ width: "168px", borderRadius: "12px" }}
            disabled={!signed}
            onClick={handleDeploy}
          >
            {t("createNewMarket.buttons.deploy")}
          </Button>
        </Box>
      </Box>
    </Box>
  )
}
