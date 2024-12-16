import { useState } from "react"

import { Box, Button, Divider, Typography } from "@mui/material"
import SvgIcon from "@mui/material/SvgIcon"
import { useTranslation } from "react-i18next"

import BackArrow from "@/assets/icons/arrowLeft_icon.svg"
import Info from "@/assets/icons/info_icon.svg"
import {
  mockedAccessControlOptions,
  mockedMarketTypesOptions,
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
import { ConfirmationFormItem } from "../../ConfirmationFormItem"
import { FormContainer, SectionGrid } from "../style"

export const ConfirmationForm = ({
  form,
  tokenAsset,
  handleDeploy,
}: ConfirmationFormProps) => {
  const { t } = useTranslation()

  const dispatch = useAppDispatch()

  const { getValues } = form

  const [signed, setSigned] = useState<boolean>(false)

  const marketTypeValue = mockedMarketTypesOptions.find(
    (el) => el.value === getValues("marketType"),
  )?.label

  const accessControlValue = mockedAccessControlOptions.find(
    (el) => el.value === getValues("accessControl"),
  )?.label

  const isMLA = getValues("mla") === "wildcatMLA"
  const isFixedTerm = getValues("marketType") === "fixedTerm"
  const isNewPolicy = getValues("policy") === "createNewPolicy"
  const policyNameValue = getValues("policyName") || "Unnamed Policy"
  const depositRequiresAccess = getValues("depositRequiresAccess")
  const withdrawalRequiresAccess = getValues("withdrawalRequiresAccess")
  const transferRequiresAccess = getValues("transferRequiresAccess")
  const disableTransfers = getValues("disableTransfers")
  const allowForceBuyBack = getValues("allowForceBuyBack")

  const handleBackClick = () => {
    dispatch(setCreatingStep(CreateMarketSteps.PERIODS))
  }

  return (
    <Box sx={{ ...FormContainer, width: "71.5%" }}>
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

            <Button
              variant="contained"
              color="secondary"
              size="small"
              sx={{ width: "fit-content" }}
            >
              {t("createNewMarket.buttons.viewMLA")}
            </Button>
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
          value={`${getValues("minimumDeposit")} ${tokenAsset?.symbol}`}
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
          label={t("createNewMarket.lenderRestrictions.disableTransfers.label")}
          value={disableTransfers ? "Yes" : "No"}
        />

        <ConfirmationFormItem
          label={t(
            "createNewMarket.lenderRestrictions.restrictTransfers.label",
          )}
          value={transferRequiresAccess ? "Yes" : "No"}
        />

        <ConfirmationFormItem
          label={t(
            "createNewMarket.lenderRestrictions.restrictWithdrawals.label",
          )}
          value={withdrawalRequiresAccess ? "Yes" : "No"}
        />
      </Box>

      <Divider sx={DividerStyle} />

      <Typography variant="text4" sx={SubtitleStyle}>
        {t("createNewMarket.borrowerRestrictions.title")}
      </Typography>

      <Box
        sx={{
          ...SectionGrid,
          gap: "20px 12px",
          gridTemplateRows: "repeat(1, 1fr)",
          alignItems: "center",
        }}
      >
        <ConfirmationFormItem
          label={t("createNewMarket.borrowerRestrictions.buybacks.label")}
          value={allowForceBuyBack ? "Yes" : "No"}
        />

        {allowForceBuyBack && (
          <Box sx={{ width: "290px", display: "flex", gap: "6px" }}>
            <SvgIcon sx={{ "& path": { fill: COLORS.carminePink } }}>
              <Info />
            </SvgIcon>

            <Typography variant="text4" color={COLORS.carminePink}>
              {t("createNewMarket.borrowerRestrictions.alert.title")}
            </Typography>
          </Box>
        )}
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
            <Button
              size="large"
              variant="contained"
              sx={{ width: "168px", borderRadius: "12px" }}
              disabled={signed}
              onClick={() => setSigned(true)}
            >
              {t("createNewMarket.buttons.signMLA")}
            </Button>
          )}

          <Button
            size="large"
            variant="contained"
            sx={{ width: "168px", borderRadius: "12px" }}
            disabled={isMLA && !signed}
            onClick={handleDeploy}
          >
            {t("createNewMarket.buttons.deploy")}
          </Button>
        </Box>
      </Box>
    </Box>
  )
}
