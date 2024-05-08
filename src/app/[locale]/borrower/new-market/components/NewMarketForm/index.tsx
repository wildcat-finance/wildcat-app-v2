"use client"

import { useState } from "react"

import {
  Box,
  Button,
  Divider,
  InputAdornment,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material"
import SvgIcon from "@mui/material/SvgIcon"
import { Token } from "@wildcatfi/wildcat-sdk"
import Link from "next/link"

import { useDeployMarket } from "@/app/[locale]/borrower/new-market/hooks/useDeployMarket"
import {
  defaultMarketForm,
  useNewMarketForm,
} from "@/app/[locale]/borrower/new-market/hooks/useNewMarketForm"
import { MarketValidationSchemaType } from "@/app/[locale]/borrower/new-market/validation/validationSchema"
import BackArrow from "@/assets/icons/arrowLeft_icon.svg"
import { ExtendedSelect } from "@/components/@extended/ExtendedSelect"
import { ExtendedSelectOptionItem } from "@/components/@extended/ExtendedSelect/type"
import { InputLabel } from "@/components/InputLabel"
import { NumberTextField } from "@/components/NumberTextfield"
import { TextfieldChip } from "@/components/TextfieldAdornments/TextfieldChip"
import { useGetController } from "@/hooks/useGetController"
import {
  mockedKYCPreferencesOptions,
  mockedMarketTypesOptions,
  mockedMLATemplatesOptions,
} from "@/mocks/mocks"
import { ROUTES } from "@/routes"
import { useAppDispatch } from "@/store/hooks"
import { setNextStep } from "@/store/slices/routingSlice/routingSlice"

import {
  BackButton,
  BackButtonArrow,
  ButtonsContainer,
  DividerStyle,
  DropdownOption,
  InputGroupContainer,
  NextButton,
} from "./style"

export const NewMarketForm = () => {
  const { data: controller, isLoading: isControllerLoading } =
    useGetController()

  const { deployNewMarket, isDeploying } = useDeployMarket()

  const {
    handleSubmit,
    getValues,
    setValue,
    watch,
    register,
    formState: { errors },
    trigger,
    setFocus,
    setError,
  } = useNewMarketForm()

  const assetWatch = watch("asset")

  const [tokenAsset, setTokenAsset] = useState<Token | undefined>()
  const [selectedType, setSelectedType] =
    useState<ExtendedSelectOptionItem | null>(mockedMarketTypesOptions[0])
  const [selectedKYC, setSelectedKYC] =
    useState<ExtendedSelectOptionItem | null>(mockedKYCPreferencesOptions[0])
  const [selectedMLA, setSelectedMLA] =
    useState<ExtendedSelectOptionItem | null>(mockedMLATemplatesOptions[0])

  const handleMarketTypeSelect = (value: ExtendedSelectOptionItem | null) => {
    setValue("marketType", value?.value || "")
    setSelectedType(value)
  }
  const handleKYCSelect = (value: ExtendedSelectOptionItem | null) => {
    setValue("kyc", value?.value || "")
    setSelectedKYC(value)
  }
  const handleMLASelect = (value: ExtendedSelectOptionItem | null) => {
    setValue("mla", value?.value || "")
    setSelectedMLA(value)
  }

  const handleValidateForm = async () => {
    const isValid = await trigger()

    if (!isValid) {
      const firstErrorField = Object.keys(
        errors,
      )[0] as keyof MarketValidationSchemaType

      if (firstErrorField) setFocus(firstErrorField)
    }

    return isValid
  }

  const setTokenSelectError = (message: string) => {
    setError("asset", {
      type: "manual",
      message,
    })
  }

  const assetRegister = register("asset")
  const marketTypeRegister = register("marketType")
  const kycRegister = register("kyc")
  const mlaRegister = register("mla")

  const handleTokenSelect = async (value: string) => {
    setValue("asset", value)
    await trigger("asset")
  }

  const getNumberFieldDefaultValue = (
    field: keyof MarketValidationSchemaType,
  ) => defaultMarketForm[field]

  const dispatch = useAppDispatch()
  const handleClickNext = () => {
    dispatch(setNextStep())
  }

  const isLoading = isDeploying || isControllerLoading

  // const handleDeployMarket = handleSubmit(() => {
  //   const marketParams = getValues()
  //
  //   if (assetData && tokenAsset) {
  //     deployNewMarket({
  //       namePrefix: `${marketParams.namePrefix.trimEnd()} `,
  //       symbolPrefix: marketParams.symbolPrefix,
  //       annualInterestBips: Number(marketParams.annualInterestBips) * 100,
  //       delinquencyFeeBips: Number(marketParams.delinquencyFeeBips) * 100,
  //       reserveRatioBips: Number(marketParams.reserveRatioBips) * 100,
  //       delinquencyGracePeriod:
  //         Number(marketParams.delinquencyGracePeriod) * 60 * 60,
  //       withdrawalBatchDuration:
  //         Number(marketParams.withdrawalBatchDuration) * 60 * 60,
  //       maxTotalSupply: Number(marketParams.maxTotalSupply.replace(/,/g, "")), // Remove commas from maxTotalSupply
  //       assetData: tokenAsset,
  //     })
  //   }
  // })

  return (
    <Box>
      <Box marginBottom="28px">
        <Typography variant="title2">Create New market</Typography>
      </Box>

      <Typography variant="text1">Definition</Typography>

      <InputLabel label="Market Name" margin="16px 0 0 0">
        <TextField label="Use more than 1 character, e.g. blsm" />
      </InputLabel>

      <Box sx={InputGroupContainer}>
        <InputLabel label="Master Loan Agreement">
          <ExtendedSelect label="Please Select">
            <MenuItem value="noMLA" sx={DropdownOption}>
              No MLA
            </MenuItem>
            <MenuItem value="wildcatMLA" sx={DropdownOption}>
              Wildcat MLA template
            </MenuItem>
          </ExtendedSelect>
        </InputLabel>

        <InputLabel label="KYC Preferences">
          <ExtendedSelect label="Please Select">
            <MenuItem value="share" sx={DropdownOption}>
              Share contact info for direct KYC
            </MenuItem>
          </ExtendedSelect>
        </InputLabel>

        <InputLabel label="Select market type">
          <ExtendedSelect label="Please Select">
            <MenuItem value="standard" sx={DropdownOption}>
              Standard Wildcat Market
            </MenuItem>
          </ExtendedSelect>
        </InputLabel>

        <InputLabel label="Underlying asset">
          <TextField label="Search name or paste address" />
        </InputLabel>
      </Box>

      <InputLabel label="Market token name" margin="36px 0 0 0">
        <TextField
          label="Use more than 1 character, e.g. Blossom"
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <TextfieldChip text="Asset Name" />
              </InputAdornment>
            ),
          }}
        />
      </InputLabel>

      <InputLabel label="Market token symbol" margin="36px 0 0 0">
        <TextField
          label="Use more than 1 character, e.g. blsm"
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <TextfieldChip text="Asset Symbol" />
              </InputAdornment>
            ),
          }}
        />
      </InputLabel>

      <Divider sx={DividerStyle} />

      <Typography variant="title3">Amount and Duties</Typography>

      <Box sx={InputGroupContainer}>
        <InputLabel label="Max. Borrowing Capacity">
          <NumberTextField
            label="under 1000"
            endAdornment={<TextfieldChip text="Token Symbol" />}
            {...register("maxTotalSupply")}
          />
        </InputLabel>

        <InputLabel label="Base APR">
          <TextField
            label="10-20"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Typography variant="text3">%</Typography>
                </InputAdornment>
              ),
            }}
          />
        </InputLabel>

        <InputLabel label="Penalty APR">
          <TextField
            label="10-20"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Typography variant="text3">%</Typography>
                </InputAdornment>
              ),
            }}
          />
        </InputLabel>

        <InputLabel label="Reserve Ratio">
          <TextField
            label="10-20"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Typography variant="text3">%</Typography>
                </InputAdornment>
              ),
            }}
          />
        </InputLabel>
      </Box>

      <Divider sx={DividerStyle} />

      <Typography variant="title3">Grace and Withdrawals</Typography>

      <Box sx={InputGroupContainer}>
        <InputLabel label="Grace period">
          <TextField
            label="10-20"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Typography variant="text3">hours</Typography>
                </InputAdornment>
              ),
            }}
          />
        </InputLabel>

        <InputLabel label="Withdrawal cycle length">
          <TextField
            label="10-20"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Typography variant="text3">hours</Typography>
                </InputAdornment>
              ),
            }}
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
        >
          Next
        </Button>
      </Box>
    </Box>
  )
}
