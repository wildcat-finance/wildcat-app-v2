import { useEffect } from "react"

import { Box, Switch, Typography } from "@mui/material"
import { UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { FormFooter } from "@/app/[locale]/borrower/create-market/components/FormFooter"
import { FormContainer } from "@/app/[locale]/borrower/create-market/components/Forms/style"
import { MarketValidationSchemaType } from "@/app/[locale]/borrower/create-market/validation/validationSchema"
import { HorizontalInputLabel } from "@/components/HorisontalInputLabel"
import { useAppDispatch } from "@/store/hooks"
import {
  CreateMarketSteps,
  setCreatingStep,
  setIsDisabled,
  setIsValid,
} from "@/store/slices/createMarketSidebarSlice/createMarketSidebarSlice"

export type LenderRestrictionsFormProps = {
  form: UseFormReturn<MarketValidationSchemaType>
}

export const LenderRestrictionsForm = ({
  form,
}: LenderRestrictionsFormProps) => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()

  const {
    setValue,
    register,
    formState: { errors },
    control,
    watch,
  } = form

  const withdrawalRequiresAccessWatch = watch("withdrawalRequiresAccess")
  const depositRequiresAccessWatch = watch("depositRequiresAccess")
  const disableTransfersWatch = watch("disableTransfers")
  const transferRequiresAccessWatch = watch("transferRequiresAccess")

  const handleNextClick = () => {
    dispatch(setCreatingStep(CreateMarketSteps.BRESTRICTIONS))
  }

  const handleBackClick = () => {
    dispatch(setCreatingStep(CreateMarketSteps.FINANCIAL))
  }

  useEffect(() => {
    dispatch(setIsValid({ step: CreateMarketSteps.LRESTRICTIONS, valid: true }))
    dispatch(
      setIsDisabled({
        steps: [CreateMarketSteps.BRESTRICTIONS],
        disabled: false,
      }),
    )
  }, [])

  return (
    <Box sx={FormContainer}>
      <Typography variant="title2" sx={{ marginBottom: "36px" }}>
        Lender Restrictions
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
          label="Restrict Deposits"
          explainer="Requires depositors to meet KYC requirements."
        >
          <Switch
            checked={depositRequiresAccessWatch}
            onChange={(e) => {
              setValue("depositRequiresAccess", e.target.checked)
            }}
          />
        </HorizontalInputLabel>

        <HorizontalInputLabel
          label="Disable Transfers"
          explainer="Requires lenders to meet KYC requirements to request withdrawals."
        >
          <Switch
            checked={disableTransfersWatch}
            onChange={(e) => {
              setValue("disableTransfers", e.target.checked)
            }}
          />
        </HorizontalInputLabel>

        <HorizontalInputLabel
          label="Restrict Withdrawals"
          explainer="Disables all transfers of the market token."
        >
          <Switch
            checked={withdrawalRequiresAccessWatch}
            onChange={(e) => {
              setValue("withdrawalRequiresAccess", e.target.checked)
            }}
          />
        </HorizontalInputLabel>

        <HorizontalInputLabel
          label="Restrict Transfers"
          explainer="Requires transfer recipients to meet KYC requirements."
        >
          <Switch
            checked={transferRequiresAccessWatch}
            onChange={(e) => {
              setValue("transferRequiresAccess", e.target.checked)
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
