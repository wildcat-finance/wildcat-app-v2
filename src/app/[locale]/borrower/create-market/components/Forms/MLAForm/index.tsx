import { useEffect } from "react"

import {
  Box,
  CircularProgress,
  FormControlLabel,
  RadioGroup,
  Typography,
} from "@mui/material"
import { useTranslation } from "react-i18next"

import { FormFooter } from "@/app/[locale]/borrower/create-market/components/FormFooter"
import { FormContainer } from "@/app/[locale]/borrower/create-market/components/Forms/style"
import { useGetMlaTemplates } from "@/app/[locale]/borrower/hooks/mla/useGetMlaTemplates"
import ExtendedRadio from "@/components/@extended/ExtendedRadio"
import { HorizontalInputLabel } from "@/components/HorisontalInputLabel"
import { useAppDispatch } from "@/store/hooks"
import {
  CreateMarketSteps,
  setCreatingStep,
  setIsDisabled,
  setIsValid,
} from "@/store/slices/createMarketSidebarSlice/createMarketSidebarSlice"

import { MLAFormProps } from "./interface"
import { MLAOption } from "./style"

export const MlaForm = ({ form }: MLAFormProps) => {
  const { t } = useTranslation()

  const { setValue, watch } = form

  const dispatch = useAppDispatch()

  const handleNextClick = () => {
    dispatch(setCreatingStep(CreateMarketSteps.CONFIRM))
  }

  const handleBackClick = () => {
    dispatch(setCreatingStep(CreateMarketSteps.WRAPPER))
  }

  const mlaWatch = watch("mla")

  const handleChangeMla = (event: React.ChangeEvent<HTMLInputElement>) => {
    setValue("mla", event.target.value)
  }

  const { data: templates, isLoading: isLoadingTemplates } =
    useGetMlaTemplates()
  const options = [
    {
      id: "noMLA",
      label: "Don’t Use",
      value: "noMLA",
    },
    ...(templates
      ?.filter((x) => !x.hide)
      .map((template) => ({
        id: template.id.toString(),
        label: template.name,
        value: template.id.toString(),
      })) ?? []),
  ]

  useEffect(() => {
    dispatch(setIsValid({ step: CreateMarketSteps.MLA, valid: !!mlaWatch }))

    if (mlaWatch) {
      dispatch(
        setIsDisabled({
          steps: [CreateMarketSteps.MLA],
          disabled: !mlaWatch,
        }),
      )
    }
  }, [mlaWatch])

  return (
    <Box sx={FormContainer}>
      <Typography variant="title2" sx={{ marginBottom: "36px" }}>
        {t("createNewMarket.mla.title")}
      </Typography>

      <HorizontalInputLabel
        label={t("createNewMarket.mla.mla.label")}
        explainer={t("createNewMarket.mla.mla.explainer")}
      >
        <RadioGroup
          aria-labelledby="mla-label"
          name="mla"
          value={mlaWatch}
          onChange={handleChangeMla}
          sx={{
            width: "50%",
            gap: "6px",
          }}
        >
          {options.map((mla) => (
            <FormControlLabel
              key={mla.id}
              label={mla.label}
              control={
                <ExtendedRadio value={mla.value} onChange={handleChangeMla} />
              }
              sx={MLAOption}
            />
          ))}
          {isLoadingTemplates && (
            <FormControlLabel
              key="loading"
              label="Loading templates..."
              control={
                <ExtendedRadio
                  value="loading"
                  onChange={handleChangeMla}
                  disabled
                />
              }
              sx={MLAOption}
            />
          )}
        </RadioGroup>
      </HorizontalInputLabel>

      <FormFooter
        backOnClick={handleBackClick}
        nextOnClick={handleNextClick}
        disableNext={!mlaWatch || isLoadingTemplates}
      />
    </Box>
  )
}
