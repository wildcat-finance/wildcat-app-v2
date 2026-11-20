import { useRef, useState } from "react"

import { Box, MenuItem, Select, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import ExtendedCheckbox from "@/components/@extended/ExtendedСheckbox"
import { LENDER_TYPES, LenderType, sortLenderTypes } from "@/config/lender-kyc"
import { COLORS } from "@/theme/colors"

import {
  FieldLabelSx,
  LenderTypeMenuItemSx,
  LenderTypeMenuSx,
  LenderTypePlaceholderSx,
  LenderTypeSelectSx,
} from "../style"

const LABEL_ID = "lender-kyc-lender-type"

type LenderTypeSelectProps = {
  value: LenderType[]
  disabled?: boolean
  readOnly?: boolean
  onChange: (value: LenderType[]) => void
}

export const LenderTypeSelect = ({
  value,
  disabled,
  readOnly,
  onChange,
}: LenderTypeSelectProps) => {
  const { t } = useTranslation()
  const anchorRef = useRef<HTMLDivElement>(null)
  const [menuWidth, setMenuWidth] = useState<number>()

  const labelFor = (type: LenderType) =>
    t(`lenderKyc.modal.lenderTypes.${type}`)

  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="text3" component="p" id={LABEL_ID} sx={FieldLabelSx}>
        {t("lenderKyc.modal.fields.lenderType")}
      </Typography>
      <Select<LenderType[]>
        ref={anchorRef}
        labelId={LABEL_ID}
        multiple
        fullWidth
        displayEmpty
        value={value}
        disabled={disabled}
        readOnly={readOnly}
        SelectDisplayProps={{
          "aria-readonly": readOnly || undefined,
          "aria-haspopup": readOnly ? undefined : "listbox",
        }}
        onOpen={() => setMenuWidth(anchorRef.current?.clientWidth)}
        onChange={(event) => {
          const next = event.target.value
          onChange(typeof next === "string" ? [] : sortLenderTypes(next))
        }}
        renderValue={(selected) => {
          if (!selected.length) {
            return (
              <Box component="span" sx={LenderTypePlaceholderSx}>
                {t("lenderKyc.modal.fields.lenderTypePlaceholder")}
              </Box>
            )
          }
          const label = sortLenderTypes(selected).map(labelFor).join(", ")
          return (
            <Box component="span" title={label}>
              {label}
            </Box>
          )
        }}
        MenuProps={LenderTypeMenuSx(menuWidth)}
        sx={LenderTypeSelectSx(!!readOnly)}
      >
        {LENDER_TYPES.map((type) => (
          <MenuItem key={type} value={type} sx={LenderTypeMenuItemSx}>
            <ExtendedCheckbox
              checked={value.includes(type)}
              disabled
              inputProps={{ "aria-hidden": true }}
              sx={{
                padding: 0,
                "& ::before": {
                  transform: "translate(-3px, -3px) scale(0.75)",
                },
              }}
            />
            <Typography variant="text3" color={COLORS.blackRock}>
              {labelFor(type)}
            </Typography>
          </MenuItem>
        ))}
      </Select>
    </Box>
  )
}
