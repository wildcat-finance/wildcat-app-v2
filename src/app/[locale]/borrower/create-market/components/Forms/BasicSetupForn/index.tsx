import { useEffect } from "react"

import { Box, InputAdornment, TextField, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

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
import { UnderlyingAssetSelect } from "../../UnderlyingAssetSelect"

export const BasicSetupForm = ({
  form,
  tokenAsset,
  tokens,
  isLoading,
  setQuery,
  query,
  handleSelect,
  handleChange,
}: BasicSetupFormProps) => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()

  // TODO: return to MLA
  const handleNextClick = () => {
    dispatch(setCreatingStep(CreateMarketSteps.FINANCIAL))
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
        CreateMarketSteps.FINANCIAL,
        CreateMarketSteps.MLA,
      ]

      dispatch(setIsDisabled({ steps: allStepsToDisable, disabled: true }))
    }
  }, [isFormValid, dispatch])

  return (
    <Box sx={FormContainer}>
      <Typography variant="title2" sx={{ marginBottom: "36px" }}>
        {t("createNewMarket.basic.title")}
      </Typography>

      <Box
        sx={{
          ...SectionGrid,
          gap: "19px 10px",
        }}
      >
        <InputLabel label={t("createNewMarket.basic.asset.label")}>
          <UnderlyingAssetSelect
            handleTokenSelect={handleTokenSelect}
            onBlur={tokenSelectorFormProps.onBlur}
            ref={tokenSelectorFormProps.ref}
            error={Boolean(errors.asset)}
            errorText={errors.asset?.message}
            tokens={tokens}
            isLoading={isLoading}
            setQuery={setQuery}
            query={query}
            handleSelect={handleSelect}
            value={assetWatch}
            handleChange={handleChange}
          />
        </InputLabel>
      </Box>

      <Box
        sx={{
          ...SectionGrid,
        }}
      >
        <InputLabel label={t("createNewMarket.basic.tokenName.label")}>
          <TextField
            label={t("createNewMarket.basic.tokenName.placeholder")}
            error={Boolean(errors.namePrefix)}
            helperText={errors.namePrefix?.message}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <TextfieldChip
                    text={
                      tokenAsset?.name ||
                      `${t("createNewMarket.basic.tokenName.chip")}`
                    }
                  />
                </InputAdornment>
              ),
            }}
            {...register("namePrefix")}
          />
        </InputLabel>

        <InputLabel label={t("createNewMarket.basic.tokenSymbol.label")}>
          <TextField
            label={t("createNewMarket.basic.tokenSymbol.placeholder")}
            error={Boolean(errors.symbolPrefix)}
            helperText={errors.symbolPrefix?.message}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <TextfieldChip
                    text={
                      tokenAsset?.symbol ||
                      `${t("createNewMarket.basic.tokenSymbol.chip")}`
                    }
                  />
                </InputAdornment>
              ),
            }}
            {...register("symbolPrefix")}
          />
        </InputLabel>
      </Box>

      <Typography variant="text3" sx={{ marginTop: "18px" }}>
        {`Full Market Token Name: ${t(watch("namePrefix"))} ${t(
          tokenAsset?.name || "",
        )}`}
      </Typography>

      <Typography variant="text3" sx={{ marginTop: "18px" }}>
        {`Full Market Token Ticker: ${t(watch("symbolPrefix"))}${t(
          tokenAsset?.symbol || "",
        )}`}
      </Typography>

      <FormFooter
        backOnClick={handleBackClick}
        nextOnClick={handleNextClick}
        disableNext={!isFormValid}
      />
    </Box>
  )
}
