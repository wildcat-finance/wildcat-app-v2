import { ComponentType } from "react"

import { Box, Button, Divider, SxProps, Theme, Typography } from "@mui/material"
import SvgIcon from "@mui/material/SvgIcon"
import { Token } from "@wildcatfi/wildcat-sdk"
import { UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { MlaModal } from "@/app/[locale]/borrower/components/MlaModal"
import { usePreviewMlaFromForm } from "@/app/[locale]/borrower/hooks/mla/usePreviewMla"
import { SignMlaFromFormInputs } from "@/app/[locale]/borrower/hooks/mla/useSignBorrowerMla"
import { BorrowerProfile } from "@/app/api/profiles/interface"
import BackArrow from "@/assets/icons/arrowLeft_icon.svg"
import Info from "@/assets/icons/info_icon.svg"
import ELFsByCountry from "@/config/elfs-by-country.json"
import JurisdictionsByCountry from "@/config/jurisdictions-by-country.json"
import Jurisdictions from "@/config/jurisdictions.json"
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
import { marketImplementationOptions } from "@/utils/marketImplementation"

import { ConfirmationFormProps } from "./interface"
import { PeriodicTermsConfirmation } from "./PeriodicTermsConfirmation"
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

export type ConfirmationFinancialSectionProps = Pick<
  ConfirmationFormProps,
  "form" | "tokenAsset"
>

type SharedConfirmationFormProps = ConfirmationFormProps & {
  FinancialSection: ComponentType<ConfirmationFinancialSectionProps>
}

export const SharedConfirmationForm = ({
  form,
  tokenAsset,
  borrowerProfile: borrowerData,
  handleDeploy,
  timeSigned,
  salt,
  onClickSign,
  onDiscardSignature,
  signatureRequested,
  paramsChangedSinceSigning,
  isSigning,
  isDeployReady,
  isDeployDialogOpen,
  mlaSignature,
  FinancialSection,
}: SharedConfirmationFormProps) => {
  const { t } = useTranslation()

  // const entityKind = mockedNaturesOptions.find(
  // (option) => option.id === borrowerData?.entityKind,
  // )

  const dispatch = useAppDispatch()

  const { getValues } = form

  const implementationTypeValue = marketImplementationOptions.find(
    (el) => el.value === getValues("implementationType"),
  )?.label

  const marketTypeValue = mockedMarketTypesOptions.find(
    (el) => el.value === getValues("marketType"),
  )?.label

  const accessControlValue = mockedAccessControlOptions.find(
    (el) => el.value === getValues("accessControl"),
  )?.label

  const isFixedTerm = getValues("marketType") === "fixedTerm"
  const isNewPolicy = getValues("policy") === "createNewPolicy"
  const policyNameValue = getValues("policyName") || "Unnamed Policy"
  const depositRequiresAccess = "Yes" // getValues("depositRequiresAccess")
  const withdrawalRequiresAccess = getValues("withdrawalRequiresAccess")
  const transferRequiresAccess = getValues("transferRequiresAccess")
  const disableTransfers = getValues("disableTransfers")

  const selectedMla = getValues("mla")
  const mlaTemplateId =
    selectedMla === "noMLA" ? undefined : Number(selectedMla)
  const isMLA = mlaTemplateId !== undefined
  const isReductionAllowed = getValues("allowTermReduction")
  const isPeriodicTerm = getValues("marketType") === "periodicTerm"

  const jurisdiction = borrowerData?.jurisdiction
    ? Jurisdictions[borrowerData.jurisdiction as keyof typeof Jurisdictions]
    : undefined
  const entityKind =
    borrowerData?.entityKind &&
    jurisdiction &&
    (
      ELFsByCountry[jurisdiction.countryCode as keyof typeof ELFsByCountry] ||
      []
    ).find((e) => e.elfCode === borrowerData.entityKind)?.name

  /// Note: The signature is handled at a higher level, but we need to ensure the
  /// signature was requested at this stage of the deployment process to prevent
  /// using a signature from a previous version of the market's parameters in case
  /// the user goes back and changes some settings.
  const signed =
    signatureRequested &&
    !isSigning &&
    !!mlaSignature?.signature &&
    !paramsChangedSinceSigning

  const actionsLocked = isDeployDialogOpen

  const handleBackClick = () => {
    if (onDiscardSignature()) {
      dispatch(setCreatingStep(CreateMarketSteps.MLA))
    }
  }

  const handleSign = () => {
    onClickSign({
      form,
      timeSigned,
      borrowerProfile: borrowerData,
      asset: tokenAsset,
    })
  }

  return (
    <Box sx={{ ...FormContainer, width: "71.5%", paddingBottom: "24px" }}>
      <Typography variant="title2" sx={{ marginBottom: "36px" }}>
        {t("borrower.createMarket.confirm.title")}
      </Typography>

      <Typography variant="text4" sx={SubtitleStyle}>
        {t("borrower.createMarket.policy.title")}
      </Typography>

      <Box
        sx={{
          ...SectionGrid,
          gap: "20px 12px",
        }}
      >
        <ConfirmationFormItem
          label={t("borrower.createMarket.policy.policy.label")}
          value={isNewPolicy ? "NEW POLICY" : "EXISTING POLICY"}
        />

        <ConfirmationFormItem
          label={t("borrower.createMarket.policy.name.label")}
          value={policyNameValue}
        />
        <ConfirmationFormItem
          label={t("borrower.createMarket.policy.implementation.label")}
          value={implementationTypeValue || ""}
        />
        <ConfirmationFormItem
          label={t("borrower.createMarket.policy.type.label")}
          value={marketTypeValue || ""}
        />

        <ConfirmationFormItem
          label={t("borrower.createMarket.policy.access.label")}
          value={accessControlValue ?? "-"}
        />
      </Box>

      <Divider sx={DividerStyle} />

      <Typography variant="text4" sx={SubtitleStyle}>
        {t("borrower.createMarket.basic.title")}
      </Typography>

      <Box
        sx={{
          ...SectionGrid,
          gap: "20px 12px",
        }}
      >
        <ConfirmationFormItem
          label={t("common.fields.underlyingAsset")}
          value={tokenAsset?.name || ""}
        />

        <ConfirmationFormItem
          label={t("borrower.createMarket.basic.tokenName.label")}
          value={`${getValues("namePrefix")} ${tokenAsset?.name}`}
        />

        <ConfirmationFormItem
          label={t("borrower.createMarket.basic.tokenSymbol.label")}
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
              {t("borrower.createMarket.mla.title")}
            </Typography>

            {/* <Button
              variant="contained"
              color="secondary"
              size="small"
              sx={{ width: "fit-content" }}
            >
              {t("borrower.createMarket.buttons.viewMLA")}
            </Button> */}
            <PreviewMlaModal
              form={form}
              mlaTemplateId={mlaTemplateId}
              timeSigned={timeSigned}
              borrowerProfile={borrowerData}
              asset={tokenAsset}
              salt={salt}
              isSigning={false}
              disabled={actionsLocked}
              sx={{ width: "fit-content" }}
              modalButtonVariant="contained"
              modalButtonSize="small"
              buttonText={t("borrower.createMarket.buttons.viewMLA")}
              showSignButton={false}
              isClosed={actionsLocked}
            />
          </Box>

          <Divider sx={DividerStyle} />
        </>
      )}

      {isFixedTerm && (
        <>
          <Typography variant="text4" sx={SubtitleStyle}>
            {t("borrower.createMarket.confirm.typeTerms")}
          </Typography>

          <Box
            sx={{
              ...SectionGrid,
              gap: "20px 12px",
            }}
          >
            <ConfirmationFormItem
              label={t("borrower.createMarket.policy.expiration.label")}
              value={
                timestampToDateFormatted(
                  Number(getValues("fixedTermEndTime")),
                  "DD/MM/YYYY",
                ) ?? ""
              }
            />

            <ConfirmationFormItem
              label={t("borrower.createMarket.policy.earlyClose.label")}
              value={getValues("allowClosureBeforeTerm") ? "Yes" : "No"}
            />

            <ConfirmationFormItem
              label={t("borrower.createMarket.policy.reduceExpiration.label")}
              value={getValues("allowTermReduction") ? "Yes" : "No"}
            />
          </Box>

          <Divider sx={DividerStyle} />
        </>
      )}

      {isPeriodicTerm && <PeriodicTermsConfirmation form={form} />}

      <FinancialSection form={form} tokenAsset={tokenAsset} />

      <Divider sx={DividerStyle} />

      <Box
        sx={{
          ...SectionGrid,
          gap: "20px 12px",
          gridTemplateRows: "repeat(1, 1fr)",
          alignItems: "center",
        }}
      >
        <Typography variant="text4" sx={{ textTransform: "uppercase" }}>
          {t("borrower.createMarket.wrapper.title")}
        </Typography>

        <Typography variant="text2" sx={{ height: "20px" }}>
          {getValues("deployWrapper") ? "Yes" : "No"}
        </Typography>
      </Box>

      <Divider sx={DividerStyle} />

      <Typography variant="text4" sx={SubtitleStyle}>
        {t("borrower.createMarket.lenderRestrictions.title")}
      </Typography>

      <Box
        sx={{
          ...SectionGrid,
          gap: "20px 12px",
        }}
      >
        <ConfirmationFormItem
          label={t(
            "borrower.createMarket.lenderRestrictions.restrictWithdrawals.label",
          )}
          value={withdrawalRequiresAccess ? "Yes" : "No"}
        />

        <ConfirmationFormItem
          label={t(
            "borrower.createMarket.lenderRestrictions.restrictTransfers.label",
          )}
          value={transferRequiresAccess ? "Yes" : "No"}
        />

        <ConfirmationFormItem
          label={t(
            "borrower.createMarket.lenderRestrictions.disableTransfers.label",
          )}
          value={disableTransfers ? "Yes" : "No"}
        />
      </Box>

      {isMLA && (
        <>
          <Divider sx={DividerStyle} />

          <Typography variant="text4" sx={SubtitleStyle}>
            {t("borrower.createMarket.confirm.legalInfo.title")}
          </Typography>

          <Box
            sx={{
              ...SectionGrid,
              gap: "20px 12px",
              gridTemplateRows: "repeat(3, 1fr)",
            }}
          >
            <ConfirmationFormItem
              label={t("borrower.createMarket.confirm.legalInfo.legalName")}
              value={borrowerData?.name || ""}
            />

            <ConfirmationFormItem
              label={t("common.fields.jurisdiction")}
              value={
                jurisdiction
                  ? jurisdiction.subDivisionName || jurisdiction.countryName
                  : ""
              }
            />

            <ConfirmationFormItem
              label={t("borrower.createMarket.confirm.legalInfo.entityKind")}
              value={entityKind || ""}
            />

            <ConfirmationFormItem
              label={t("borrower.createMarket.confirm.legalInfo.address")}
              value={borrowerData?.physicalAddress || ""}
            />

            <ConfirmationFormItem
              label={t("borrower.createMarket.confirm.legalInfo.email")}
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
          {t("borrower.createMarket.confirm.alert")}
        </Typography>
      </Box>

      <Box sx={{ ...AlertContainer, marginTop: "12px" }}>
        <SvgIcon sx={{ fontSize: "18px", "& path": { fill: COLORS.greySuit } }}>
          <Info />
        </SvgIcon>

        <Typography variant="text3">
          {t("borrower.createMarket.confirm.alertFee")}
        </Typography>
      </Box>

      {isReductionAllowed && (
        <Box sx={{ ...AlertContainer, marginTop: "12px" }}>
          <SvgIcon
            sx={{ fontSize: "18px", "& path": { fill: COLORS.greySuit } }}
          >
            <Info />
          </SvgIcon>

          <Typography variant="text3">
            {t("borrower.createMarket.confirm.alertReduction")}
          </Typography>
        </Box>
      )}

      {signatureRequested && paramsChangedSinceSigning && (
        <Box sx={{ ...AlertContainer, marginTop: "12px" }}>
          <SvgIcon
            sx={{
              fontSize: "18px",
              "& path": { fill: COLORS.wildWatermelon },
            }}
          >
            <Info />
          </SvgIcon>

          <Typography variant="text3" color={COLORS.dullRed}>
            {t("borrower.createMarket.confirm.alertParamsChanged")}
          </Typography>
        </Box>
      )}

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
          disabled={actionsLocked}
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
          {t("common.buttons.back")}
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
              disabled={signed || isSigning || actionsLocked}
              sx={{ width: "168px", borderRadius: "12px" }}
              modalButtonVariant="contained"
              modalButtonSize="large"
              isClosed={signed || actionsLocked}
            />
          )}
          {!isMLA && (
            <Button
              size="large"
              variant="contained"
              sx={{ width: "168px", borderRadius: "12px" }}
              disabled={signed || isSigning || actionsLocked}
              onClick={handleSign}
            >
              {t("borrower.createMarket.buttons.signMlaRefusal")}
            </Button>
          )}

          <Button
            size="large"
            variant="contained"
            sx={{ width: "168px", borderRadius: "12px" }}
            disabled={!signed || !isDeployReady || actionsLocked}
            onClick={handleDeploy}
          >
            {t("borrower.createMarket.buttons.deploy")}
          </Button>
        </Box>
      </Box>
    </Box>
  )
}
