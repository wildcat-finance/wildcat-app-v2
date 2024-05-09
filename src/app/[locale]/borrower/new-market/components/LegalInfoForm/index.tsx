import { useState } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { Box, Button, TextField, Typography } from "@mui/material"
import SvgIcon from "@mui/material/SvgIcon"
import { useForm } from "react-hook-form"

import {
  infoValidationSchema,
  InfoValidationSchemaType,
} from "@/app/[locale]/borrower/new-market/validation/validationSchema"
import BackArrow from "@/assets/icons/arrowLeft_icon.svg"
import { ExtendedSelect } from "@/components/@extended/ExtendedSelect"
import { ExtendedSelectOptionItem } from "@/components/@extended/ExtendedSelect/type"
import { InputLabel } from "@/components/InputLabel"
import { mockedJurisdictionsOptions, mockedNaturesOptions } from "@/mocks/mocks"
import { useAppDispatch } from "@/store/hooks"
import { setPreviousStep } from "@/store/slices/routingSlice/routingSlice"

import {
  BackButton,
  BackButtonArrow,
  ButtonsContainer,
  Description,
  DropdownOption,
  InputGroupContainer,
  TitleContainer,
} from "./style"
import { ConfirmationModal } from "../ConfirmationModal"

export const LegalInfoForm = () => {
  const {
    register,
    setValue,
    formState: { errors },
  } = useForm<InfoValidationSchemaType>({
    resolver: zodResolver(infoValidationSchema),
    mode: "onChange",
  })

  const [jurisdiction, setJurisdiction] =
    useState<ExtendedSelectOptionItem | null>(mockedJurisdictionsOptions[0])
  const [nature, setNature] = useState<ExtendedSelectOptionItem | null>(
    mockedNaturesOptions[0],
  )

  const handleJurisdictionSelect = (value: ExtendedSelectOptionItem | null) => {
    setValue("jurisdiction", value?.value || "")
    setJurisdiction(value)
  }
  const handleNatureSelect = (value: ExtendedSelectOptionItem | null) => {
    setValue("legalNature", value?.value || "")
    setNature(value)
  }

  const dispatch = useAppDispatch()

  const handleClickBack = () => {
    dispatch(setPreviousStep())
  }

  return (
    <Box>
      <Box sx={TitleContainer}>
        <Typography variant="title2">Share your legal info with us</Typography>
        <Typography variant="text2" sx={Description}>
          It’s necessary for creating markets with MLA
        </Typography>
      </Box>

      <InputLabel label="Full legal name" margin="16px 0 0 0">
        <TextField
          label="Use more than 1 character"
          error={Boolean(errors.legalName)}
          helperText={errors.legalName?.message}
          {...register("legalName")}
        />
      </InputLabel>

      <Box sx={InputGroupContainer}>
        <InputLabel label="Jurisdiction">
          <ExtendedSelect
            label="Please Select"
            options={mockedJurisdictionsOptions}
            optionSX={DropdownOption}
          />
        </InputLabel>

        <InputLabel label="Legal Nature">
          <ExtendedSelect
            label="Please Select"
            options={mockedNaturesOptions}
            optionSX={DropdownOption}
          />
        </InputLabel>

        <InputLabel label="Address">
          <TextField
            label="Enter a location"
            error={Boolean(errors.address)}
            helperText={errors.address?.message}
            {...register("address")}
          />
        </InputLabel>

        <InputLabel label="Email">
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

        <ConfirmationModal />
      </Box>
    </Box>
  )
}
