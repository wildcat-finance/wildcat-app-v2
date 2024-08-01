import { useEffect } from "react"

import {
  Box,
  Button,
  SelectChangeEvent,
  TextField,
  Typography,
} from "@mui/material"
import SvgIcon from "@mui/material/SvgIcon"
import { UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { InfoValidationSchemaType } from "@/app/[locale]/borrower/new-market/validation/validationSchema"
import BackArrow from "@/assets/icons/arrowLeft_icon.svg"
import { ExtendedSelect } from "@/components/@extended/ExtendedSelect"
import { InputLabel } from "@/components/InputLabel"
import { mockedNaturesOptions } from "@/mocks/mocks"
import { useAppDispatch } from "@/store/hooks"
import {
  setDisableConfirmationStepSidebar,
  setNextStep,
  setPreviousStep,
} from "@/store/slices/routingSlice/routingSlice"

import {
  ConfirmButton,
  BackButton,
  BackButtonArrow,
  ButtonsContainer,
  Description,
  DropdownOption,
  InputGroupContainer,
  TitleContainer,
} from "./style"

export type LegalInfoFormProps = {
  form: UseFormReturn<InfoValidationSchemaType>
}

export const LegalInfoForm = ({ form }: LegalInfoFormProps) => {
  const { t } = useTranslation()

  const {
    register,
    setValue,
    formState: { errors, isValid },
    control,
  } = form

  const handleNatureSelect = (event: SelectChangeEvent<string | null>) => {
    setValue("legalNature", event.target.value?.toString() || "")
  }

  const dispatch = useAppDispatch()

  const handleClickBack = () => {
    dispatch(setPreviousStep())
  }

  const handleClickConfirm = () => {
    dispatch(setNextStep())
  }

  useEffect(() => {
    dispatch(setDisableConfirmationStepSidebar(!isValid))
  }, [isValid])

  return (
    <Box maxWidth="766px" width="100%">
      <Box sx={TitleContainer}>
        <Typography variant="title2">
          {t("createMarket.forms.legalInfo.title")}
        </Typography>
        <Typography variant="text2" sx={Description}>
          {t("createMarket.forms.legalInfo.subtitle")}
        </Typography>
      </Box>

      <InputLabel
        label={t("createMarket.forms.legalInfo.block.legalName.title")}
        tooltipText={t("createMarket.forms.legalInfo.block.legalName.tooltip")}
        margin="16px 0 0 0"
      >
        <TextField
          label={t("createMarket.forms.legalInfo.block.legalName.placeholder")}
          error={Boolean(errors.legalName)}
          helperText={errors.legalName?.message}
          {...register("legalName")}
        />
      </InputLabel>

      <Box sx={InputGroupContainer}>
        <InputLabel
          label={t("createMarket.forms.legalInfo.block.jurisdiction.title")}
          tooltipText={t(
            "createMarket.forms.legalInfo.block.jurisdiction.tooltip",
          )}
        >
          <TextField
            label={t(
              "createMarket.forms.legalInfo.block.jurisdiction.placeholder",
            )}
            error={Boolean(errors.jurisdiction)}
            helperText={errors.jurisdiction?.message}
            {...register("jurisdiction")}
          />
        </InputLabel>

        <InputLabel
          label={t("createMarket.forms.legalInfo.block.nature.title")}
          tooltipText={t("createMarket.forms.legalInfo.block.nature.tooltip")}
        >
          <ExtendedSelect
            label={t("createMarket.forms.legalInfo.block.nature.placeholder")}
            control={control}
            name="legalNature"
            options={mockedNaturesOptions}
            optionSX={DropdownOption}
            onChange={handleNatureSelect}
          />
        </InputLabel>

        <InputLabel
          label={t("createMarket.forms.legalInfo.block.address.title")}
          tooltipText={t("createMarket.forms.legalInfo.block.address.tooltip")}
        >
          <TextField
            label={t("createMarket.forms.legalInfo.block.address.placeholder")}
            error={Boolean(errors.address)}
            helperText={errors.address?.message}
            {...register("address")}
          />
        </InputLabel>

        <InputLabel
          label={t("createMarket.forms.legalInfo.block.email.title")}
          tooltipText={t("createMarket.forms.legalInfo.block.email.tooltip")}
        >
          <TextField
            label={t("createMarket.forms.legalInfo.block.email.placeholder")}
            error={Boolean(errors.email)}
            helperText={errors.email?.message}
            {...register("email")}
          />
        </InputLabel>
      </Box>

      <Box sx={ButtonsContainer}>
        <Button
          size="large"
          variant="text"
          sx={BackButton}
          onClick={handleClickBack}
        >
          <SvgIcon fontSize="medium" sx={BackButtonArrow}>
            <BackArrow />
          </SvgIcon>
          {t("createMarket.buttons.back")}
        </Button>

        <Button
          size="large"
          variant="contained"
          sx={ConfirmButton}
          onClick={handleClickConfirm}
          disabled={!isValid}
        >
          {t("createMarket.buttons.confirm")}
        </Button>
      </Box>
    </Box>
  )
}
