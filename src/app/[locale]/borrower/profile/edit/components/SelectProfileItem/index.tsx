import { ReactNode } from "react"
import * as React from "react"

import { Box, Button, SvgIcon, TextField, Typography } from "@mui/material"
import { UseFormReturn } from "react-hook-form"

import { ProfileValidationSchemaType } from "@/app/[locale]/borrower/profile/edit/hooks/useEditProfileForm"
import Return from "@/assets/icons/return_icon.svg"
import { TooltipButton } from "@/components/TooltipButton"
import { COLORS } from "@/theme/colors"

export type EditProfileItemProps = {
  title: string
  tooltip: string
  form: UseFormReturn<ProfileValidationSchemaType>
  oldValue: string | undefined
  oldLabel: string | undefined
  newValue?: string
  newLabel?: string
  children: ReactNode
}

export const SelectProfileItem = ({
  title,
  tooltip,
  form,
  oldValue,
  oldLabel,
  newValue,
  newLabel,
  children,
}: EditProfileItemProps) => {
  const hasValueChanged = oldValue !== newValue
  const valueWasntEmpty = oldValue && oldValue.length !== 0

  const handleRestoreValue = () => {
    form.setValue("legalNature", oldValue)
  }

  return (
    <Box
      sx={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      <Box sx={{ display: "flex", gap: "6px", alignItems: "center" }}>
        <Typography variant="text3">{title}</Typography>
        <TooltipButton value={tooltip} />
      </Box>

      <Box
        sx={{
          height: "fit-content",
          width: "100%",
          display: "flex",
          gap: "20px",
          alignItems: "center",
        }}
      >
        <Box sx={{ width: "60.8%" }}>{children}</Box>

        {hasValueChanged && valueWasntEmpty && (
          <Box
            sx={{ display: "flex", flexDirection: "column", maxWidth: "35%" }}
          >
            <Button
              variant="text"
              size="small"
              onClick={handleRestoreValue}
              sx={{
                color: COLORS.ultramarineBlue,
                width: "fit-content",
                borderRadius: 0,
                minWidth: "56px",
                padding: 0,
                gap: "4px",

                "&:hover": {
                  boxShadow: "none",
                  backgroundColor: "transparent",
                  color: COLORS.ultramarineBlue,
                },
              }}
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
              Back to
            </Button>
            <Typography variant="text3" color={COLORS.santasGrey}>
              {oldLabel}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  )
}
