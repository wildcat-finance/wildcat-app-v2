import { Box, FormControlLabel, RadioGroup, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import ExtendedRadio from "@/components/@extended/ExtendedRadio"
import { LENDER_TYPES, LenderType } from "@/config/lender-kyc"

import { FieldLabelSx, LenderTypeTileSx, LenderTypeTilesSx } from "../style"

type LenderTypeTilesProps = {
  value: LenderType | ""
  disabled?: boolean
  onChange: (value: LenderType | "") => void
}

export const LenderTypeTiles = ({
  value,
  disabled,
  onChange,
}: LenderTypeTilesProps) => {
  const { t } = useTranslation()

  return (
    <Box>
      <Typography
        variant="text3"
        component="p"
        id="lender-kyc-lender-type"
        sx={FieldLabelSx}
      >
        {t("lenderKyc.modal.fields.lenderType")}
      </Typography>
      <RadioGroup
        aria-labelledby="lender-kyc-lender-type"
        value={value}
        onChange={(event) => onChange(event.target.value as LenderType)}
        sx={LenderTypeTilesSx}
      >
        {LENDER_TYPES.map((type) => (
          <FormControlLabel
            key={type}
            value={type}
            disabled={disabled}
            label={t(`lenderKyc.modal.lenderTypes.${type}`)}
            control={
              <ExtendedRadio
                onClick={() => {
                  if (value === type) onChange("")
                }}
              />
            }
            sx={LenderTypeTileSx(value === type)}
          />
        ))}
      </RadioGroup>
    </Box>
  )
}
