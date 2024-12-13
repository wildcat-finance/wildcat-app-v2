import { useEffect } from "react"

import { Box, InputAdornment, TextField, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import { UnderlyingAssetSelect } from "@/app/[locale]/borrower/(new-market)/components/NewMarketForm/UnderlyingAssetSelect"
import {
  FormContainer,
  SectionGrid,
} from "@/app/[locale]/borrower/create-market/components/Forms/style"
import { TokenInfo } from "@/app/api/tokens-list/interface"
import { InputLabel } from "@/components/InputLabel"
import { TextfieldChip } from "@/components/TextfieldAdornments/TextfieldChip"
import { useAppDispatch } from "@/store/hooks"
import {
  CreateMarketSteps,
  setCreatingStep,
  setIsDisabled,
  setIsValid,
} from "@/store/slices/createMarketSidebarSlice/createMarketSidebarSlice"

import { BasicSetupFormProps } from "./interface"
import { FormFooter } from "../../FormFooter"

export const BasicSetupForm = ({ form, tokenAsset }: BasicSetupFormProps) => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()

  const handleNextClick = () => {
    dispatch(setCreatingStep(CreateMarketSteps.MLA))
  }

  const handleBackClick = () => {
    dispatch(setCreatingStep(CreateMarketSteps.POLICY))
  }

  const {
    setValue,
    register,
    formState: { errors },
    watch,
  } = form

  const tokenSelectorFormProps = register("asset")
  const namePrefixWatch = watch("namePrefix")
  const symbolPrefixWatch = watch("symbolPrefix")
  const assetWatch = watch("asset")

  const isFormValid =
    !!namePrefixWatch &&
    !errors.namePrefix &&
    !!symbolPrefixWatch &&
    !errors.symbolPrefix &&
    !!assetWatch &&
    !errors.asset

  const handleTokenSelect = (asset: TokenInfo | null) => {
    setValue("asset", (asset ? asset.address : "0x") as `0x${string}`)
  }

  useEffect(() => {
    dispatch(setIsValid({ step: CreateMarketSteps.BASIC, valid: isFormValid }))

    if (isFormValid) {
      dispatch(
        setIsDisabled({
          steps: [CreateMarketSteps.FINANCIAL],
          disabled: !isFormValid,
        }),
      )
    } else {
      const allStepsToDisable = [
        CreateMarketSteps.BRESTRICTIONS,
        CreateMarketSteps.CONFIRM,
        CreateMarketSteps.LRESTRICTIONS,
        CreateMarketSteps.PERIODS,
        CreateMarketSteps.FINANCIAL,
        CreateMarketSteps.MLA,
      ]

      dispatch(setIsDisabled({ steps: allStepsToDisable, disabled: true }))
    }
  }, [isFormValid])

  return (
    <Box sx={FormContainer}>
      <Typography variant="title2" sx={{ marginBottom: "36px" }}>
        Basic Market Setup
      </Typography>

      <Box
        sx={{
          ...SectionGrid,
          gap: "38px 10px",
        }}
      >
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

        <InputLabel
          label={t(
            "createMarket.forms.marketDescription.block.marketTokenName.title",
          )}
          tooltipText={t(
            "createMarket.forms.marketDescription.block.marketTokenName.tooltip",
          )}
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
      </Box>

      <FormFooter
        backOnClick={handleBackClick}
        nextOnClick={handleNextClick}
        disableNext={!isFormValid}
      />
    </Box>
  )
}
