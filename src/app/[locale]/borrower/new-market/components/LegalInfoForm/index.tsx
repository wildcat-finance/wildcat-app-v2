import {
  Box,
  Button,
  SelectChangeEvent,
  TextField,
  Typography,
} from "@mui/material"
import SvgIcon from "@mui/material/SvgIcon"
import { UseFormReturn } from "react-hook-form"

import { InfoValidationSchemaType } from "@/app/[locale]/borrower/new-market/validation/validationSchema"
import BackArrow from "@/assets/icons/arrowLeft_icon.svg"
import { ExtendedSelect } from "@/components/@extended/ExtendedSelect"
import { InputLabel } from "@/components/InputLabel"
import { mockedNaturesOptions } from "@/mocks/mocks"
import { useAppDispatch } from "@/store/hooks"
import {
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
  const {
    register,
    setValue,
    getValues,
    formState: { errors, isValid },
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

  return (
    <Box maxWidth="766px" width="100%">
      <Box sx={TitleContainer}>
        <Typography variant="title2">Share your legal info with us</Typography>
        <Typography variant="text2" sx={Description}>
          It’s necessary for creating markets with MLA
        </Typography>
      </Box>

      <InputLabel label="Full legal name" margin="16px 0 0 0" tooltipText="TBD">
        <TextField
          label="Use more than 1 character"
          error={Boolean(errors.legalName)}
          helperText={errors.legalName?.message}
          {...register("legalName")}
        />
      </InputLabel>

      <Box sx={InputGroupContainer}>
        <InputLabel label="Jurisdiction" tooltipText="TBD">
          <TextField
            label="Use code of country"
            error={Boolean(errors.jurisdiction)}
            helperText={errors.jurisdiction?.message}
            {...register("jurisdiction")}
          />
        </InputLabel>

        <InputLabel label="Legal Nature" tooltipText="TBD">
          <ExtendedSelect
            label="Please Select"
            value={
              mockedNaturesOptions.find(
                (el) => el.value === getValues("legalNature"),
              )?.value
            }
            options={mockedNaturesOptions}
            optionSX={DropdownOption}
            onChange={handleNatureSelect}
          />
        </InputLabel>

        <InputLabel label="Address" tooltipText="TBD">
          <TextField
            label="Enter a location"
            error={Boolean(errors.address)}
            helperText={errors.address?.message}
            {...register("address")}
          />
        </InputLabel>

        <InputLabel label="Email" tooltipText="TBD">
          <TextField
            label="example@domain.com"
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
          Back
        </Button>

        <Button
          size="large"
          variant="contained"
          sx={ConfirmButton}
          onClick={handleClickConfirm}
          disabled={!isValid}
        >
          Confirm
        </Button>
      </Box>
    </Box>
  )
}
