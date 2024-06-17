"use client"

import { useEffect } from "react"

import {
  Box,
  Button,
  Divider,
  InputAdornment,
  TextField,
  Typography,
} from "@mui/material"
import SvgIcon from "@mui/material/SvgIcon"
import { Token } from "@wildcatfi/wildcat-sdk"
import Link from "next/link"
import { UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { TokenInfo } from "@/app/api/tokens-list/interface"
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
import { UnderlyingAssetSelect } from "./UnderlyingAssetSelect"
import { MarketValidationSchemaType } from "../../validation/validationSchema"

type NewMarketFormProps = {
  form: UseFormReturn<MarketValidationSchemaType>
  tokenAsset: Token | undefined
}

export const NewMarketForm = ({ form, tokenAsset }: NewMarketFormProps) => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()

  const {
    getValues,
    setValue,
    register,
    formState: { errors, isValid },
    control,
    watch,
  } = form

  const mlaWatch = watch("mla")

  const hideLegalInfoStep = useAppSelector(
    (state) => state.routing.hideInfoStep,
  )

  const handleTokenSelect = (asset: TokenInfo | null) => {
    setValue("asset", asset ? asset.address : "")
  }

  const handleClickNext = () => {
    dispatch(
      setNextStep(hideLegalInfoStep ? "confirmation" : "legalInformation"),
    )
  }

  useEffect(() => {
    if (mlaWatch === "wildcatMLA") {
      dispatch(setHideInfoStep(false))
    } else {
      dispatch(setHideInfoStep(true))
    }
  }, [mlaWatch])

  useEffect(() => {
    if (hideLegalInfoStep) {
      dispatch(setDisableConfirmationStepSidebar(!isValid))
      dispatch(setDisableInfoStepSidebar(true))
    } else {
      dispatch(setDisableConfirmationStepSidebar(true))
      dispatch(setDisableInfoStepSidebar(!isValid))
    }
  }, [isValid, hideLegalInfoStep])

  const tokenSelectorFormProps = register("asset")

  return (
    <Box maxWidth="766px" width="100%">
      <Box marginBottom="20px">
        <Typography variant="title2">
          {t("createMarket.forms.marketDescription.title")}
        </Typography>
      </Box>

      <Typography variant="text1">
        {t("createMarket.forms.marketDescription.block.title.definition")}
      </Typography>

      <InputLabel
        label={t("createMarket.forms.marketDescription.block.marketName.title")}
        margin="16px 0 0 0"
        tooltipText={t(
          "createMarket.forms.marketDescription.block.marketName.tooltip",
        )}
      >
        <TextField
          label={t(
            "createMarket.forms.marketDescription.block.marketName.placeholder",
          )}
          error={Boolean(errors.marketName)}
          helperText={errors.marketName?.message}
          {...register("marketName")}
        />
      </InputLabel>

      <Box sx={InputGroupContainer} marginTop="36px">
        <InputLabel
          label={t("createMarket.forms.marketDescription.block.mla.title")}
          tooltipText={t(
            "createMarket.forms.marketDescription.block.mla.tooltip",
          )}
        >
          <ExtendedSelect
            control={control}
            name="mla"
            label={t(
              "createMarket.forms.marketDescription.block.mla.placeholder",
            )}
            options={mockedMLATemplatesOptions}
            optionSX={DropdownOption}
          />
        </InputLabel>

        <InputLabel
          label={t("createMarket.forms.marketDescription.block.kyc.title")}
          tooltipText={t(
            "createMarket.forms.marketDescription.block.kyc.tooltip",
          )}
        >
          <ExtendedSelect
            control={control}
            name="kyc"
            label={t(
              "createMarket.forms.marketDescription.block.kyc.placeholder",
            )}
            options={mockedKYCPreferencesOptions}
            optionSX={DropdownOption}
          />
        </InputLabel>

        <InputLabel
          label={t(
            "createMarket.forms.marketDescription.block.marketType.title",
          )}
          tooltipText={t(
            "createMarket.forms.marketDescription.block.marketType.tooltip",
          )}
        >
          <ExtendedSelect
            control={control}
            name="marketType"
            label={t(
              "createMarket.forms.marketDescription.block.marketType.placeholder",
            )}
            options={mockedMarketTypesOptions}
            optionSX={DropdownOption}
          />
        </InputLabel>

        <InputLabel
          label={t(
            "createMarket.forms.marketDescription.block.marketAsset.title",
          )}
          tooltipText={t(
            "createMarket.forms.marketDescription.block.marketAsset.tooltip",
          )}
        >
          <UnderlyingAssetSelect
            handleTokenSelect={handleTokenSelect}
            onBlur={tokenSelectorFormProps.onBlur}
            ref={tokenSelectorFormProps.ref}
            error={Boolean(errors.asset)}
            errorText={errors.asset?.message}
          />
        </InputLabel>
      </Box>

      <InputLabel
        label={t(
          "createMarket.forms.marketDescription.block.marketTokenName.title",
        )}
        tooltipText={t(
          "createMarket.forms.marketDescription.block.marketTokenName.tooltip",
        )}
        margin="36px 0 0 0"
      >
        <TextField
          label={t(
            "createMarket.forms.marketDescription.block.marketTokenName.placeholder",
          )}
          error={Boolean(errors.namePrefix)}
          helperText={errors.namePrefix?.message}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <TextfieldChip
                  text={
                    tokenAsset?.name ||
                    `${t(
                      "createMarket.forms.marketDescription.block.marketTokenName.chip",
                    )}`
                  }
                />
              </InputAdornment>
            ),
          }}
          {...register("namePrefix")}
        />
      </InputLabel>

      <InputLabel
        label={t(
          "createMarket.forms.marketDescription.block.marketTokenSymbol.title",
        )}
        tooltipText={t(
          "createMarket.forms.marketDescription.block.marketTokenSymbol.tooltip",
        )}
        margin="36px 0 0 0"
      >
        <TextField
          label={t(
            "createMarket.forms.marketDescription.block.marketTokenSymbol.placeholder",
          )}
          error={Boolean(errors.symbolPrefix)}
          helperText={errors.symbolPrefix?.message}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <TextfieldChip
                  text={
                    tokenAsset?.symbol ||
                    `${t(
                      "createMarket.forms.marketDescription.block.marketTokenSymbol.chip",
                    )}`
                  }
                />
              </InputAdornment>
            ),
          }}
          {...register("symbolPrefix")}
        />
      </InputLabel>

      <Divider sx={DividerStyle} />

      <Typography variant="text1">
        {t("createMarket.forms.marketDescription.block.title.amountDuties")}
      </Typography>

      <Box sx={InputGroupContainer} marginTop="16px">
        <InputLabel
          label={t("createMarket.forms.marketDescription.block.capacity.title")}
          tooltipText={t(
            "createMarket.forms.marketDescription.block.capacity.tooltip",
          )}
        >
          <NumberTextField
            label={t(
              "createMarket.forms.marketDescription.block.capacity.placeholder",
            )}
            value={getValues("maxTotalSupply")}
            error={Boolean(errors.maxTotalSupply)}
            helperText={errors.maxTotalSupply?.message}
            endAdornment={
              <TextfieldChip
                text={
                  tokenAsset?.symbol ||
                  `${t(
                    "createMarket.forms.marketDescription.block.capacity.chip",
                  )}`
                }
              />
            }
            {...register("maxTotalSupply")}
          />
        </InputLabel>

        <InputLabel
          label={t("createMarket.forms.marketDescription.block.baseAPR.title")}
          tooltipText={t(
            "createMarket.forms.marketDescription.block.baseAPR.tooltip",
          )}
        >
          <NumberTextField
            label={t(
              "createMarket.forms.marketDescription.block.baseAPR.placeholder",
            )}
            value={getValues("annualInterestBips")}
            error={Boolean(errors.annualInterestBips)}
            helperText={errors.annualInterestBips?.message}
            endAdornment={
              <Typography variant="text2" sx={endDecorator}>
                {t("createMarket.forms.marketDescription.block.baseAPR.chip")}
              </Typography>
            }
            {...register("annualInterestBips")}
          />
        </InputLabel>

        <InputLabel
          label={t(
            "createMarket.forms.marketDescription.block.penaltyAPR.title",
          )}
          tooltipText={t(
            "createMarket.forms.marketDescription.block.penaltyAPR.tooltip",
          )}
        >
          <NumberTextField
            label={t(
              "createMarket.forms.marketDescription.block.penaltyAPR.placeholder",
            )}
            value={getValues("delinquencyFeeBips")}
            error={Boolean(errors.delinquencyFeeBips)}
            helperText={errors.delinquencyFeeBips?.message}
            endAdornment={
              <Typography variant="text2" sx={endDecorator}>
                {t(
                  "createMarket.forms.marketDescription.block.penaltyAPR.chip",
                )}
              </Typography>
            }
            {...register("delinquencyFeeBips")}
          />
        </InputLabel>

        <InputLabel
          label={t("createMarket.forms.marketDescription.block.ratio.title")}
          tooltipText={t(
            "createMarket.forms.marketDescription.block.ratio.tooltip",
          )}
        >
          <NumberTextField
            label={t(
              "createMarket.forms.marketDescription.block.ratio.placeholder",
            )}
            value={getValues("reserveRatioBips")}
            error={Boolean(errors.reserveRatioBips)}
            helperText={errors.reserveRatioBips?.message}
            endAdornment={
              <Typography variant="text2" sx={endDecorator}>
                {t("createMarket.forms.marketDescription.block.ratio.chip")}
              </Typography>
            }
            {...register("reserveRatioBips")}
          />
        </InputLabel>
        <InputLabel
          label={t("createMarket.forms.marketDescription.block.deposit.title")}
          subtitle={t(
            "createMarket.forms.marketDescription.block.deposit.subtitle",
          )}
          tooltipText={t(
            "createMarket.forms.marketDescription.block.deposit.tooltip",
          )}
        >
          <NumberTextField
            label="0"
            value={getValues("minimumDeposit")}
            error={Boolean(errors.minimumDeposit)}
            helperText={errors.minimumDeposit?.message}
            endAdornment={
              <TextfieldChip
                text={
                  tokenAsset?.symbol ||
                  `${t(
                    "createMarket.forms.marketDescription.block.deposit.chip",
                  )}`
                }
              />
            }
            {...register("minimumDeposit")}
          />
        </InputLabel>
      </Box>

      <Divider sx={DividerStyle} />

      <Typography variant="text1">
        {t("createMarket.forms.marketDescription.block.title.graceWithdrawals")}
      </Typography>

      <Box sx={InputGroupContainer} marginTop="16px">
        <InputLabel
          label={t(
            "createMarket.forms.marketDescription.block.gracePeriod.title",
          )}
          tooltipText={t(
            "createMarket.forms.marketDescription.block.gracePeriod.tooltip",
          )}
        >
          <NumberTextField
            label={t(
              "createMarket.forms.marketDescription.block.gracePeriod.placeholder",
            )}
            value={getValues("delinquencyGracePeriod")}
            error={Boolean(errors.delinquencyGracePeriod)}
            helperText={errors.delinquencyGracePeriod?.message}
            endAdornment={
              <Typography variant="text2" sx={endDecorator}>
                {t(
                  "createMarket.forms.marketDescription.block.gracePeriod.chip",
                )}
              </Typography>
            }
            {...register("delinquencyGracePeriod")}
          />
        </InputLabel>

        <InputLabel
          label={t(
            "createMarket.forms.marketDescription.block.withdrawalCycle.title",
          )}
          tooltipText={t(
            "createMarket.forms.marketDescription.block.withdrawalCycle.tooltip",
          )}
        >
          <NumberTextField
            label={t(
              "createMarket.forms.marketDescription.block.withdrawalCycle.placeholder",
            )}
            value={getValues("withdrawalBatchDuration")}
            error={Boolean(errors.withdrawalBatchDuration)}
            helperText={errors.withdrawalBatchDuration?.message}
            endAdornment={
              <Typography variant="text2" sx={endDecorator}>
                {t(
                  "createMarket.forms.marketDescription.block.withdrawalCycle.chip",
                )}
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
            {t("createMarket.buttons.back")}
          </Button>
        </Link>

        <Button
          size="large"
          variant="contained"
          sx={NextButton}
          onClick={handleClickNext}
          disabled={!isValid}
        >
          {hideLegalInfoStep
            ? t("createMarket.buttons.confirm")
            : t("createMarket.buttons.next")}
        </Button>
      </Box>
    </Box>
  )
}
