"use client"

import { useEffect, useState } from "react"

import {
  Box,
  Button,
  Divider,
  InputAdornment,
  SelectChangeEvent,
  TextField,
  Typography,
} from "@mui/material"
import SvgIcon from "@mui/material/SvgIcon"
import { Token } from "@wildcatfi/wildcat-sdk"
import Link from "next/link"
import { UseFormReturn } from "react-hook-form"

import { FinalPopup } from "@/app/[locale]/borrower/new-market/components/Popups/FinalPopup"
import { LoadingPopup } from "@/app/[locale]/borrower/new-market/components/Popups/LoadingPopup"
import { defaultMarketForm } from "@/app/[locale]/borrower/new-market/hooks/useNewMarketForm"
import { MarketValidationSchemaType } from "@/app/[locale]/borrower/new-market/validation/validationSchema"
import BackArrow from "@/assets/icons/arrowLeft_icon.svg"
import { ExtendedSelect } from "@/components/@extended/ExtendedSelect"
import { InputLabel } from "@/components/InputLabel"
import { NumberTextField } from "@/components/NumberTextfield"
import { TextfieldChip } from "@/components/TextfieldAdornments/TextfieldChip"
import {
  mockedKYCPreferencesOptions,
  mockedMarketTypesOptions,
  mockedMLATemplatesOptions,
} from "@/mocks/mocks"
import { ROUTES } from "@/routes"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  setDisableConfirmationStepSidebar,
  setDisableInfoStepSidebar,
  setHideInfoStep,
  setNextStep,
} from "@/store/slices/routingSlice/routingSlice"

import {
  BackButton,
  BackButtonArrow,
  ButtonsContainer,
  DividerStyle,
  DropdownOption,
  endDecorator,
  InputGroupContainer,
  NextButton,
} from "./style"
import { TokenSelector } from "./UnderlyingAssetSelect"

type NewMarketFormProps = {
  form: UseFormReturn<MarketValidationSchemaType>
  tokenAsset: Token | undefined
}

export const NewMarketForm = ({ form, tokenAsset }: NewMarketFormProps) => {
  const dispatch = useAppDispatch()

  const hideLegalInfoStep = useAppSelector(
    (state) => state.routing.hideInfoStep,
  )

  const {
    getValues,
    setValue,
    watch,
    register,
    formState: { errors, isValid },
    trigger,
    setFocus,
    setError,
  } = form

  const handleMLASelect = (event: SelectChangeEvent<string | null>) => {
    setValue("mla", event.target.value?.toString() || "")
    if (event.target.value === "noMLA") {
      dispatch(setHideInfoStep(true))
    } else {
      dispatch(setHideInfoStep(false))
    }
  }

  const handleKYCSelect = (event: SelectChangeEvent<string | null>) => {
    setValue("kyc", event.target.value?.toString() || "")
  }

  const handleMarketTypeSelect = (event: SelectChangeEvent<string | null>) => {
    setValue("marketType", event.target.value?.toString() || "")
  }

  const setTokenSelectError = (message: string) => {
    setError("asset", {
      type: "manual",
      message,
    })
  }

  const assetRegister = register("asset")

  const handleTokenSelect = async (value: string) => {
    setValue("asset", value)
    await trigger("asset")
  }

  const getNumberFieldDefaultValue = (
    field: keyof MarketValidationSchemaType,
  ) => defaultMarketForm[field]

  const handleClickNext = () => {
    dispatch(
      setNextStep(hideLegalInfoStep ? "confirmation" : "legalInformation"),
    )
  }

  useEffect(() => {
    if (hideLegalInfoStep) {
      dispatch(setDisableConfirmationStepSidebar(!isValid))
      dispatch(setDisableInfoStepSidebar(true))
    } else {
      dispatch(setDisableConfirmationStepSidebar(true))
      dispatch(setDisableInfoStepSidebar(!isValid))
    }
  }, [isValid, hideLegalInfoStep])

  return (
    <Box maxWidth="766px" width="100%">
      <Box marginBottom="20px">
        <Typography variant="title2">Create New market</Typography>
      </Box>

      <Typography variant="text1">Definition</Typography>

      <InputLabel label="Market Name" margin="16px 0 0 0" tooltipText="TBD">
        <TextField
          label="Use more than 1 character, e.g. blsm"
          error={Boolean(errors.marketName)}
          helperText={errors.marketName?.message}
          {...register("marketName")}
        />
      </InputLabel>

      <Box sx={InputGroupContainer} marginTop="36px">
        <InputLabel label="Master Loan Agreement" tooltipText="TBD">
          <ExtendedSelect
            label="Please Select"
            value={
              mockedMLATemplatesOptions.find(
                (el) => el.value === getValues("mla"),
              )?.value
            }
            options={mockedMLATemplatesOptions}
            optionSX={DropdownOption}
            onChange={handleMLASelect}
          />
        </InputLabel>

        <InputLabel label="KYC Preferences" tooltipText="TBD">
          <ExtendedSelect
            label="Please Select"
            value={
              mockedKYCPreferencesOptions.find(
                (el) => el.value === getValues("kyc"),
              )?.value
            }
            options={mockedKYCPreferencesOptions}
            optionSX={DropdownOption}
            onChange={handleKYCSelect}
          />
        </InputLabel>

        <InputLabel label="Select market type" tooltipText="TBD">
          <ExtendedSelect
            label="Please Select"
            value={
              mockedMarketTypesOptions.find(
                (el) => el.value === getValues("marketType"),
              )?.value
            }
            options={mockedMarketTypesOptions}
            optionSX={DropdownOption}
            onChange={handleMarketTypeSelect}
          />
        </InputLabel>

        <InputLabel label="Underlying asset" tooltipText="TBD">
          <TokenSelector />
        </InputLabel>
      </Box>

      <InputLabel
        label="Market token name"
        margin="36px 0 0 0"
        tooltipText="TBD"
      >
        <TextField
          label="Use more than 1 character, e.g. Blossom"
          error={Boolean(errors.namePrefix)}
          helperText={errors.namePrefix?.message}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <TextfieldChip text={tokenAsset?.name || "Asset Name"} />
              </InputAdornment>
            ),
          }}
          {...register("namePrefix")}
        />
      </InputLabel>

      <InputLabel
        label="Market token symbol"
        margin="36px 0 0 0"
        tooltipText="TBD"
      >
        <TextField
          label="Use more than 1 character, e.g. blsm"
          error={Boolean(errors.symbolPrefix)}
          helperText={errors.symbolPrefix?.message}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <TextfieldChip text={tokenAsset?.symbol || "Asset Symbol"} />
              </InputAdornment>
            ),
          }}
          {...register("symbolPrefix")}
        />
      </InputLabel>

      <Divider sx={DividerStyle} />

      <Typography variant="text1">Amount and Duties</Typography>

      <Box sx={InputGroupContainer} marginTop="16px">
        <InputLabel label="Max. Borrowing Capacity" tooltipText="TBD">
          <NumberTextField
            label="under 1000"
            value={getValues("maxTotalSupply")}
            error={Boolean(errors.maxTotalSupply)}
            helperText={errors.maxTotalSupply?.message}
            endAdornment={
              <TextfieldChip text={tokenAsset?.symbol || "Token Symbol"} />
            }
            {...register("maxTotalSupply")}
          />
        </InputLabel>

        <InputLabel label="Base APR" tooltipText="TBD">
          <NumberTextField
            label="10-20"
            value={getValues("annualInterestBips")}
            error={Boolean(errors.annualInterestBips)}
            helperText={errors.annualInterestBips?.message}
            endAdornment={
              <Typography variant="text2" sx={endDecorator}>
                %
              </Typography>
            }
            {...register("annualInterestBips")}
          />
        </InputLabel>

        <InputLabel label="Penalty APR" tooltipText="TBD">
          <NumberTextField
            label="10-20"
            value={getValues("delinquencyFeeBips")}
            error={Boolean(errors.delinquencyFeeBips)}
            helperText={errors.delinquencyFeeBips?.message}
            endAdornment={
              <Typography variant="text2" sx={endDecorator}>
                %
              </Typography>
            }
            {...register("delinquencyFeeBips")}
          />
        </InputLabel>

        <InputLabel label="Reserve Ratio" tooltipText="TBD">
          <NumberTextField
            label="10-20"
            value={getValues("reserveRatioBips")}
            error={Boolean(errors.reserveRatioBips)}
            helperText={errors.reserveRatioBips?.message}
            endAdornment={
              <Typography variant="text2" sx={endDecorator}>
                %
              </Typography>
            }
            {...register("reserveRatioBips")}
          />
        </InputLabel>
      </Box>

      <Divider sx={DividerStyle} />

      <Typography variant="text1">Grace and Withdrawals</Typography>

      <Box sx={InputGroupContainer} marginTop="16px">
        <InputLabel label="Grace period" tooltipText="TBD">
          <NumberTextField
            label="10-20"
            value={getValues("delinquencyGracePeriod")}
            error={Boolean(errors.delinquencyGracePeriod)}
            helperText={errors.delinquencyGracePeriod?.message}
            endAdornment={
              <Typography variant="text2" sx={endDecorator}>
                hours
              </Typography>
            }
            {...register("delinquencyGracePeriod")}
          />
        </InputLabel>

        <InputLabel label="Withdrawal cycle length" tooltipText="TBD">
          <NumberTextField
            label="10-20"
            value={getValues("withdrawalBatchDuration")}
            error={Boolean(errors.withdrawalBatchDuration)}
            helperText={errors.withdrawalBatchDuration?.message}
            endAdornment={
              <Typography variant="text2" sx={endDecorator}>
                hours
              </Typography>
            }
            {...register("withdrawalBatchDuration")}
          />
        </InputLabel>
      </Box>

      <Box sx={ButtonsContainer}>
        <Link href={ROUTES.borrower.root} passHref>
          <Button size="large" variant="text" sx={BackButton}>
            <SvgIcon fontSize="medium" sx={BackButtonArrow}>
              <BackArrow />
            </SvgIcon>
            Back
          </Button>
        </Link>

        <Button
          size="large"
          variant="contained"
          sx={NextButton}
          onClick={handleClickNext}
          disabled={!isValid}
        >
          {hideLegalInfoStep ? "Confirm" : "Next"}
        </Button>
      </Box>
    </Box>
  )
}
