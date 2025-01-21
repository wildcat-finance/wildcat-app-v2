import * as React from "react"

import { Box, Button, Skeleton, SvgIcon, Typography } from "@mui/material"
import { UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { EditProfileItemProps } from "@/app/[locale]/borrower/profile/edit/components/EditProfileItem/interface"
import {
  BackButtonContainer,
  ComponentContainer,
  FieldContainer,
  PrevValueContainer,
} from "@/app/[locale]/borrower/profile/edit/components/style"
import Return from "@/assets/icons/return_icon.svg"
import { TooltipButton } from "@/components/TooltipButton"
import { COLORS } from "@/theme/colors"

import { PrivateValidationSchemaType } from "../../hooks/useEditPrivateForm"
import { PublicValidationSchemaType } from "../../hooks/useEditPublicForm"

export const EditProfileItem = ({
  title,
  tooltip,
  form,
  field,
  oldValue,
  newValue,
  children,
  isLoading,
  oldLabel,
  onRestoreValue,
  setValueOptions = { shouldValidate: true },
}: EditProfileItemProps) => {
  const { t } = useTranslation()

  const hasValueChanged = oldValue !== newValue
  const valueWasntEmpty = oldValue && oldValue.length !== 0

  const handleRestoreValue = () => {
    ;(
      form as UseFormReturn<
        PublicValidationSchemaType & PrivateValidationSchemaType
      >
    ).setValue(field, oldValue, setValueOptions)
  }

  return (
    <Box sx={ComponentContainer}>
      <Box sx={{ display: "flex", gap: "6px", alignItems: "center" }}>
        <Typography variant="text3">{title}</Typography>
        {tooltip && <TooltipButton value={tooltip} />}
      </Box>

      <Box sx={FieldContainer}>
        {isLoading ? (
          <Skeleton
            height="52px"
            width="60.8%"
            sx={{ bgcolor: COLORS.athensGrey, borderRadius: "12px" }}
          />
        ) : (
          <Box sx={{ width: "60.8%" }}>{children}</Box>
        )}

        {hasValueChanged && valueWasntEmpty && !isLoading && (
          <Box sx={PrevValueContainer}>
            <Button
              variant="text"
              size="small"
              onClick={onRestoreValue ?? handleRestoreValue}
              sx={BackButtonContainer}
            >
              <SvgIcon
                fontSize="small"
                sx={{
                  "& path": {
                    fill: COLORS.ultramarineBlue,
                  },
                }}
              >
                <Return />
              </SvgIcon>
              {t("borrowerProfile.edit.buttons.back")}
            </Button>
            <Typography variant="text3" color={COLORS.santasGrey}>
              {oldLabel ?? oldValue}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  )
}
