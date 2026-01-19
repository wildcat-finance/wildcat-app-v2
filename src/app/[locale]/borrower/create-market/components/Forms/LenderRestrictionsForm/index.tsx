import { useEffect } from "react"

import { Box, Switch, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import { FormFooter } from "@/app/[locale]/borrower/create-market/components/FormFooter"
import { FormContainer } from "@/app/[locale]/borrower/create-market/components/Forms/style"
import { HorizontalInputLabel } from "@/components/HorisontalInputLabel"
import { useAppDispatch } from "@/store/hooks"
import {
  CreateMarketSteps,
  setCreatingStep,
  setIsDisabled,
  setIsValid,
} from "@/store/slices/createMarketSidebarSlice/createMarketSidebarSlice"

import { LenderRestrictionsFormProps } from "./interface"

export const LenderRestrictionsForm = ({
  form,
}: LenderRestrictionsFormProps) => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()

  const { setValue, watch } = form

  const withdrawalRequiresAccessWatch = watch("withdrawalRequiresAccess")
  const disableTransfersWatch = watch("disableTransfers")
  const transferRequiresAccessWatch = watch("transferRequiresAccess")

  const handleNextClick = () => {
    dispatch(setCreatingStep(CreateMarketSteps.MLA))
  }

  const handleBackClick = () => {
    dispatch(setCreatingStep(CreateMarketSteps.FINANCIAL))
  }

  useEffect(() => {
    dispatch(setIsValid({ step: CreateMarketSteps.LRESTRICTIONS, valid: true }))
    dispatch(
      setIsDisabled({
        steps: [],
        disabled: false,
      }),
    )
  }, [])

  return (
    <Box sx={FormContainer}>
      <Typography variant="title2" sx={{ marginBottom: "36px" }}>
        {t("createNewMarket.lenderRestrictions.title")}
      </Typography>

      <Box
        sx={{
          display: "flex",
          width: "100%",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        <HorizontalInputLabel
          label={t(
            "createNewMarket.lenderRestrictions.restrictWithdrawals.label",
          )}
          explainer={t(
            "createNewMarket.lenderRestrictions.restrictWithdrawals.explainer",
          )}
        >
          <Switch
            checked={Boolean(withdrawalRequiresAccessWatch)}
            onChange={(e) => {
              setValue("withdrawalRequiresAccess", e.target.checked)
            }}
          />
        </HorizontalInputLabel>

        <HorizontalInputLabel
          label={t(
            "createNewMarket.lenderRestrictions.restrictTransfers.label",
          )}
          explainer={t(
            "createNewMarket.lenderRestrictions.restrictTransfers.explainer",
          )}
        >
          <Switch
            checked={Boolean(transferRequiresAccessWatch)}
            onChange={(e) => {
              setValue("transferRequiresAccess", e.target.checked)
            }}
          />
        </HorizontalInputLabel>

        <HorizontalInputLabel
          label={t("createNewMarket.lenderRestrictions.disableTransfers.label")}
          explainer={t(
            "createNewMarket.lenderRestrictions.disableTransfers.explainer",
          )}
        >
          <Switch
            checked={Boolean(disableTransfersWatch)}
            onChange={(e) => {
              setValue("disableTransfers", e.target.checked)
            }}
          />
        </HorizontalInputLabel>
      </Box>

      <FormFooter
        backOnClick={handleBackClick}
        nextOnClick={handleNextClick}
        disableNext={false}
      />
    </Box>
  )
}
